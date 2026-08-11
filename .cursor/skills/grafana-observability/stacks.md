# Stack libraries (metrics / logs / traces)

Use these defaults when instrumenting a **real** service. Keep metric names and
JSON log fields aligned with `SKILL.md` so shared Grafana dashboards work.

OTEL is installed **per service** (packages or language agent). Alloy remains the
shared scraper/collector — do not build a custom agent.

## NestJS / Node ✅ (lab reference)

| Pillar | Library / pattern |
|--------|-------------------|
| Metrics | `prom-client` → `GET /metrics` |
| Logs | Custom JSON logger to stdout (`timestamp`, `level`, `service`, `event`, `trace_id`) |
| Traces | `@opentelemetry/sdk-node`, `auto-instrumentations-node`, `exporter-trace-otlp-http` |

Load OTEL **before** app bootstrap (see `nestjs-observability-demo/src/instrumentation.ts`).
Env: `OTEL_SERVICE_NAME`, `OTEL_RESOURCE_ATTRIBUTES`, `OTEL_EXPORTER_OTLP_ENDPOINT`.

## Python ⌛

| Pillar | Library / pattern |
|--------|-------------------|
| Metrics | `prometheus-client` → `/metrics` |
| Logs | `structlog` or `python-json-logger` → one JSON line per log to stdout |
| Traces | `opentelemetry-sdk` + OTLP HTTP/gRPC exporter + relevant instrumentations |

Prefer attaching `trace_id` / `span_id` from the active OTEL context into each log line.

## .NET ⌛

| Pillar | Library / pattern |
|--------|-------------------|
| Metrics | `prometheus-net.AspNetCore` → `/metrics` (or OpenTelemetry metrics if the platform standardizes on OTLP metrics) |
| Logs | Serilog (or built-in) with JSON formatter to console |
| Traces | OpenTelemetry .NET NuGet packages and/or .NET automatic instrumentation |

Export traces via OTLP to Alloy. Include service name and `deployment.environment`.

## Java Spring Boot ⌛

| Pillar | Library / pattern |
|--------|-------------------|
| Metrics | Micrometer → Prometheus registry → usually `/actuator/prometheus` |
| Logs | Logback/Log4j2 JSON encoder to stdout |
| Traces | OpenTelemetry Java agent JAR and/or Micrometer Tracing + OTLP exporter |

Teach Alloy the real metrics path (`/actuator/prometheus` vs `/metrics`).

## Alloy checklist (any new service)

When onboarding a service (lab or company collector config):

1. **Metrics scrape** — host, port, `metrics_path`, job label, scrape interval.
2. **Logs** — Docker/Kubernetes discovery + stable `service_name` label.
3. **OTLP** — app points at Alloy `4317` (gRPC) or `4318` (HTTP); Alloy forwards to Tempo.

No per-language custom agent.
