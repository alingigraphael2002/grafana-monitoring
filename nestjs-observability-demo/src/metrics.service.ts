import { Injectable } from '@nestjs/common';
import {
  collectDefaultMetrics,
  Counter,
  Gauge,
  Histogram,
  Registry,
} from 'prom-client';

@Injectable()
export class MetricsService {
  readonly registry = new Registry();

  readonly requests = new Counter({
    name: 'api_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code'] as const,
    registers: [this.registry],
  });

  readonly duration = new Histogram({
    name: 'api_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'status_code'] as const,
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [this.registry],
  });

  readonly active = new Gauge({
    name: 'api_active_requests',
    help: 'Number of HTTP requests currently being handled',
    registers: [this.registry],
  });

  readonly requestSize = new Histogram({
    name: 'api_request_size_bytes',
    help: 'HTTP request size in bytes',
    labelNames: ['method', 'route'] as const,
    buckets: [100, 500, 1_000, 5_000, 10_000, 100_000, 1_000_000],
    registers: [this.registry],
  });

  readonly responseSize = new Histogram({
    name: 'api_response_size_bytes',
    help: 'HTTP response size in bytes',
    labelNames: ['method', 'route', 'status_code'] as const,
    buckets: [100, 500, 1_000, 5_000, 10_000, 100_000, 1_000_000],
    registers: [this.registry],
  });

  readonly timeouts = new Counter({
    name: 'api_request_timeouts_total',
    help: 'Total number of simulated request timeouts',
    labelNames: ['route'] as const,
    registers: [this.registry],
  });

  readonly retries = new Counter({
    name: 'api_request_retries_total',
    help: 'Total number of simulated retry attempts',
    labelNames: ['operation'] as const,
    registers: [this.registry],
  });

  readonly rateLimitHits = new Counter({
    name: 'api_rate_limit_hits_total',
    help: 'Total number of rejected rate-limited requests',
    labelNames: ['route'] as const,
    registers: [this.registry],
  });

  constructor() {
    this.registry.setDefaultLabels({
      service: 'nestjs-observability-demo',
      environment: process.env.NODE_ENV ?? 'development',
    });
    collectDefaultMetrics({ register: this.registry, prefix: 'node_' });
  }

  async render(): Promise<string> {
    return this.registry.metrics();
  }
}
