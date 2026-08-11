---
name: grafana-observability
description: >-
  Wire and verify Grafana observability (Prometheus metrics, JSON logs, OTEL
  traces) for NestJS, Python, .NET, and Java Spring Boot across local,
  development, staging, and production. Use when instrumenting real backends,
  adding /metrics, structured logs, OpenTelemetry/OTLP, Alloy scrape/collector
  config, Mimir/Loki/Tempo, SLO dashboards, or when the user mentions Grafana,
  Alloy, observability, or multi-stack logging.
---

# Grafana observability (multi-stack)

Playbook for adding or verifying observability on **real** backends — NestJS,
Python, .NET, Spring Boot — then checking local → development → staging →
production. The NestJS demo in this lab is a **reference**, not a requirement
to mock every stack.

## When this skill applies

- Instrumenting a company service (any supported stack) for Grafana
- Extending or debugging the `grafana-monitoring` lab
- Alloy / Mimir / Loki / Tempo wiring, dashboards, or env checks
- User says: Grafana, Alloy, OTEL, `/metrics`, structured logs, SLO, traces,
  observability, NestJS, Python, .NET, Spring Boot, or **dev / staging / prod**

## Core concepts (do not confuse)

| Term | Meaning |
|------|---------|
| **Instrument** | Add libraries/code so the **app emits** logs, metrics, and/or traces |
| **OpenTelemetry (OTEL)** | In-app SDK/agent that **creates and pushes** traces (OTLP). Not a scraper |
| **Grafana Alloy** | Shared **collector**: scrapes Prometheus metrics, collects logs, receives OTLP |
| **Custom agent** | **Not needed** — use Alloy (or the company’s existing collector) |

Data flow (lab and typical prod pattern):

```
App emits:
  /metrics (Prometheus) ──scrape──► Alloy ──► Mimir  ──► Grafana
  JSON logs (stdout)    ──collect─► Alloy ──► Loki   ──► Grafana
  OTLP traces           ──push────► Alloy ──► Tempo  ──► Grafana
```

**Do not** build a mock backend per language for company rollout. Instrument
**each real service**. Lab demos (like `nestjs-observability-demo`) are optional
learning aids only.

## Golden rules

1. **Ask stack + environment** if unclear: NestJS | Python | .NET | Spring Boot;
   and `local` | `development` | `staging` | `production`.
2. **Never invent secrets.** Use env vars / existing config; redact tokens.
3. **Production is verify-first.** Prefer Explore + light health traffic. No
   failure-injection storms unless the user explicitly asks.
4. **Stable contract across stacks** — same metric names, log fields, and
   `service` / `environment` labels so one Grafana dashboard set works.
5. **OTEL packages go in each service** (or language runtime agent). There is no
   one global install for the whole company.
6. **Dashboards JSON = UTF-8 without BOM** or Grafana errors with
   `invalid character 'ï'`.

## Three pillars every service needs

| Pillar | App responsibility | Collector |
|--------|--------------------|-----------|
| **Metrics** | Prometheus client + scrape endpoint (`/metrics` or Spring `/actuator/prometheus`) | Alloy scrapes → Mimir |
| **Logs** | One JSON object per stdout line | Alloy → Loki |
| **Traces** | OTEL SDK/agent; export OTLP | Alloy → Tempo |

OTEL is **required for the traces path** used by this lab. Logs-only or
metrics-only work without OTEL. Prefer all three for full dashboards.

JSON log fields (minimum):

```
timestamp, level, service, event
optional: trace_id, span_id, environment, and domain fields
```

Metric families to keep stable (see Nest demo):

| Family | Examples |
|--------|----------|
| HTTP | `api_requests_total`, `api_request_duration_seconds`, `api_active_requests`, sizes, timeouts, retries, rate limits |
| Errors | `api_errors_total` (`error_type`, `operation`, `dependency`, `status_code`) |
| Dependencies | `dependency_requests_total`, `dependency_request_duration_seconds`, `dependency_available` |
| Business | `business_transactions_total`, `business_revenue_total`, `business_items_total` |
| SLO | `api_slo_target`, `api_slo_breaches_total` |

Stack-specific libraries: see [stacks.md](stacks.md).

## Using this skill in a real backend repo

When the workspace is a **company service** (not this lab):

1. Confirm **stack**, **environment**, **service name**, Grafana/Alloy endpoints.
2. Inventory what already exists (logger, Micrometer, OTEL, `/metrics`).
3. Add only missing pillars; match the **contract** above (names/labels).
4. Wire env: `OTEL_SERVICE_NAME`, `OTEL_RESOURCE_ATTRIBUTES` (include
   `deployment.environment=...`), `OTEL_EXPORTER_OTLP_ENDPOINT`.
