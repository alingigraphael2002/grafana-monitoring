# Local Grafana observability lab

This local-only stack demonstrates metrics, structured logs, and distributed traces for a NestJS API.

## Data flow

- NestJS `/metrics` -> Alloy -> Mimir
- NestJS JSON container logs -> Alloy -> Loki
- NestJS OpenTelemetry traces -> Alloy OTLP -> Tempo
- Grafana reads Mimir, Loki, and Tempo

The PostgreSQL/Citus, Kafka, external API, Redis, file storage, and authentication-provider operations are deterministic simulations. They produce realistic spans, metrics, and logs without requiring those products locally.

## Start the stack

From `C:\grafana-monitoring`:

```powershell
docker compose up -d --build
docker compose ps
```

Endpoints:

- Grafana: <http://localhost:3000> (`admin` / `admin`)
- Demo API: <http://localhost:3001>
- API metrics: <http://localhost:3001/metrics>
- Alloy UI: <http://localhost:12345>
- Loki: <http://localhost:3100/ready>
- Mimir: <http://localhost:9009/ready>
- Tempo: <http://localhost:3200/ready>

## Generate telemetry

Basic traffic:

```powershell
Invoke-RestMethod http://localhost:3001/api/hello
Invoke-RestMethod "http://localhost:3001/api/slow?ms=1200"
```

Complete successful distributed trace:

```powershell
$body = @{
  order_id = [guid]::NewGuid().ToString()
  amount = 149.95
  items = 3
  channel = 'powershell'
} | ConvertTo-Json

Invoke-RestMethod -Method Post `
  -Uri http://localhost:3001/api/checkout `
  -Headers @{ 'x-demo-role' = 'customer' } `
  -ContentType application/json `
  -Body $body
```

Controlled dependency failure:

```powershell
$body = @{
  amount = 79.50
  items = 2
  channel = 'powershell'
  fail_at = 'external_api'
} | ConvertTo-Json

try {
  Invoke-RestMethod -Method Post `
    -Uri http://localhost:3001/api/checkout `
    -Headers @{ 'x-demo-role' = 'customer' } `
    -ContentType application/json `
    -Body $body
} catch {
  $_.Exception.Message
}
```

Valid `fail_at` values are `api_gateway`, `auth_provider`, `authorization`, `application_logic`, `postgresql_citus`, `redis_cache`, `kafka` (or `kafka_publish`), `kafka_consume`, `external_api`, and `file_storage`.

Target one dependency directly:

```powershell
Invoke-RestMethod http://localhost:3001/api/dependencies/postgresql_citus
Invoke-RestMethod "http://localhost:3001/api/dependencies/kafka?operation=publish_event"
Invoke-RestMethod "http://localhost:3001/api/dependencies/kafka?operation=consume_event"
Invoke-RestMethod http://localhost:3001/api/dependencies/redis_cache
```

Add `?fail=true` to any dependency request to emit an error span and failure metrics.

## Postman

Import both files:

- `nestjs-observability-demo/postman/NestJS-Observability-Demo.postman_collection.json`
- `nestjs-observability-demo/postman/Local-NestJS-Demo.postman_environment.json`

Select **Local NestJS Demo**, then run folders **09–11** to populate tracing, dependencies, business metrics, errors, and SLO panels. Folders **01–08** continue to populate the original API Request Metrics.

## Grafana

Provisioned dashboards under **Observability**:

- **API Request Metrics** — request volume, latency, sizes, timeouts, retries, rate limits
- **API Executive & Telemetry Overview** — availability, success rate, 5xx, P95, top failing APIs, dependency health, business telemetry, errors, SLO breaches, structured logs

### Logs

In Explore, select Loki:

```logql
{service_name="nestjs-observability-demo"} | json
```

Errors only:

```logql
{service_name="nestjs-observability-demo"} | json | level="error"
```

Logs contain `trace_id` and `span_id`. Click the derived **TraceID** field to open the corresponding Tempo trace.

### Traces

In Explore, select Tempo and use TraceQL:

```traceql
{ resource.service.name = "nestjs-observability-demo" }
```

The checkout trace includes gateway, authentication, authorisation, application logic, database, cache, Kafka publish/consume, external API, and file-storage spans.

### Metric families

- Existing request metrics: `api_requests_total`, `api_request_duration_seconds`, `api_active_requests`, request/response sizes, timeouts, retries, and rate limits
- Errors: `api_errors_total`
- Dependencies: `dependency_requests_total`, `dependency_request_duration_seconds`, `dependency_available`
- Business: `business_transactions_total`, `business_revenue_total`, `business_items_total`
- SLOs: `api_slo_target`, `api_slo_breaches_total`

Example dependency P95:

```promql
histogram_quantile(
  0.95,
  sum by (le, dependency) (
    rate(dependency_request_duration_seconds_bucket[$__rate_interval])
  )
)
```

Example classified error rate:

```promql
sum by (error_type, dependency) (
  rate(api_errors_total[$__rate_interval])
)
```

## SLO definitions

- Availability target: 99.9%; HTTP 5xx responses are unavailable
- Success-rate target: 99%; HTTP 4xx and 5xx responses are unsuccessful
- P95 latency target: 0.5 seconds
- Throughput: request rate calculated from `api_requests_total`

The demo records an SLO breach event for failed requests and requests slower than 0.5 seconds. Dashboard percentages are calculated from the original request counters.
