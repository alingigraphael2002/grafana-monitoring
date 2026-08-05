import { trace } from '@opentelemetry/api';

export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error';

export function currentTraceContext(): { trace_id?: string; span_id?: string } {
  const spanContext = trace.getActiveSpan()?.spanContext();
  if (!spanContext) return {};

  return {
    trace_id: spanContext.traceId,
    span_id: spanContext.spanId,
  };
}

export function writeTelemetryLog(
  level: LogLevel,
  event: string,
  fields: Record<string, unknown> = {},
): void {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    service: 'nestjs-observability-demo',
    event,
    ...currentTraceContext(),
    ...fields,
  };

  const line = JSON.stringify(entry);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}
