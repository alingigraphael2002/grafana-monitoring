# NestJS observability demo

Demo NestJS API that emits Prometheus metrics, structured JSON logs, and OpenTelemetry traces for the local Grafana lab (Mimir, Loki, Tempo via Alloy).

Dependencies such as PostgreSQL/Citus, Kafka, Redis, external APIs, file storage, and the auth provider are **simulated** so you can exercise spans and metrics without running those systems.

## Requirements

- Node.js 22 (Node.js 20 also works)
- npm or pnpm

## Run locally

```powershell
npm install
npm run start:dev
```

Open <http://localhost:3000>. Metrics: <http://localhost:3000/metrics>.

For the full stack (Grafana + Loki + Mimir + Tempo + Alloy), use the root `docker compose up -d --build`. The API is then on <http://localhost:3001>.

Set `OTEL_EXPORTER_OTLP_ENDPOINT` (default `http://alloy:4318`) when exporting traces.

## Endpoints

| Path | Purpose |
|------|---------|
| `GET /health` | Liveness |
| `GET /api/hello` | Successful request |
| `GET /api/error` | Intentional 500 |
| `GET /api/slow?ms=` | Latency / SLO breach |
| `GET /api/timeout` | Simulated 504 |
| `GET /api/retry` | Retry counter |
| `GET /api/rate-limit` | Rate-limit hits |
| `POST /api/echo` | Payload size metrics |
| `GET /api/dependencies/:dependency` | Single dependency metrics/span |
| `POST /api/checkout` | Full distributed trace + business metrics |
| `GET /metrics` | Prometheus scrape target |

Simulated dependencies: `postgresql_citus`, `kafka`, `external_api`, `redis_cache`, `file_storage`, `auth_provider`.

Kafka supports `?operation=publish_event` or `?operation=consume_event`. Add `?fail=true` to force a dependency failure.

Checkout `fail_at` values: `api_gateway`, `auth_provider`, `authorization`, `application_logic`, `postgresql_citus`, `redis_cache`, `kafka` / `kafka_publish`, `kafka_consume`, `external_api`, `file_storage`. Send `x-demo-role: denied` for a 403.

## Generate test traffic

```powershell
Invoke-RestMethod http://localhost:3000/api/hello
Invoke-RestMethod "http://localhost:3000/api/slow?ms=1500"
Invoke-RestMethod http://localhost:3000/api/retry
Invoke-RestMethod http://localhost:3000/api/timeout
Invoke-RestMethod http://localhost:3000/api/error
1..7 | ForEach-Object { try { Invoke-RestMethod http://localhost:3000/api/rate-limit } catch {} }
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/echo -ContentType application/json -Body '{"message":"hello Grafana"}'
Invoke-RestMethod http://localhost:3000/api/dependencies/kafka?operation=consume_event

$body = @{ order_id = [guid]::NewGuid().ToString(); amount = 149.95; items = 3; channel = 'local' } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/checkout -Headers @{ 'x-demo-role' = 'customer' } -ContentType application/json -Body $body
```

## Postman

Import:

- `postman/NestJS-Observability-Demo.postman_collection.json`
- `postman/Local-NestJS-Demo.postman_environment.json`

Folders **01–08** feed API Request Metrics. Folders **09–11** cover distributed tracing, dependency metrics, business/error/SLO telemetry.

## Metric families

- **API request metrics:** `api_requests_total`, `api_request_duration_seconds`, `api_active_requests`, sizes, timeouts, retries, rate limits
- **Errors:** `api_errors_total`
- **Dependencies:** `dependency_requests_total`, `dependency_request_duration_seconds`, `dependency_available`
- **Business:** `business_transactions_total`, `business_revenue_total`, `business_items_total`
- **SLOs:** `api_slo_target`, `api_slo_breaches_total`

## Structured logs

Logs are one JSON object per line (`timestamp`, `level`, `service`, `event`, plus `trace_id` / `span_id` when a span is active).

```logql
{service_name="nestjs-observability-demo"} | json
```

## Useful Mimir queries

```promql
sum(rate(api_requests_total[5m]))
```

```promql
histogram_quantile(0.95, sum by (le) (rate(api_request_duration_seconds_bucket[5m])))
```

```promql
sum by (dependency, operation, outcome) (rate(dependency_requests_total[5m]))
```
