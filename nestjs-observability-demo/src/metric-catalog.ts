export type TelemetryDatasource = 'mimir' | 'loki' | 'tempo';

export interface MetricCatalogEntry {
  id: string;
  display_name: string;
  metric_name: string;
  family: string;
  source_api: string;
  datasource: TelemetryDatasource;
  origin: string;
  series_family: string;
  labels: string[];
  log_event: string;
  log_fields: string[];
  span_name: string;
  dashboard_tab: string;
  notes: string;
}

export const metricCatalog: MetricCatalogEntry[] = [
  {
    id: 'api-request-count',
    display_name: 'Request count',
    metric_name: 'api_requests_total',
    family: 'api_request_metrics',
    source_api: 'HTTP middleware'
    datasource: 'mimir',
    origin: 'request-observability.middleware.ts',
    series_family: 'api_requests_total',
    labels: ['method', 'route', 'status_code', 'service', 'environment'],
    log_event: 'request_completed',
    log_fields: ['request_id', 'method', 'route', 'status_code', 'duration_ms', 'trace_id'],
    span_name: '.+',
    dashboard_tab: 'API Request Metrics',
    notes: 'Counter of inbound HTTP requests. Underlying records are request_completed logs and Tempo traces for the same request.',
  },
  {
    id: 'api-request-duration',
    display_name: 'Request duration',
    metric_name: 'api_request_duration_seconds',
    family: 'api_request_metrics',
    source_api: 'HTTP middleware'
    datasource: 'mimir',
    origin: 'request-observability.middleware.ts',
    series_family: 'api_request_duration_seconds_bucket|_sum|_count',
    labels: ['method', 'route', 'status_code', 'le', 'service', 'environment'],
    log_event: 'request_completed',
    log_fields: ['duration_ms', 'route', 'status_code', 'trace_id'],
    span_name: '.+',
    dashboard_tab: 'API Request Metrics',
    notes: 'Histogram. Drill into _bucket/_sum/_count series, then logs with duration_ms.',
  },
  {
    id: 'api-response-status',
    display_name: 'Response status',
    metric_name: 'api_requests_total',
    family: 'api_request_metrics',
    source_api: 'HTTP middleware'
    datasource: 'mimir',
    origin: 'request-observability.middleware.ts',
    series_family: 'api_requests_total',
    labels: ['status_code', 'method', 'route', 'service', 'environment'],
    log_event: 'request_completed',
    log_fields: ['status_code', 'outcome', 'route'],
    span_name: '.+',
    dashboard_tab: 'API Request Metrics',
    notes: 'Same counter as request count, grouped by status_code.',
  },
  {
    id: 'api-active-requests',
    display_name: 'Active requests',
    metric_name: 'api_active_requests',
    family: 'api_request_metrics',
    source_api: 'HTTP middleware'
    datasource: 'mimir',
    origin: 'request-observability.middleware.ts',
    series_family: 'api_active_requests',
    labels: ['service', 'environment'],
    log_event: 'request_started',
    log_fields: ['request_id', 'method', 'path'],
    span_name: '.+',
    dashboard_tab: 'API Request Metrics',
    notes: 'Gauge of concurrent requests. request_started logs are the in-flight records.',
  },
  {
    id: 'api-request-size',
    display_name: 'Request size',
    metric_name: 'api_request_size_bytes',
    family: 'api_request_metrics',
    source_api: 'POST /api/echo'
    datasource: 'mimir',
    origin: 'request-observability.middleware.ts',
    series_family: 'api_request_size_bytes_bucket|_sum|_count',
    labels: ['method', 'route', 'le', 'service', 'environment'],
    log_event: 'request_completed',
    log_fields: ['request_bytes', 'route', 'method'],
    span_name: '.+',
    dashboard_tab: 'API Request Metrics',
    notes: 'Histogram of inbound payload size.',
  },
  {
    id: 'api-response-size',
    display_name: 'Response size',
    metric_name: 'api_response_size_bytes',
    family: 'api_request_metrics',
    source_api: 'HTTP middleware'
    datasource: 'mimir',
    origin: 'request-observability.middleware.ts',
    series_family: 'api_response_size_bytes_bucket|_sum|_count',
    labels: ['method', 'route', 'status_code', 'le', 'service', 'environment'],
    log_event: 'request_completed',
    log_fields: ['response_bytes', 'route', 'status_code'],
    span_name: '.+',
    dashboard_tab: 'API Request Metrics',
    notes: 'Histogram of outbound payload size.',
  },
  {
    id: 'api-timeout-count',
    display_name: 'Timeout count',
    metric_name: 'api_request_timeouts_total',
    family: 'api_request_metrics',
    source_api: 'GET /api/timeout',
    datasource: 'mimir',
    origin: 'app.controller.ts timeout()',
    series_family: 'api_request_timeouts_total',
    labels: ['route', 'service', 'environment'],
    log_event: 'request_completed',
    log_fields: ['route', 'status_code', 'trace_id'],
    span_name: '.+',
    dashboard_tab: 'API Request Metrics',
    notes: 'Demo timeout counter. HTTP status 504 also appears on api_requests_total.',
  },
  {
    id: 'api-retry-count',
    display_name: 'Retry count',
    metric_name: 'api_request_retries_total',
    family: 'api_request_metrics',
    source_api: 'GET /api/retry',
    datasource: 'mimir',
    origin: 'app.controller.ts retry()',
    series_family: 'api_request_retries_total',
    labels: ['operation', 'service', 'environment'],
    log_event: 'request_completed',
    log_fields: ['route', 'trace_id'],
    span_name: '.+',
    dashboard_tab: 'API Request Metrics',
    notes: 'Simulated upstream retry attempts on /api/retry.',
  },
  {
    id: 'api-rate-limit-count',
    display_name: 'Rate-limit count',
    metric_name: 'api_rate_limit_hits_total',
    family: 'api_request_metrics',
    source_api: 'GET /api/rate-limit',
    datasource: 'mimir',
    origin: 'app.controller.ts rateLimit()',
    series_family: 'api_rate_limit_hits_total',
    labels: ['route', 'service', 'environment'],
    log_event: 'request_completed',
    log_fields: ['route', 'status_code'],
    span_name: '.+',
    dashboard_tab: 'API Request Metrics',
    notes: 'Incremented when the demo limiter returns 429.',
  },
  {
    id: 'api-errors',
    display_name: 'Classified errors',
    metric_name: 'api_errors_total',
    family: 'error_telemetry',
    source_api: 'HTTP errors and checkout'
    datasource: 'mimir',
    origin: 'request-observability.middleware.ts and telemetry.service.ts',
    series_family: 'api_errors_total',
    labels: ['error_type', 'operation', 'dependency', 'status_code', 'service', 'environment'],
    log_event: 'operation_failed',
    log_fields: ['error_type', 'operation', 'dependency', 'status_code', 'trace_id'],
    span_name: '.+',
    dashboard_tab: 'Error Telemetry',
    notes: 'Error class plus failed operation logs. Use traces to see the failing span.',
  },
  {
    id: 'dependency-requests',
    display_name: 'Dependency request count',
    metric_name: 'dependency_requests_total',
    family: 'dependency_metrics',
    source_api: 'GET /api/dependencies or POST /api/checkout'
    datasource: 'mimir',
    origin: 'telemetry.service.ts runStage()',
    series_family: 'dependency_requests_total',
    labels: ['dependency', 'operation', 'outcome', 'service', 'environment'],
    log_event: 'operation_completed',
    log_fields: ['stage', 'operation', 'dependency', 'outcome', 'duration_ms', 'trace_id'],
    span_name: '.+',
    dashboard_tab: 'Dependency Metrics',
    notes: 'Simulated dependency ops. series_family is the Prometheus series, not a SQL table.',
  },
  {
    id: 'dependency-duration',
    display_name: 'Dependency duration',
    metric_name: 'dependency_request_duration_seconds',
    family: 'dependency_metrics',
    source_api: 'GET /api/dependencies or POST /api/checkout'
    datasource: 'mimir',
    origin: 'telemetry.service.ts runStage()',
    series_family: 'dependency_request_duration_seconds_bucket|_sum|_count',
    labels: ['dependency', 'operation', 'le', 'service', 'environment'],
    log_event: 'operation_completed',
    log_fields: ['duration_ms', 'dependency', 'operation'],
    span_name: '.+',
    dashboard_tab: 'Dependency Metrics',
    notes: 'Histogram of simulated dependency latency.',
  },
  {
    id: 'dependency-available',
    display_name: 'Dependency availability',
    metric_name: 'dependency_available',
    family: 'dependency_metrics',
    source_api: 'GET /api/dependencies or POST /api/checkout'
    datasource: 'mimir',
    origin: 'telemetry.service.ts runStage()',
    series_family: 'dependency_available',
    labels: ['dependency', 'service', 'environment'],
    log_event: 'operation_failed',
    log_fields: ['dependency', 'outcome'],
    span_name: '.+',
    dashboard_tab: 'Dependency Metrics',
    notes: 'Gauge 1=available after last success, 0 after last failure.',
  },
  {
    id: 'business-transactions',
    display_name: 'Business transactions',
    metric_name: 'business_transactions_total',
    family: 'business_telemetry',
    source_api: 'POST /api/checkout',
    datasource: 'mimir',
    origin: 'telemetry.service.ts recordBusinessTransaction()',
    series_family: 'business_transactions_total',
    labels: ['transaction', 'outcome', 'channel', 'service', 'environment'],
    log_event: 'business_transaction',
    log_fields: ['order_id', 'transaction', 'outcome', 'channel', 'amount', 'items', 'trace_id'],
    span_name: 'application_logic.validate_order',
    dashboard_tab: 'Business Telemetry',
    notes: 'Checkout records. order_id in logs is the underlying business record key.',
  },
  {
    id: 'business-revenue',
    display_name: 'Business revenue',
    metric_name: 'business_revenue_total',
    family: 'business_telemetry',
    source_api: 'POST /api/checkout'
    datasource: 'mimir',
    origin: 'telemetry.service.ts recordBusinessTransaction()',
    series_family: 'business_revenue_total',
    labels: ['currency', 'channel', 'service', 'environment'],
    log_event: 'business_transaction',
    log_fields: ['amount', 'currency', 'channel', 'order_id'],
    span_name: 'external_api.payment_request',
    dashboard_tab: 'Business Telemetry',
    notes: 'Successful checkout value in USD.',
  },
  {
    id: 'business-items',
    display_name: 'Business items',
    metric_name: 'business_items_total',
    family: 'business_telemetry',
    source_api: 'POST /api/checkout',
    datasource: 'mimir',
    origin: 'telemetry.service.ts recordBusinessTransaction()',
    series_family: 'business_items_total',
    labels: ['transaction', 'channel', 'service', 'environment'],
    log_event: 'business_transaction',
    log_fields: ['items', 'transaction', 'channel', 'order_id'],
    span_name: 'application_logic.validate_order',
    dashboard_tab: 'Business Telemetry',
    notes: 'Item counts processed per checkout.',
  },
  {
    id: 'slo-target',
    display_name: 'SLO target',
    metric_name: 'api_slo_target',
    family: 'api_slo',
    source_api: 'process startup'
    datasource: 'mimir',
    origin: 'metrics.service.ts constructor',
    series_family: 'api_slo_target',
    labels: ['indicator', 'service', 'environment'],
    log_event: 'request_completed',
    log_fields: ['route', 'status_code', 'duration_ms'],
    span_name: '.+',
    dashboard_tab: 'API Availability and SLO',
    notes: 'Static targets: availability 99.9%, success 99%, P95 0.5s.',
  },
  {
    id: 'sli-violations',
    display_name: 'SLI violations',
    metric_name: 'api_sli_violations_total',
    family: 'api_slo',
    source_api: 'HTTP middleware'
    datasource: 'mimir',
    origin: 'request-observability.middleware.ts',
    series_family: 'api_sli_violations_total',
    labels: ['indicator', 'route', 'service', 'environment'],
    log_event: 'request_completed',
    log_fields: ['route', 'status_code', 'duration_ms', 'outcome'],
    span_name: '.+',
    dashboard_tab: 'API Availability and SLO',
    notes: 'Per-request SLI breach events used by availability/success/latency panels.',
  },
  {
    id: 'slo-availability',
    display_name: 'Availability',
    metric_name: 'api_requests_total',
    family: 'api_slo',
    source_api: 'derived from api_requests_total'
    datasource: 'mimir',
    origin: 'grafana SLO dashboard + HTTP middleware',
    series_family: 'api_requests_total',
    labels: ['status_code', 'route', 'service', 'environment'],
    log_event: 'request_completed',
    log_fields: ['status_code', 'outcome', 'route'],
    span_name: '.+',
    dashboard_tab: 'API Availability and SLO',
    notes: 'Not a separate counter. Availability is computed from request status codes.',
  },
  {
    id: 'span-api-gateway',
    display_name: 'API gateway span',
    metric_name: 'dependency_requests_total',
    family: 'distributed_tracing',
    source_api: 'POST /api/checkout',
    datasource: 'tempo',
    origin: 'telemetry.service.ts runInternalStage(api_gateway)',
    series_family: 'tempo span api_gateway.route_request',
    labels: ['telemetry.stage', 'operation.name'],
    log_event: 'operation_started',
    log_fields: ['stage', 'operation', 'trace_id', 'span_id'],
    span_name: 'api_gateway.route_request',
    dashboard_tab: 'Distributed Tracing',
    notes: 'Internal span. Correlate via TraceID on operation_* logs.',
  },
  {
    id: 'span-auth',
    display_name: 'Authentication span',
    metric_name: 'dependency_requests_total',
    family: 'distributed_tracing',
    source_api: 'POST /api/checkout',
    datasource: 'tempo',
    origin: 'telemetry.service.ts runDependency(auth_provider)',
    series_family: 'tempo span auth_provider.validate_token',
    labels: ['dependency.name', 'operation.name'],
    log_event: 'operation_completed',
    log_fields: ['stage', 'dependency', 'trace_id'],
    span_name: 'auth_provider.validate_token',
    dashboard_tab: 'Distributed Tracing',
    notes: 'Simulated auth provider hop.',
  },
  {
    id: 'span-authz',
    display_name: 'Authorisation span',
    metric_name: 'api_errors_total',
    family: 'distributed_tracing',
    source_api: 'POST /api/checkout'
    datasource: 'tempo',
    origin: 'telemetry.service.ts runInternalStage(authorization)',
    series_family: 'tempo span authorization.authorize_checkout',
    labels: ['telemetry.stage', 'operation.name'],
    log_event: 'operation_failed',
    log_fields: ['stage', 'operation', 'trace_id'],
    span_name: 'authorization.authorize_checkout',
    dashboard_tab: 'Distributed Tracing',
    notes: 'Internal authorisation span; 403 when denied.',
  },
  {
    id: 'span-app-logic',
    display_name: 'Application logic span',
    metric_name: 'business_transactions_total',
    family: 'distributed_tracing',
    source_api: 'POST /api/checkout',
    datasource: 'tempo',
    origin: 'telemetry.service.ts runInternalStage(application_logic)',
    series_family: 'tempo span application_logic.validate_order',
    labels: ['telemetry.stage', 'operation.name'],
    log_event: 'operation_completed',
    log_fields: ['stage', 'operation', 'trace_id'],
    span_name: 'application_logic.validate_order',
    dashboard_tab: 'Distributed Tracing',
    notes: 'Order validation span before dependency hops.',
  },
  {
    id: 'span-db',
    display_name: 'Database query span',
    metric_name: 'dependency_requests_total',
    family: 'distributed_tracing',
    source_api: 'POST /api/checkout'
    datasource: 'tempo',
    origin: 'telemetry.service.ts runDependency(postgresql_citus)',
    series_family: 'simulated postgresql_citus',
    labels: ['dependency', 'operation'],
    log_event: 'operation_completed',
    log_fields: ['stage', 'operation', 'dependency', 'trace_id'],
    span_name: 'postgresql_citus.database_query',
    dashboard_tab: 'Distributed Tracing',
    notes: 'Lab does not query a real database. Lineage stops at the simulated span and metrics.',
  },
  {
    id: 'span-kafka',
    display_name: 'Kafka publish or consume span',
    metric_name: 'dependency_requests_total',
    family: 'distributed_tracing',
    source_api: 'POST /api/checkout'
    datasource: 'tempo',
    origin: 'telemetry.service.ts runDependency(kafka)',
    series_family: 'simulated kafka topic',
    labels: ['dependency', 'operation'],
    log_event: 'operation_completed',
    log_fields: ['stage', 'operation', 'dependency', 'trace_id'],
    span_name: 'kafka.publish_event',
    dashboard_tab: 'Distributed Tracing',
    notes: 'Publish and consume are separate operations on the kafka dependency.',
  },
  {
    id: 'span-external-api',
    display_name: 'External API call span',
    metric_name: 'dependency_requests_total',
    family: 'distributed_tracing',
    source_api: 'POST /api/checkout'
    datasource: 'tempo',
    origin: 'telemetry.service.ts runDependency(external_api)',
    series_family: 'simulated external HTTP',
    labels: ['dependency', 'operation'],
    log_event: 'operation_completed',
    log_fields: ['stage', 'operation', 'dependency', 'trace_id'],
    span_name: 'external_api.payment_request',
    dashboard_tab: 'Distributed Tracing',
    notes: 'Payment-shaped simulated hop.',
  },
  {
    id: 'span-cache',
    display_name: 'Cache operation span',
    metric_name: 'dependency_requests_total',
    family: 'distributed_tracing',
    source_api: 'POST /api/checkout'
    datasource: 'tempo',
    origin: 'telemetry.service.ts runDependency(redis_cache)',
    series_family: 'simulated redis_cache',
    labels: ['dependency', 'operation'],
    log_event: 'operation_completed',
    log_fields: ['stage', 'operation', 'dependency', 'trace_id'],
    span_name: 'redis_cache.cache_operation',
    dashboard_tab: 'Distributed Tracing',
    notes: 'Simulated cache get/set.',
  },
  {
    id: 'span-file',
    display_name: 'File storage span',
    metric_name: 'dependency_requests_total',
    family: 'distributed_tracing',
    source_api: 'POST /api/checkout'
    datasource: 'tempo',
    origin: 'telemetry.service.ts runDependency(file_storage)',
    series_family: 'simulated file_storage',
    labels: ['dependency', 'operation'],
    log_event: 'operation_completed',
    log_fields: ['stage', 'operation', 'dependency', 'trace_id'],
    span_name: 'file_storage.store_receipt',
    dashboard_tab: 'Distributed Tracing',
    notes: 'Simulated receipt upload.',
  },
  {
    id: 'structured-logs',
    display_name: 'Structured application logs',
    metric_name: 'api_requests_total',
    family: 'structured_logs',
    source_api: 'all instrumented endpoints'
    datasource: 'loki',
    origin: 'telemetry-log.ts writeTelemetryLog()',
    series_family: 'loki stream service_name=nestjs-observability-demo',
    labels: ['service_name', 'level', 'event'],
    log_event: '.+',
    log_fields: ['timestamp', 'level', 'service', 'event', 'trace_id', 'span_id'],
    span_name: '.+',
    dashboard_tab: 'Structured Application Logs',
    notes: 'One JSON object per line. Click TraceID to open Tempo. These are the underlying records for most metrics.',
  },
];

