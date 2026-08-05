import { LoggerService } from '@nestjs/common';

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
    level: string,
    message: unknown,
    context?: string,
    trace?: string,
  ): void {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      service: 'nestjs-observability-demo',
      context,
      message: this.formatMessage(message),
      ...(trace ? { trace } : {}),
    };

    const line = JSON.stringify(entry);
    if (level === 'error') {
      console.error(line);
    } else if (level === 'warn') {
      console.warn(line);
    } else {
      console.log(line);
    }
  }

  private formatMessage(message: unknown): unknown {
    if (message instanceof Error) {
      return { name: message.name, message: message.message, stack: message.stack };
    }
    return message;
  }
}
