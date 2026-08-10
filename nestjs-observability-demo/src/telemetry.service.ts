import { Injectable } from '@nestjs/common';
import { SpanKind, SpanStatusCode, trace } from '@opentelemetry/api';
import { MetricsService } from './metrics.service';
import { writeTelemetryLog } from './telemetry-log';

export const dependencyNames = [
  'postgresql_citus',
  'kafka',
  'external_api',
  'redis_cache',
  'file_storage',
  'auth_provider',
] as const;

export type DependencyName = (typeof dependencyNames)[number];

const sleep = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

@Injectable()
export class TelemetryService {
  private readonly tracer = trace.getTracer('nestjs-observability-demo');

  constructor(private readonly metrics: MetricsService) {}

  async runInternalStage(
    stage: string,
    operation: string,
    durationMs: number,
    shouldFail = false,
  ): Promise<void> {
    await this.runStage(stage, operation, durationMs, shouldFail);
  }

  async runDependency(
    dependency: DependencyName,
    operation: string,
    durationMs: number,
    shouldFail = false,
  ): Promise<void> {
    await this.runStage(dependency, operation, durationMs, shouldFail, dependency);
  }

  recordBusinessTransaction(input: {
    transaction: string;
    outcome: 'success' | 'failure';
    channel: string;
    amount: number;
    items: number;
    orderId: string;
  }): void {
    const { transaction, outcome, channel, amount, items, orderId } = input;
    this.metrics.businessTransactions.inc({ transaction, outcome, channel });
    this.metrics.businessItems.inc({ transaction, channel }, items);
    if (outcome === 'success') {
      this.metrics.businessRevenue.inc({ currency: 'USD', channel }, amount);
    }

    writeTelemetryLog('info', 'business_transaction', {
      transaction,
      outcome,
      channel,
      amount,
      currency: 'USD',
      items,
      order_id: orderId,
    });
  }

  private async runStage(
    stage: string,
    operation: string,
    durationMs: number,
    shouldFail: boolean,
    dependency?: DependencyName,
  ): Promise<void> {
    await this.tracer.startActiveSpan(
      `${stage}.${operation}`,
      {
        kind: dependency ? SpanKind.CLIENT : SpanKind.INTERNAL,
        attributes: {
          'operation.name': operation,
          'telemetry.stage': stage,
          ...(dependency
            ? {
                'dependency.name': dependency,
                'peer.service': dependency,
              }
            : {}),
        },
      },
      async (span) => {
        const startedAt = process.hrtime.bigint();
        writeTelemetryLog('info', 'operation_started', {
          stage,
          operation,
          dependency,
        });

        try {
          await sleep(durationMs);
          if (shouldFail) throw new Error(`Simulated ${stage} failure`);

          span.setStatus({ code: SpanStatusCode.OK });
          if (dependency) {
            this.metrics.dependencyRequests.inc({ dependency, operation, outcome: 'success' });
            this.metrics.dependencyAvailability.set({ dependency }, 1);
          }

          writeTelemetryLog('info', 'operation_completed', {
            stage,
            operation,
            dependency,
            outcome: 'success',
            duration_ms: durationMs,
          });
        } catch (error) {
          const exception = error instanceof Error ? error : new Error(String(error));
          span.recordException(exception);
          span.setStatus({ code: SpanStatusCode.ERROR, message: exception.message });

          if (dependency) {
            this.metrics.dependencyRequests.inc({ dependency, operation, outcome: 'failure' });
            this.metrics.dependencyAvailability.set({ dependency }, 0);
          }
          writeTelemetryLog('error', 'operation_failed', {
            stage,
            operation,
            dependency,
            outcome: 'failure',
            error_type: dependency ? 'dependency' : 'application',
            error_message: exception.message,
            duration_ms: durationMs,
          });
          throw exception;
        } finally {
          const elapsedSeconds = Number(process.hrtime.bigint() - startedAt) / 1e9;
          if (dependency) {
            this.metrics.dependencyDuration.observe({ dependency, operation }, elapsedSeconds);
          }
          span.setAttribute('operation.duration_ms', Math.round(elapsedSeconds * 1000));
          span.end();
        }
      },
    );
  }
}