5. Ensure the **platform collector** (Alloy or equivalent) scrapes metrics and
   collects logs for this service — do not invent a custom agent.
6. Verify in Grafana Explore / existing Observability tabs; report Pass/Partial/Fail.

Fill this before coding:

```
Stack: NestJS | Python | .NET | Spring Boot
Environment: local | development | staging | production
Service name:
Base URL:
Metrics URL (or scrape job):
OTLP endpoint:
Grafana URL:
Log label (service_name / app):
Allowed to inject failures?: yes | no
```

Copy this skill into the target repo as `.cursor/skills/grafana-observability/`
(or install as a personal skill) so agents in that repo follow the same playbook.
Point at this lab only as reference for metric/log/trace shapes.

## Environment modes

| Mode | Goal | Traffic | Failure injection |
|------|------|---------|-------------------|
| `local` | Learn / build | Heavy OK | Fully OK |
| `development` | Integrate real deps | Moderate OK | OK if shared safely |
| `staging` | Pre-prod parity | Light–moderate | Prefer controlled flags |
| `production` | Confirm signals exist | Minimal / read-only | **Off by default** |

## What “done” looks like (Grafana tabs)

| Tab | Signals to verify |
|-----|-------------------|
| API Request Metrics | count, duration, status, active, size, timeouts, retries, rate limits |
| Error Telemetry | classified errors + failure logs |
| Distributed Tracing | gateway, auth/authz, app logic, DB, Kafka, external API, cache, file storage |
| Dependency Metrics | DB, Kafka, external APIs, Redis, file storage, auth provider |
| Business Telemetry | transactions / revenue / items (or domain equivalents) |
| API Availability and SLO | availability, success rate, latency, error rate, throughput |
| Structured Application Logs | JSON lines + `trace_id` when possible |
| API Executive Overview | volume, success rate, 5xx, P95, top failing APIs, SLO breaches |

Lab dashboards: `grafana/provisioning/dashboards/json/`.
Regenerate (UTF-8 no BOM): `grafana/provisioning/dashboards/generate-tab-dashboards.ps1`.

## Local lab quick start (reference only)

Repo root (`grafana-monitoring`):

```powershell
docker compose up -d --build
docker compose ps
```

| Piece | URL |
|-------|-----|
| Grafana | http://localhost:3000 (`admin` / `admin`) |
| Demo API | http://localhost:3001 |
| Metrics | http://localhost:3001/metrics |
| Alloy | http://localhost:12345 |

Postman: `nestjs-observability-demo/postman/` — folders **01–08** request metrics,
**09–11** tracing / dependencies / business+SLO.

## Per-environment workflow

1. **Confirm target** — stack, env, base URL, failure-injection allowed?
2. **Wire or verify exporters** — metrics URL, log labels, OTLP → Tempo path.
3. **Traffic** — local/dev: scripts OK; staging: light; prod: Explore first.
4. **Validate Grafana** — panels populate; `environment` / `service` labels;
   TraceID correlates logs↔traces; datasources `mimir` / `loki` / `tempo`.
5. **Report**:

```markdown
## Observability check — {environment}

**Stack:** …
**Service:** …
**Base URL:** …
**Result:** Pass | Partial | Fail

### Working
- …

### Gaps
- …

### Safe next steps
- …
```

## Troubleshooting “No data”

1. **Dashboard missing** — BOM / JSON parse; check Grafana provisioning logs.
2. **Metrics empty** — scrape target, `/metrics` body, Alloy remote_write, Mimir.
3. **Logs empty** — `service_name` vs `app` label mismatch; container filters.
4. **Traces empty** — OTLP URL from the app’s network; Tempo ready; service name.
5. **Wrong dashboard** — use tab UIDs like `tab-api-request-metrics`.

## Safety (staging / production)

- Disable `fail_at`-style injection in prod builds.
- Never commit secrets, tokens, or customer payloads.
- Filter Grafana by `environment`; local Alloy cannot scrape prod by default.

## Repo map (this lab)

| Path | Why it matters |
|------|----------------|
| `docker-compose.yml` | Local stack |
| `alloy/config.alloy` | Scrape, logs, OTLP receiver |
| `grafana/provisioning/` | Datasources + tab dashboards |
| `nestjs-observability-demo/` | NestJS reference (metrics + JSON logs + OTEL) |
| [stacks.md](stacks.md) | Libraries per backend technology |
| `README.md` | Human-oriented lab docs |
