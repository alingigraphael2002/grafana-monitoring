import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { MetricsService } from './metrics.service';

@Injectable()
export class RequestObservabilityMiddleware implements NestMiddleware {
  constructor(private readonly metrics: MetricsService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    const startedAt = process.hrtime.bigint();
    const requestId = String(req.headers['x-request-id'] ?? crypto.randomUUID());
    res.setHeader('x-request-id', requestId);
    this.metrics.active.inc();

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      service: 'nestjs-observability-demo',
      event: 'request_started',
      request_id: requestId,
      method: req.method,
      path: req.path,
    }));

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

      console.log(JSON.stringify({
        timestamp: new Date().toISOString(),
        level: res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info',
        service: 'nestjs-observability-demo',
        event: 'request_completed',
        request_id: requestId,
        method: req.method,
        route,
        status_code: res.statusCode,
        duration_ms: Math.round(elapsedSeconds * 1000),
        request_bytes: requestBytes,
        response_bytes: responseBytes,
      }));
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
}
