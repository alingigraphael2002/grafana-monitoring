import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { MetricsService } from './metrics.service';
import { writeTelemetryLog } from './telemetry-log';

@Injectable()
export class RequestObservabilityMiddleware implements NestMiddleware {
  constructor(private readonly metrics: MetricsService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    if (this.isMonitoringEndpoint(req)) {
      next();
      return;
    }

    const startedAt = process.hrtime.bigint();
    const requestId = String(req.headers['x-request-id'] ?? crypto.randomUUID());
    res.setHeader('x-request-id', requestId);
    this.metrics.active.inc();

    writeTelemetryLog('info', 'request_started', {
      request_id: requestId,
      method: req.method,
      path: req.originalUrl || req.url,
    });

    res.on('finish', () => {
      const elapsedSeconds = Number(process.hrtime.bigint() - startedAt) / 1e9;
      const route = this.normalizedRoute(req);
      const statusCode = String(res.statusCode);
      const requestBytes = Number(req.headers['content-length'] ?? 0);
      const responseBytes = Number(res.getHeader('content-length') ?? 0);

      this.metrics.active.dec();
      this.metrics.requests.inc({ method: req.method, route, status_code: statusCode });
      this.metrics.duration.observe(
        { method: req.method, route, status_code: statusCode },
        elapsedSeconds,
      );
      this.metrics.requestSize.observe({ method: req.method, route }, requestBytes);
      this.metrics.responseSize.observe(
        { method: req.method, route, status_code: statusCode },
        responseBytes,
      );

      if (res.statusCode >= 400) {
        this.metrics.errors.inc({
          error_type: this.errorType(res.statusCode),
          operation: route,
          dependency: 'none',
          status_code: statusCode,
        });
        this.metrics.sliViolations.inc({ indicator: 'success_rate', route });
      }
      if (res.statusCode >= 500) {
        this.metrics.sliViolations.inc({ indicator: 'availability', route });
      }
      if (elapsedSeconds > 0.5) {
        this.metrics.sliViolations.inc({ indicator: 'latency_seconds', route });
      }

      writeTelemetryLog(
        res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
        'request_completed',
        {
          request_id: requestId,
          method: req.method,
          route,
          status_code: res.statusCode,
          outcome: res.statusCode < 400 ? 'success' : 'failure',
          duration_ms: Math.round(elapsedSeconds * 1000),
          request_bytes: requestBytes,
          response_bytes: responseBytes,
        },
      );
    });

    next();
  }

  private normalizedRoute(req: Request): string {
    const routePath = req.route?.path as string | undefined;
    if (routePath) return routePath;

    return req.path
      .replace(/\/[0-9]+(?=\/|$)/g, '/:id')
      .replace(/\/[0-9a-f]{8}-[0-9a-f-]{27,}(?=\/|$)/gi, '/:id');
  }

  private isMonitoringEndpoint(req: Request): boolean {
    const pathname = (req.originalUrl || req.url || req.path).split('?')[0];
    return pathname === '/metrics' || pathname === '/health';
  }

  private errorType(statusCode: number): string {
    if (statusCode === 401) return 'authentication';
    if (statusCode === 403) return 'authorization';
    if (statusCode === 429) return 'rate_limit';
    if (statusCode === 504) return 'timeout';
    if (statusCode >= 500) return 'server';
    return 'client';
  }
}