export interface MetricCatalogFilters {
  q?: string;
  metric?: string;
  family?: string;
  datasource?: string;
  source_api?: string;
  display?: string;
}

export function searchMetricCatalog(
  filters: MetricCatalogFilters = {},
): MetricCatalogEntry[] {
  const q = filters.q?.trim().toLowerCase();
  const metric = filters.metric?.trim();
  const family = filters.family?.trim();
  const datasource = filters.datasource?.trim();
  const sourceApi = filters.source_api?.trim().toLowerCase();
  const display = filters.display?.trim().toLowerCase();

  return metricCatalog.filter((entry) => {
    if (metric && entry.metric_name !== metric) return false;
    if (family && entry.family !== family) return false;
    if (datasource && entry.datasource !== datasource) return false;
    if (display && !entry.display_name.toLowerCase().includes(display)) return false;
    if (sourceApi && !entry.source_api.toLowerCase().includes(sourceApi)) return false;
    if (q) {
      const haystack = [
        entry.id,
        entry.display_name,
        entry.metric_name,
        entry.family,
        entry.source_api,
        entry.datasource,
        entry.origin,
        entry.series_family,
        entry.labels.join(' '),
        entry.log_event,
        entry.log_fields.join(' '),
        entry.span_name,
        entry.dashboard_tab,
        entry.notes,
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

export function lineageLabelSet(entry: MetricCatalogEntry): string {
  return entry.labels.join(',');
}
