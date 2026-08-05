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

  readonly errors = new Counter({
    name: 'api_errors_total',
    help: 'Classified API and dependency errors',
    labelNames: ['error_type', 'operation', 'dependency', 'status_code'] as const,
    registers: [this.registry],
  });

  readonly dependencyRequests = new Counter({
    name: 'dependency_requests_total',
    help: 'Dependency operations by outcome',
    labelNames: ['dependency', 'operation', 'outcome'] as const,
    registers: [this.registry],
  });

  readonly dependencyDuration = new Histogram({
    name: 'dependency_request_duration_seconds',
    help: 'Dependency operation duration in seconds',
    labelNames: ['dependency', 'operation'] as const,
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    registers: [this.registry],
  });

  readonly dependencyAvailability = new Gauge({
    name: 'dependency_available',
    help: 'Most recent dependency availability result, where 1 is available',
    labelNames: ['dependency'] as const,
    registers: [this.registry],
  });

  readonly businessTransactions = new Counter({
    name: 'business_transactions_total',
    help: 'Business transactions by outcome and channel',
    labelNames: ['transaction', 'outcome', 'channel'] as const,
    registers: [this.registry],
  });

  readonly businessRevenue = new Counter({
    name: 'business_revenue_total',
    help: 'Successful business transaction value',
    labelNames: ['currency', 'channel'] as const,
    registers: [this.registry],
  });

  readonly businessItems = new Counter({
    name: 'business_items_total',
    help: 'Items processed by business transaction and channel',
    labelNames: ['transaction', 'channel'] as const,
    registers: [this.registry],
  });

  readonly sloBreaches = new Counter({
    name: 'api_slo_breaches_total',
    help: 'API SLO breaches by indicator and route',
    labelNames: ['indicator', 'route'] as const,
    registers: [this.registry],
  });

  readonly sloTarget = new Gauge({
    name: 'api_slo_target',
    help: 'Configured SLO targets represented as ratios or seconds',
    labelNames: ['indicator'] as const,
    registers: [this.registry],
  });

  constructor() {
    this.registry.setDefaultLabels({
      service: 'nestjs-observability-demo',
      environment: process.env.NODE_ENV ?? 'development',
    });
    collectDefaultMetrics({ register: this.registry, prefix: 'node_' });

    this.sloTarget.set({ indicator: 'availability' }, 0.999);
    this.sloTarget.set({ indicator: 'success_rate' }, 0.99);
    this.sloTarget.set({ indicator: 'p95_latency_seconds' }, 0.5);
  }

  async render(): Promise<string> {
    return this.registry.metrics();
  }
}
