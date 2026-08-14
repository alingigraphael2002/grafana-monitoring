# Local Grafana observability lab

This local-only stack demonstrates metrics, structured logs, and distributed traces for a NestJS API.

## Data flow

- NestJS `/metrics` -> Alloy -> Mimir
- NestJS JSON container logs -> Alloy -> Loki
- NestJS OpenTelemetry traces -> Alloy OTLP -> Tempo
- Grafana reads Mimir, Loki, and Tempo

The PostgreSQL/Citus, Kafka, external API, Redis, file storage, and authentication-provider operations are deterministic simulations. They produce realistic spans, metrics, and logs without requiring those products locally. They validate observability structure and trace correlation, but they do not validate real dependency connectivity or cross-service context propagation.

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

Select **Local NestJS Demo**, then run folders **09–11** to populate tracing, dependencies, business metrics, errors, and SLO panels. Folders **01–08** continue to populate the original API Request Metrics. Folder **12** searches the metric lineage catalog.

## Grafana

Dashboards are **auto-provisioned** from:

| Purpose | Path |
|---------|------|
| Datasources (Mimir / Loki / Tempo) | `grafana/provisioning/datasources/datasources.yml` |
| Dashboard loader | `grafana/provisioning/dashboards/dashboards.yml` |
| Tab dashboards + PromQL/LogQL | `grafana/provisioning/dashboards/json/*.json` |

Open any dashboard under **Observability**. The top link bar is the **tab navigation**:

1. **API Request Metrics** — request count, duration, status, active, size, timeouts, retries, rate limits  
2. **Error Telemetry** — classified errors and failure logs  
3. **Distributed Tracing** — gateway, auth/authorisation, app logic, DB, Kafka, external API, cache, file storage  
4. **Dependency Metrics** — PostgreSQL/Citus, Kafka, External APIs, Redis, file storage, auth provider  
5. **Business Telemetry** — transactions, revenue, items  
6. **API Availability and SLO** — availability, success rate, latency, error rate, throughput  
7. **Structured Application Logs** — JSON application events  
8. **API Executive Overview** — availability, volume, success rate, 5xx, P95, top failing APIs, services breaching SLOs
9. **Metric Discovery and Lineage** — search catalog, filter metadata, drill into series/logs/traces

KPI panels include a **Lineage** link that opens this tab with the metric pre-selected.

Search the catalog from the API:

```powershell
Invoke-RestMethod "http://localhost:3001/api/observability/catalog?q=timeout"
```

After editing JSON, wait ~10s or run `docker compose restart grafana`.

Regenerate all tab dashboards:

```powershell
powershell -File grafana/provisioning/dashboards/generate-tab-dashboards.ps1
```

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
- SLOs: `api_slo_target`, `api_sli_violations_total`
- Lineage catalog: `metric_lineage_info` (and `GET /api/observability/catalog`)

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

The demo records request-level SLI violation events for failed requests and requests slower than 0.5 seconds. The executive dashboard evaluates rolling five-minute availability, success-rate, and P95-latency SLO breaches by service. `/metrics` and `/health` are excluded from API request metrics so monitoring traffic does not distort these calculations.

## Local durability and scope

Grafana, Loki, Mimir, and Tempo use named Docker volumes, so their local data survives container recreation. The API and Grafana services expose Compose health checks.

Timeout, retry, and rate-limit counters are explicit demo instrumentation on their corresponding endpoints. Real applications should increment those counters in shared HTTP clients, retry policies, and rate-limit middleware. The dependency spans in this lab are simulations; replace them with instrumented client libraries when connecting real infrastructure.
