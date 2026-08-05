---
name: grafana-observability
description: >-
  Wire and verify Grafana observability (metrics, JSON logs, OTEL traces) for a
  NestJS or similar backend across local, development, staging, and production.
  Use when adding API request metrics, error telemetry, distributed tracing,
  dependency metrics, business telemetry, SLO panels, structured logs, Postman
  traffic, Alloy/Mimir/Loki/Tempo, or when the user mentions testing observability
  in dev, staging, or prod.
---

# Grafana observability (multi-environment)

Friendly playbook for validating the observability checklist against **your**
backend — locally first, then development, staging, and production — without
treating every environment the same.

## When this skill applies

- Extending or debugging the `grafana-monitoring` lab
- Porting the NestJS demo patterns into another service
- Checking dashboards / Postman / scrape targets per environment
- User says: Grafana, Alloy, Mimir, Loki, Tempo, SLO, traces, `/metrics`,
  observability, or **dev / staging / prod** telemetry checks

## Golden rules

1. **Ask which environment** if unclear: `local` | `development` | `staging` | `production`.
2. **Never invent secrets.** Use env vars / existing config; redact tokens in chat.
3. **Production is verify-first.** Prefer read-only Grafana Explore + light health traffic.
   Do not run collection runners, rate-limit floods, or intentional 5xx/fail_at storms in prod
   unless the user explicitly requests load or failure injection.
4. **Label everything with environment** (`environment`, `deployment.environment`,
   `service`) so dashboards can filter safely.
5. **Dashboards JSON must be UTF-8 without BOM** or Grafana fails with
   `invalid character 'ï'`.

## Environment modes

| Mode | Goal | Traffic | Failure injection |
|------|------|---------|-------------------|
| `local` | Learn / build | Heavy OK | Fully OK |
| `development` | Integrate real deps | Moderate OK | OK if shared safely |
| `staging` | Pre-prod parity | Light–moderate | Prefer controlled flags |
| `production` | Confirm signals exist | Minimal / read-only | **Off by default** |

Copy this checklist and fill it in:

```
Environment: local | development | staging | production
Service name:
Base URL:
Metrics URL (or scrape job):
OTLP endpoint:
Grafana URL:
Log label (service_name / app):
Allowed to inject failures?: yes | no
```

## What “done” looks like (checklist tabs)

Map work to these Grafana tabs (provisioned under **Observability**):

| Tab | Signals to verify |
|-----|-------------------|
| API Request Metrics | count, duration, status, active, size, timeouts, retries, rate limits |
| Error Telemetry | classified errors + failure logs |
| Distributed Tracing | gateway, auth/authz, app logic, DB, Kafka pub/consume, external API, cache, file storage |
| Dependency Metrics | PostgreSQL/Citus, Kafka, external APIs, Redis, file storage, auth provider |
| Business Telemetry | transactions / revenue / items (or domain equivalents) |
| API Availability and SLO | availability, success rate, latency, error rate, throughput |
| Structured Application Logs | one JSON object per line + `trace_id` when possible |
| API Executive Overview | availability, volume, success rate, 5xx, P95, top failing APIs, SLO breaches |

Local lab reference: `grafana/provisioning/dashboards/json/`.
Regenerate (UTF-8 no BOM): `grafana/provisioning/dashboards/generate-tab-dashboards.ps1`.

## Local lab quick start

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

Data flow: `/metrics` → Alloy → Mimir · JSON logs → Alloy → Loki · OTLP → Alloy → Tempo.

Postman: `nestjs-observability-demo/postman/` — folders **01–08** request metrics,
**09–11** tracing / dependencies / business+SLO. Point `baseUrl` at the target env.

## Adapting to another backend

Keep the **metric names and labels stable** so existing dashboards keep working.
Prefer these families (demo reference: `nestjs-observability-demo/src/`):

| Family | Examples |
|--------|----------|
| HTTP | `api_requests_total`, `api_request_duration_seconds`, `api_active_requests`, sizes, timeouts, retries, rate limits |
| Errors | `api_errors_total` (`error_type`, `operation`, `dependency`, `status_code`) |
| Dependencies | `dependency_requests_total`, `dependency_request_duration_seconds`, `dependency_available` |
| Business | `business_transactions_total`, `business_revenue_total`, `business_items_total` |
| SLO | `api_slo_target`, `api_slo_breaches_total` |

Also:

- Structured JSON logs: `timestamp`, `level`, `service`, `event`, optional `trace_id` / `span_id`
- OTEL: load instrumentation **before** app bootstrap; set `OTEL_SERVICE_NAME`,
  `OTEL_RESOURCE_ATTRIBUTES` (include `deployment.environment=...`),
  `OTEL_EXPORTER_OTLP_ENDPOINT`
- Scrape/path: expose Prometheus `/metrics` (or your platform’s equivalent) and
  teach Alloy/Prometheus the correct host per environment

If the real service cannot simulate deps, instrument **real** clients (DB, Kafka,
Redis, HTTP) with the same dependency metric labels — do not fake prod systems.

## Per-environment workflow

### 1. Confirm target

Ask for environment + base URL + whether failure injection is allowed.

### 2. Wire or verify exporters

- Metrics reachable (auth headers if required)
- Logs shipping with stable `service_name` (or document the real label)
- Traces reaching Tempo/collector; service name matches Grafana TraceQL filters

### 3. Generate appropriate traffic

- **local / development:** Postman folders or scripts OK
- **staging:** small scripted checks; avoid rate-limit hammers unless requested
- **production:** health + one safe read path; use Explore on existing traffic first

### 4. Validate in Grafana

For each relevant tab: panels populate, labels include `environment`,
errors/traces correlate via TraceID, no permanent “No data” from wrong datasource UID
(`mimir`, `loki`, `tempo` in this lab).

### 5. Report back (friendly summary)

```markdown
## Observability check — {environment}

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

1. **Dashboard not listed** — check Grafana logs for JSON BOM / parse errors;
   provision path: `grafana/provisioning/dashboards/`.
2. **Metrics empty** — scrape target, `/metrics` contents, Alloy remote_write, Mimir ready.
3. **Logs empty** — label name mismatch (`service_name` vs `app`); container name filters.
4. **Traces empty** — OTLP endpoint from the app’s network namespace; Tempo ready;
   service name in TraceQL.
5. **Wrong dashboard** — use tab UIDs like `tab-api-request-metrics`, not old manual
   dashboards (e.g. orphaned “API Telemetry”).

## Safety notes for staging / production

- Prefer feature flags / allowlists for `fail_at`-style endpoints; disable in prod builds.
- Do not commit `.env` files, tokens, or customer payloads into dashboards or skills.
- When comparing envs, filter Grafana by `environment` — never assume local scrape jobs
  can reach prod, or that prod credentials belong in local Alloy.

## Repo map (this lab)

| Path | Why it matters |
|------|----------------|
| `docker-compose.yml` | Local stack |
| `alloy/config.alloy` | Scrape, logs, OTLP |
| `grafana/provisioning/` | Datasources + tab dashboards |
| `nestjs-observability-demo/` | Reference NestJS instrumentation + Postman |
| `README.md` | Human-oriented lab docs |

For deeper PromQL examples and `fail_at` values, see the repo root `README.md`.
