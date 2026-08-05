# NestJS observability demo

A deliberately small API for learning Grafana Loki logs and Mimir metrics.

## Requirements

- Node.js 22 (Node.js 20 also works)
- npm

## Run locally

```powershell
npm install
npm run start:dev
```

Open <http://localhost:3000>. Prometheus metrics are available at
<http://localhost:3000/metrics>.

## Generate test traffic

Run these commands in another PowerShell window:

```powershell
Invoke-RestMethod http://localhost:3000/api/hello
Invoke-RestMethod "http://localhost:3000/api/slow?ms=1500"
Invoke-RestMethod http://localhost:3000/api/retry
Invoke-RestMethod http://localhost:3000/api/timeout
Invoke-RestMethod http://localhost:3000/api/error
1..7 | ForEach-Object { Invoke-RestMethod http://localhost:3000/api/rate-limit }
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/echo -ContentType application/json -Body '{"message":"hello Grafana"}'
```

The error, timeout, and rate-limit commands intentionally return HTTP errors.

## Run with Docker

```powershell
docker build -t nestjs-observability-demo .
docker run --name nestjs-observability-demo -p 3000:3000 nestjs-observability-demo
```

View its raw JSON logs:

```powershell
docker logs -f nestjs-observability-demo
```

## Alloy metrics configuration

If Alloy is running in Docker and this API is running directly on Windows:

```alloy
prometheus.scrape "nestjs_demo" {
  targets = [{ "__address__" = "host.docker.internal:3000" }]
  metrics_path = "/metrics"
  scrape_interval = "15s"
  forward_to = [prometheus.remote_write.mimir.receiver]
}
```

If both containers are on the same Docker network, replace the address with
`nestjs-observability-demo:3000`.

## Useful Loki queries

Assuming your log collector attaches `service_name="nestjs-observability-demo"`:

```logql
{service_name="nestjs-observability-demo"} | json
```

```logql
{service_name="nestjs-observability-demo"} | json | level="error"
```

Your collector may use a different stream label, such as `container` or `service`.
Use Grafana Explore's label browser to see the labels available in your Loki data.

## Useful Mimir queries

```promql
sum(rate(api_requests_total[5m]))
```

```promql
sum by (status_code) (rate(api_requests_total[5m]))
```

```promql
histogram_quantile(0.95, sum by (le) (rate(api_request_duration_seconds_bucket[5m])))
```
