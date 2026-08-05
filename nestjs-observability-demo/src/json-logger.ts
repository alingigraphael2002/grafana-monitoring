import { LoggerService } from '@nestjs/common';
import { LogLevel, writeTelemetryLog } from './telemetry-log';

export class JsonLogger implements LoggerService {
  log(message: unknown, context?: string): void {
    this.write('info', message, context);
  }

  error(message: unknown, trace?: string, context?: string): void {
    this.write('error', message, context, trace);
  }

  warn(message: unknown, context?: string): void {
    this.write('warn', message, context);
  }

  debug(message: unknown, context?: string): void {
    this.write('debug', message, context);
  }

  verbose(message: unknown, context?: string): void {
    this.write('trace', message, context);
  }

  private write(
    level: LogLevel,
    message: unknown,
    context?: string,
    trace?: string,
  ): void {
    writeTelemetryLog(level, 'application_log', {
      context,
      message: this.formatMessage(message),
      ...(trace ? { error_stack: trace } : {}),
    });
  }

  private formatMessage(message: unknown): unknown {
    if (message instanceof Error) {
      return { name: message.name, message: message.message, stack: message.stack };
    }
    return message;
  }
}
