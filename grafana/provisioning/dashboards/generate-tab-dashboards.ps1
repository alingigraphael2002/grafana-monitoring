$tabLinks = @(
  @{ type='link'; title='API Request Metrics'; url='/d/tab-api-request-metrics'; keepTime=$true; includeVars=$true; asDropdown=$false; targetBlank=$false; icon='dashboard'; tooltip='API Request Metrics' },
  @{ type='link'; title='Error Telemetry'; url='/d/tab-error-telemetry'; keepTime=$true; includeVars=$true; asDropdown=$false; targetBlank=$false; icon='dashboard'; tooltip='Error Telemetry' },
  @{ type='link'; title='Distributed Tracing'; url='/d/tab-distributed-tracing'; keepTime=$true; includeVars=$true; asDropdown=$false; targetBlank=$false; icon='dashboard'; tooltip='Distributed Tracing' },
  @{ type='link'; title='Dependency Metrics'; url='/d/tab-dependency-metrics'; keepTime=$true; includeVars=$true; asDropdown=$false; targetBlank=$false; icon='dashboard'; tooltip='Dependency Metrics' },
  @{ type='link'; title='Business Telemetry'; url='/d/tab-business-telemetry'; keepTime=$true; includeVars=$true; asDropdown=$false; targetBlank=$false; icon='dashboard'; tooltip='Business Telemetry' },
  @{ type='link'; title='API Availability and SLO'; url='/d/tab-api-slo-metrics'; keepTime=$true; includeVars=$true; asDropdown=$false; targetBlank=$false; icon='dashboard'; tooltip='API Availability and SLO Metrics' },
  @{ type='link'; title='Structured Application Logs'; url='/d/tab-structured-logs'; keepTime=$true; includeVars=$true; asDropdown=$false; targetBlank=$false; icon='dashboard'; tooltip='Structured Application Logs' },
  @{ type='link'; title='API Executive Overview'; url='/d/tab-executive-overview'; keepTime=$true; includeVars=$true; asDropdown=$false; targetBlank=$false; icon='dashboard'; tooltip='API Executive Overview' },
  @{ type='link'; title='Metric Discovery'; url='/d/tab-metric-discovery'; keepTime=$true; includeVars=$true; asDropdown=$false; targetBlank=$false; icon='dashboard'; tooltip='Deep metric discovery and data lineage' }
)

function New-Dash($uid, $title, $description, $panels, $tags, $variables = @()) {
  return [ordered]@{
    annotations = @{ list = @() }
    description = $description
    editable = $true
    fiscalYearStartMonth = 0
    graphTooltip = 1
    id = $null
    links = $tabLinks
    liveNow = $true
    panels = $panels
    refresh = '5s'
    schemaVersion = 42
    tags = $tags
    templating = @{ list = $variables }
    time = @{ from = 'now-15m'; to = 'now' }
    timepicker = @{}
    timezone = 'browser'
    title = $title
    uid = $uid
    version = 1
    weekStart = ''
  }
}

function LineageLink($metric) {
  return @{
    asDropdown = $false
    icon = 'dashboard'
    includeVars = $false
    keepTime = $true
    tags = @()
    targetBlank = $false
    title = "Lineage: $metric"
    tooltip = "Open Metric Discovery for $metric"
    type = 'link'
    url = "/d/tab-metric-discovery?var-metric=$metric"
  }
}

function Stat($id, $x, $y, $w, $h, $title, $expr, $unit='short', $decimals=2, $desc='', $thresholds=$null, $lineageMetric='') {
  $fc = @{
    defaults = @{
      color = @{ mode = 'thresholds' }
      decimals = $decimals
      unit = $unit
      thresholds = if ($thresholds) { $thresholds } else { @{ mode='absolute'; steps=@(@{ color='blue'; value=$null }) } }
    }
    overrides = @()
  }
  $panel = @{
    datasource = @{ type='prometheus'; uid='mimir' }
    description = $desc
    fieldConfig = $fc
    gridPos = @{ h=$h; w=$w; x=$x; y=$y }
    id = $id
    options = @{ colorMode='background'; graphMode='area'; justifyMode='center'; orientation='auto'; reduceOptions=@{ calcs=@('lastNotNull'); fields=''; values=$false }; textMode='value_and_name'; wideLayout=$true }
    targets = @(@{ editorMode='code'; expr=$expr; instant=$true; legendFormat=$title; range=$false; refId='A' })
    title = $title
    type = 'stat'
  }
  if ($lineageMetric) {
    $panel.links = @((LineageLink $lineageMetric))
    $lineageHint = "Panel link opens Metric Discovery for $lineageMetric."
    $panel.description = if ($desc) { "$desc $lineageHint" } else { $lineageHint }
  }
  return $panel
}

function Timeseries($id, $x, $y, $w, $h, $title, $targets, $unit='short', $drawStyle='line', $stacking='none', $desc='') {
  $tgts = @()
  $ref = 65
  foreach ($t in $targets) {
    $tgts += @{ editorMode='code'; expr=$t.expr; legendFormat=$t.legend; range=$true; refId=[char]$ref }
    $ref++
  }
  return @{
    datasource = @{ type='prometheus'; uid='mimir' }
    description = $desc
    fieldConfig = @{
      defaults = @{
        color = @{ mode = 'palette-classic' }
        custom = @{ drawStyle=$drawStyle; fillOpacity=25; gradientMode='opacity'; lineInterpolation='smooth'; lineWidth=2; showPoints='never'; spanNulls=$true; stacking=@{ group='A'; mode=$stacking } }
        unit = $unit
      }
      overrides = @()
    }
    gridPos = @{ h=$h; w=$w; x=$x; y=$y }
    id = $id
    options = @{ legend=@{ calcs=@('mean','lastNotNull'); displayMode='table'; placement='right'; showLegend=$true }; tooltip=@{ mode='multi'; sort='desc' } }
    targets = $tgts
    title = $title
    type = 'timeseries'
  }
}

function BarGauge($id, $x, $y, $w, $h, $title, $expr, $legend, $unit='short') {
  return @{
    datasource = @{ type='prometheus'; uid='mimir' }
    fieldConfig = @{ defaults=@{ color=@{ mode='continuous-BlYlRd' }; decimals=0; unit=$unit; thresholds=@{ mode='absolute'; steps=@(@{ color='blue'; value=$null }) } }; overrides=@() }
    gridPos = @{ h=$h; w=$w; x=$x; y=$y }
    id = $id
    options = @{ displayMode='gradient'; minVizHeight=10; orientation='horizontal'; reduceOptions=@{ calcs=@('lastNotNull'); fields=''; values=$false }; showUnfilled=$true; sizing='auto'; valueMode='color' }
    targets = @(@{ editorMode='code'; expr=$expr; instant=$true; legendFormat=$legend; range=$false; refId='A' })
    title = $title
    type = 'bargauge'
  }
}

function Logs($id, $x, $y, $w, $h, $title, $expr, $desc='') {
  return @{
    datasource = @{ type='loki'; uid='loki' }
    description = $desc
    gridPos = @{ h=$h; w=$w; x=$x; y=$y }
    id = $id
    options = @{ dedupStrategy='none'; enableLogDetails=$true; prettifyLogMessage=$true; showCommonLabels=$false; showLabels=$false; showTime=$true; sortOrder='Descending'; wrapLogMessage=$true }
    targets = @(@{ editorMode='code'; expr=$expr; queryType='range'; refId='A' })
    title = $title
    type = 'logs'
  }
}

function Traces($id, $x, $y, $w, $h, $title, $query, $desc='') {
  return @{
    datasource = @{ type='tempo'; uid='tempo' }
    description = $desc
    gridPos = @{ h=$h; w=$w; x=$x; y=$y }
    id = $id
    options = @{ spanBar=@{ type='None'; tag=$null }; showTraceId=$true; showSpanId=$false }
    targets = @(@{ datasource=@{ type='tempo'; uid='tempo' }; query=$query; queryType='traceqlSearch'; limit=20; refId='A'; tableType='traces' })
    title = $title
    type = 'traces'
  }
}

function Row($id, $y, $title) {
  return @{ collapsed=$false; gridPos=@{ h=1; w=24; x=0; y=$y }; id=$id; panels=@(); title=$title; type='row' }
}

function QueryVar($name, $label, $query) {
  return @{
    allValue = '.+'
    current = @{ selected = $true; text = 'All'; value = '$__all' }
    datasource = @{ type = 'prometheus'; uid = 'mimir' }
    definition = $query
    hide = 0
    includeAll = $true
    label = $label
    multi = $true
    name = $name
    options = @()
    query = $query
    refresh = 2
    regex = ''
    skipUrlSync = $false
    sort = 1
    type = 'query'
  }
}

function Table($id, $x, $y, $w, $h, $title, $expr, $desc='') {
  return @{
    datasource = @{ type='prometheus'; uid='mimir' }
    description = $desc
    fieldConfig = @{
      defaults = @{
        custom = @{ align='auto'; cellOptions=@{ type='auto' }; inspect=$true; filterable=$true }
      }
      overrides = @()
    }
    gridPos = @{ h=$h; w=$w; x=$x; y=$y }
    id = $id
    options = @{ cellHeight='sm'; footer=@{ countRows=$false; fields=''; reducer=@('sum'); show=$false }; showHeader=$true }
    targets = @(@{ editorMode='code'; expr=$expr; format='table'; instant=$true; range=$false; refId='A' })
    title = $title
    transformations = @(
      @{ id='labelsToFields'; options=@{} },
      @{ id='organize'; options=@{
        excludeByName = @{ Time=$true; Value=$true; __name__=$true; job=$true; instance=$true; environment=$true; service=$true }
      } }
    )
    type = 'table'
  }
}

function TextPanel($id, $x, $y, $w, $h, $title, $markdown) {
  return @{
    gridPos = @{ h=$h; w=$w; x=$x; y=$y }
    id = $id
    options = @{ code=@{ language='markdown'; showLineNumbers=$false; showMiniMap=$false }; content=$markdown; mode='markdown' }
    title = $title
    type = 'text'
  }
}

$outDir = Join-Path $PSScriptRoot 'json'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

# --- 1. API Request Metrics ---
$p = @()
$p += (Row 100 0 'Request count')
$p += (Stat 1 0 1 6 4 'Request count' 'sum(increase(api_requests_total[$__range]))' 'short' 0 'Total HTTP requests in range' $null 'api_requests_total')
$p += (Timeseries 2 6 1 18 4 'Request rate by route' @(@{ expr='sum by (route) (rate(api_requests_total[$__rate_interval]))'; legend='{{route}}' }) 'reqps' 'line' 'none')

$p += (Row 110 5 'Request duration')
$p += (Stat 3 0 6 6 4 'P95 duration' 'histogram_quantile(0.95, sum by (le) (rate(api_request_duration_seconds_bucket[5m])))' 's' 3 'P95 latency' @{ mode='absolute'; steps=@(@{color='green';value=$null},@{color='yellow';value=0.5},@{color='red';value=1}) } 'api_request_duration_seconds')
$p += (Timeseries 4 6 6 18 8 'Duration percentiles by route' @(
  @{ expr='histogram_quantile(0.50, sum by (le, route) (rate(api_request_duration_seconds_bucket[$__rate_interval])))'; legend='P50 {{route}}' },
  @{ expr='histogram_quantile(0.95, sum by (le, route) (rate(api_request_duration_seconds_bucket[$__rate_interval])))'; legend='P95 {{route}}' }
) 's')

$p += (Row 120 14 'Response status')
$p += (Stat 5 0 15 6 4 'Success rate' '100 * sum(rate(api_requests_total{status_code!~"4..|5.."}[5m])) / clamp_min(sum(rate(api_requests_total[5m])), 0.000001)' 'percent' 2 '' @{ mode='absolute'; steps=@(@{color='red';value=$null},@{color='yellow';value=95},@{color='green';value=99}) } 'api_requests_total')
$p += (Timeseries 6 6 15 18 8 'Status code rate' @(@{ expr='sum by (status_code) (rate(api_requests_total[$__rate_interval]))'; legend='{{status_code}}' }) 'reqps' 'bars' 'normal')

$p += (Row 130 23 'Active requests')
$p += (Stat 7 0 24 6 4 'Active requests' 'api_active_requests' 'short' 0 '' $null 'api_active_requests')
$p += (Timeseries 8 6 24 18 6 'Active requests over time' @(@{ expr='api_active_requests'; legend='active' }) 'short')

$p += (Row 140 30 'Request / response size')
$p += (Timeseries 9 0 31 12 7 'Request size throughput' @(@{ expr='sum by (route) (rate(api_request_size_bytes_sum[$__rate_interval]))'; legend='{{route}}' }) 'Bps' 'bars' 'normal')
$p += (Timeseries 10 12 31 12 7 'Response size throughput' @(@{ expr='sum by (route) (rate(api_response_size_bytes_sum[$__rate_interval]))'; legend='{{route}}' }) 'Bps' 'bars' 'normal')

$p += (Row 150 38 'Timeout count')
$p += (Stat 11 0 39 6 4 'Timeout count' 'sum(increase(api_request_timeouts_total[$__range])) or vector(0)' 'short' 0 '' $null 'api_request_timeouts_total')
$p += (Timeseries 12 6 39 18 6 'Timeout rate' @(@{ expr='sum by (route) (rate(api_request_timeouts_total[$__rate_interval]))'; legend='{{route}}' }) 'ops' 'bars' 'normal')

$p += (Row 160 45 'Retry count')
$p += (Stat 13 0 46 6 4 'Retry count' 'sum(increase(api_request_retries_total[$__range])) or vector(0)' 'short' 0 '' $null 'api_request_retries_total')
$p += (Timeseries 14 6 46 18 6 'Retry rate' @(@{ expr='sum by (operation) (rate(api_request_retries_total[$__rate_interval]))'; legend='{{operation}}' }) 'ops' 'bars' 'normal')

$p += (Row 170 52 'Rate-limit count')
$p += (Stat 15 0 53 6 4 'Rate-limit count' 'sum(increase(api_rate_limit_hits_total[$__range])) or vector(0)' 'short' 0 '' $null 'api_rate_limit_hits_total')
$p += (Timeseries 16 6 53 18 6 'Rate-limit hit rate' @(@{ expr='sum by (route) (rate(api_rate_limit_hits_total[$__rate_interval]))'; legend='{{route}}' }) 'ops' 'bars' 'normal')

$dash = New-Dash 'tab-api-request-metrics' 'API Request Metrics' 'Tab: API Request Metrics — request count, duration, status, active, size, timeouts, retries, rate limits.' $p @('nestjs','observability','tabs','api-request-metrics')
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
function Save-DashJson($dash, $fileName) {
  [System.IO.File]::WriteAllText((Join-Path $outDir $fileName), ($dash | ConvertTo-Json -Depth 40), $utf8NoBom)
}
Save-DashJson $dash '01-api-request-metrics.json'

# --- 2. Error Telemetry ---
$p = @()
$p += (Stat 1 0 0 6 4 'HTTP error rate' 'sum(rate(api_errors_total[5m]))' 'ops' 2 'Failed HTTP requests/sec' $null 'api_errors_total')
$p += (Stat 2 6 0 6 4 '5xx share' '100 * sum(rate(api_requests_total{status_code=~"5.."}[5m])) / clamp_min(sum(rate(api_requests_total[5m])), 0.000001)' 'percent' 2)
$p += (Stat 3 12 0 6 4 '4xx share' '100 * sum(rate(api_requests_total{status_code=~"4.."}[5m])) / clamp_min(sum(rate(api_requests_total[5m])), 0.000001)' 'percent' 2)
$p += (Stat 4 18 0 6 4 'Failed requests in range' 'sum(increase(api_errors_total[$__range])) or vector(0)' 'short' 0)
$p += (Timeseries 5 0 4 12 8 'Errors by type' @(@{ expr='sum by (error_type) (rate(api_errors_total[$__rate_interval]))'; legend='{{error_type}}' }) 'ops' 'bars' 'normal')
$p += (Timeseries 6 12 4 12 8 'Dependency failures' @(@{ expr='sum by (dependency) (rate(dependency_requests_total{outcome="failure"}[$__rate_interval]))'; legend='{{dependency}}' }) 'ops' 'bars' 'normal')
$p += (BarGauge 7 0 12 12 8 'Top failing API routes' 'topk(8, sum by (operation) (increase(api_errors_total[$__range])))' '{{operation}}')
$p += (Logs 8 12 12 12 8 'Error / warn logs' '{service_name="nestjs-observability-demo"} | json | level=~"error|warn"' 'Structured error and warning events')
$p += (Logs 9 0 20 24 8 'Failed operations' '{service_name="nestjs-observability-demo"} | json | event="operation_failed"' 'Distributed stage failures (see Distributed Tracing tab for per-stage detail)')

$dash = New-Dash 'tab-error-telemetry' 'Error Telemetry' 'Tab: Error Telemetry — classified API/dependency errors and failure logs. Use Distributed Tracing for stage spans.' $p @('nestjs','observability','tabs','errors')
Save-DashJson $dash '02-error-telemetry.json'

# --- 3. Distributed Tracing ---
$stages = @(
  @{ name='API gateway'; stage='api_gateway'; dep=$null; op='route_request' },
  @{ name='Authentication and authorisation'; stage='auth'; dep='auth_provider'; op='validate_token' },
  @{ name='Application logic'; stage='application_logic'; dep=$null; op='validate_order' },
  @{ name='Database query'; stage='postgresql_citus'; dep='postgresql_citus'; op='database_query' },
  @{ name='Kafka publish or consume'; stage='kafka'; dep='kafka'; op='.*' },
  @{ name='External API call'; stage='external_api'; dep='external_api'; op='payment_request' },
  @{ name='Cache operation'; stage='redis_cache'; dep='redis_cache'; op='cache_operation' },
  @{ name='File storage operation'; stage='file_storage'; dep='file_storage'; op='store_receipt' }
)

$p = @()
$p += (Traces 1 0 0 24 8 'Tempo trace search' '{ resource.service.name = "nestjs-observability-demo" }' 'Native Tempo results. Open a trace to inspect the checkout span hierarchy.')
$p += (Logs 2 0 8 24 6 'Checkout / stage trace logs' '{service_name="nestjs-observability-demo"} | json | event=~"operation_.*|business_transaction|request_completed"' 'Click TraceID to open the correlated Tempo trace. Generate traffic with POST /api/checkout.')
$y = 14
$id = 10
foreach ($s in $stages) {
  $p += (Row ($id) $y $s.name)
  $y++
  $id++
  if ($s.dep) {
    $dep = $s.dep
    $p += (Stat $id 0 $y 4 4 "$($s.name) success" "sum(increase(dependency_requests_total{dependency=`"$dep`",outcome=`"success`"}[`$__range])) or vector(0)" 'short' 0)
    $id++
    $p += (Stat $id 4 $y 4 4 "$($s.name) failure" "sum(increase(dependency_requests_total{dependency=`"$dep`",outcome=`"failure`"}[`$__range])) or vector(0)" 'short' 0)
    $id++
    $p += (Stat $id 8 $y 4 4 'P95 latency' "histogram_quantile(0.95, sum by (le) (rate(dependency_request_duration_seconds_bucket{dependency=`"$dep`"}[5m])))" 's' 3)
    $id++
    $p += (Timeseries $id 12 $y 12 4 'Ops rate' @(@{ expr="sum by (operation, outcome) (rate(dependency_requests_total{dependency=`"$dep`"}[`$__rate_interval]))"; legend='{{operation}} {{outcome}}' }) 'ops' 'bars' 'normal')
    $id++
  } else {
    $stage = $s.stage
    $p += (Logs $id 0 $y 24 5 "$($s.name) stage events" "{service_name=`"nestjs-observability-demo`"} | json | stage=`"$stage`"" 'Span/stage events for this checkout step')
    $id++
  }
  $y += 5
}

# Authz is separate from auth_provider - add authorisation log section after auth row conceptually already covered in auth logs via authorization stage
$p += (Row 200 $y 'Authorisation (internal)')
$y++
$p += (Logs 201 0 $y 24 5 'Authorisation stage events' '{service_name="nestjs-observability-demo"} | json | stage="authorization"' 'authorization.authorize_checkout spans/logs')

$dash = New-Dash 'tab-distributed-tracing' 'Distributed Tracing' 'Tab: Distributed Tracing — API gateway, auth/authorisation, application logic, DB, Kafka, external API, cache, file storage.' $p @('nestjs','observability','tabs','tracing')
Save-DashJson $dash '03-distributed-tracing.json'

# --- 4. Dependency Metrics ---
$deps = @(
  @{ title='PostgreSQL/Citus'; name='postgresql_citus' },
  @{ title='Kafka'; name='kafka' },
  @{ title='External APIs'; name='external_api' },
  @{ title='Redis/cache'; name='redis_cache' },
  @{ title='File storage'; name='file_storage' },
  @{ title='Authentication provider'; name='auth_provider' }
)
$p = @()
$p += (Timeseries 1 0 0 12 7 'Dependency availability' @(@{ expr='dependency_available'; legend='{{dependency}}' }) 'short')
$p += (Timeseries 2 12 0 12 7 'Dependency request rate' @(@{ expr='sum by (dependency, outcome) (rate(dependency_requests_total[$__rate_interval]))'; legend='{{dependency}} {{outcome}}' }) 'ops' 'bars' 'normal')
$y = 7
$id = 10
foreach ($d in $deps) {
  $p += (Row $id $y $d.title)
  $y++; $id++
  $n = $d.name
  $p += (Stat $id 0 $y 4 4 'Available' "dependency_available{dependency=`"$n`"}" 'short' 0)
  $id++
  $p += (Stat $id 4 $y 4 4 'Success' "sum(increase(dependency_requests_total{dependency=`"$n`",outcome=`"success`"}[`$__range])) or vector(0)" 'short' 0)
  $id++
  $p += (Stat $id 8 $y 4 4 'Failure' "sum(increase(dependency_requests_total{dependency=`"$n`",outcome=`"failure`"}[`$__range])) or vector(0)" 'short' 0)
  $id++
  $p += (Stat $id 12 $y 4 4 'P95' "histogram_quantile(0.95, sum by (le) (rate(dependency_request_duration_seconds_bucket{dependency=`"$n`"}[5m])))" 's' 3)
  $id++
  $p += (Timeseries $id 16 $y 8 4 'Latency' @(@{ expr="histogram_quantile(0.95, sum by (le, operation) (rate(dependency_request_duration_seconds_bucket{dependency=`"$n`"}[`$__rate_interval])))"; legend='P95 {{operation}}' }) 's')
  $id++
  $y += 4
}

$dash = New-Dash 'tab-dependency-metrics' 'Dependency Metrics' 'Tab: Dependency Metrics — PostgreSQL/Citus, Kafka, External APIs, Redis/cache, File storage, Authentication provider.' $p @('nestjs','observability','tabs','dependencies')
Save-DashJson $dash '04-dependency-metrics.json'

# --- 5. Business Telemetry ---
# Prefer raw counters for KPIs: increase()/rate() stay empty until 2+ scrapes exist.
$p = @()
$p += (Stat 1 0 0 6 4 'Transactions' 'sum(business_transactions_total) or vector(0)' 'short' 0 'Total checkout transactions since the API process started. Generated only by POST /api/checkout.' $null 'business_transactions_total')
$p += (Stat 2 6 0 6 4 'Successful' 'sum(business_transactions_total{outcome="success"}) or vector(0)' 'short' 0)
$p += (Stat 3 12 0 6 4 'Failed' 'sum(business_transactions_total{outcome="failure"}) or vector(0)' 'short' 0)
$p += (Stat 4 18 0 6 4 'Business value (USD)' 'sum(business_revenue_total) or vector(0)' 'currency:USD' 2)
$p += (Timeseries 5 0 4 12 8 'Transactions by outcome / channel' @(@{ expr='sum by (outcome, channel) (increase(business_transactions_total[$__rate_interval]))'; legend='{{outcome}} / {{channel}}' }) 'short' 'bars' 'normal')
$p += (Timeseries 6 12 4 12 8 'Revenue' @(@{ expr='sum by (channel) (increase(business_revenue_total[$__rate_interval]))'; legend='{{channel}}' }) 'currency:USD' 'bars' 'normal')
$p += (Timeseries 7 0 12 12 8 'Items processed' @(@{ expr='sum by (transaction, channel) (increase(business_items_total[$__rate_interval]))'; legend='{{transaction}} / {{channel}}' }) 'short' 'bars' 'normal')
$p += (Logs 8 12 12 12 8 'Business transaction logs' '{service_name="nestjs-observability-demo"} | json | event="business_transaction"' 'Only POST /api/checkout emits event=business_transaction. Folders 01-08 will not create these logs.')

$dash = New-Dash 'tab-business-telemetry' 'Business Telemetry' 'Tab: Business Telemetry — checkout transactions, revenue, items, and business event logs.' $p @('nestjs','observability','tabs','business')
Save-DashJson $dash '05-business-telemetry.json'

# --- 6. API Availability and SLO ---
$p = @()
$p += (Stat 1 0 0 4 4 'Availability' '100 * (sum(rate(api_requests_total[5m])) - sum(rate(api_requests_total{status_code=~"5.."}[5m]))) / clamp_min(sum(rate(api_requests_total[5m])), 0.000001)' 'percent' 2 '' @{ mode='absolute'; steps=@(@{color='red';value=$null},@{color='yellow';value=99},@{color='green';value=99.9}) } 'api_requests_total')
$p += (Stat 2 4 0 4 4 'Success rate' '100 * sum(rate(api_requests_total{status_code!~"4..|5.."}[5m])) / clamp_min(sum(rate(api_requests_total[5m])), 0.000001)' 'percent' 2 '' @{ mode='absolute'; steps=@(@{color='red';value=$null},@{color='yellow';value=95},@{color='green';value=99}) })
$p += (Stat 3 8 0 4 4 'Latency P95' 'histogram_quantile(0.95, sum by (le) (rate(api_request_duration_seconds_bucket[5m])))' 's' 3 '' @{ mode='absolute'; steps=@(@{color='green';value=$null},@{color='yellow';value=0.5},@{color='red';value=1}) })
$p += (Stat 4 12 0 4 4 'Error rate' '100 * sum(rate(api_requests_total{status_code=~"5.."}[5m])) / clamp_min(sum(rate(api_requests_total[5m])), 0.000001)' 'percent' 2)
$p += (Stat 5 16 0 4 4 'Throughput' 'sum(rate(api_requests_total[5m]))' 'reqps' 2)
$p += (Stat 6 20 0 4 4 'SLO target avail' 'api_slo_target{indicator="availability"} * 100' 'percent' 2 '' $null 'api_slo_target')

$p += (Row 100 4 'Availability')
$p += (Timeseries 10 0 5 24 7 'Availability over time' @(@{ expr='100 * (sum(rate(api_requests_total[$__rate_interval])) - sum(rate(api_requests_total{status_code=~"5.."}[$__rate_interval]))) / clamp_min(sum(rate(api_requests_total[$__rate_interval])), 0.000001)'; legend='availability %' }) 'percent')

$p += (Row 110 12 'Success rate')
$p += (Timeseries 11 0 13 24 7 'Success rate over time' @(@{ expr='100 * sum(rate(api_requests_total{status_code!~"4..|5.."}[$__rate_interval])) / clamp_min(sum(rate(api_requests_total[$__rate_interval])), 0.000001)'; legend='success %' }) 'percent')

$p += (Row 120 20 'Latency')
$p += (Timeseries 12 0 21 24 7 'Latency P50/P95/P99' @(
  @{ expr='histogram_quantile(0.50, sum by (le) (rate(api_request_duration_seconds_bucket[$__rate_interval])))'; legend='P50' },
  @{ expr='histogram_quantile(0.95, sum by (le) (rate(api_request_duration_seconds_bucket[$__rate_interval])))'; legend='P95' },
  @{ expr='histogram_quantile(0.99, sum by (le) (rate(api_request_duration_seconds_bucket[$__rate_interval])))'; legend='P99' }
) 's')

$p += (Row 130 28 'Error rate')
$p += (Timeseries 13 0 29 24 7 '5xx error rate' @(@{ expr='100 * sum(rate(api_requests_total{status_code=~"5.."}[$__rate_interval])) / clamp_min(sum(rate(api_requests_total[$__rate_interval])), 0.000001)'; legend='5xx %' }) 'percent')

$p += (Row 140 36 'Throughput')
$p += (Timeseries 14 0 37 24 7 'Request throughput' @(@{ expr='sum(rate(api_requests_total[$__rate_interval]))'; legend='req/s' }) 'reqps')

$p += (Row 150 44 'Request-level SLI violations')
$p += (BarGauge 15 0 45 24 7 'SLI violations by indicator / route' 'sum by (indicator, route) (increase(api_sli_violations_total[$__range]))' '{{indicator}}: {{route}}')

$dash = New-Dash 'tab-api-slo-metrics' 'API Availability and SLO Metrics' 'Tab: Availability, success rate, latency, error rate, throughput, and request-level SLI violations.' $p @('nestjs','observability','tabs','slo')
Save-DashJson $dash '06-api-slo-metrics.json'

# --- 7. Structured Application Logs ---
$p = @()
$p += (Logs 1 0 0 24 10 'All structured JSON logs' '{service_name="nestjs-observability-demo"} | json' 'One JSON object per line. Click TraceID to open Tempo.')
$p += (Logs 2 0 10 12 8 'Application logs' '{service_name="nestjs-observability-demo"} | json | event="application_log"')
$p += (Logs 3 12 10 12 8 'Request events' '{service_name="nestjs-observability-demo"} | json | event=~"request_.*"')
$p += (Logs 4 0 18 12 8 'Operation events' '{service_name="nestjs-observability-demo"} | json | event=~"operation_.*"')
$p += (Logs 5 12 18 12 8 'Errors only' '{service_name="nestjs-observability-demo"} | json | level="error"')

$dash = New-Dash 'tab-structured-logs' 'Structured Application Logs' 'Tab: Structured JSON logging for application events, requests, operations, and errors.' $p @('nestjs','observability','tabs','logs')
Save-DashJson $dash '07-structured-application-logs.json'

# --- 8. API Executive Overview ---
$availabilityByService = '100 * (sum by (service) (rate(api_requests_total[5m])) - sum by (service) (rate(api_requests_total{status_code=~"5.."}[5m]))) / clamp_min(sum by (service) (rate(api_requests_total[5m])), 0.000001)'
$successByService = '100 * sum by (service) (rate(api_requests_total{status_code!~"4..|5.."}[5m])) / clamp_min(sum by (service) (rate(api_requests_total[5m])), 0.000001)'
$latencyByService = 'histogram_quantile(0.95, sum by (service, le) (rate(api_request_duration_seconds_bucket[5m])))'
$breachingSlos = "label_replace(($availabilityByService) < 99.9, `"slo`", `"availability`", `"service`", `".*`") or label_replace(($successByService) < 99, `"slo`", `"success_rate`", `"service`", `".*`") or label_replace(($latencyByService) > 0.5, `"slo`", `"p95_latency`", `"service`", `".*`")"
$p = @()
$p += (Stat 1 0 0 4 4 'Availability' '100 * (sum(rate(api_requests_total[5m])) - sum(rate(api_requests_total{status_code=~"5.."}[5m]))) / clamp_min(sum(rate(api_requests_total[5m])), 0.000001)' 'percent' 2 '' @{ mode='absolute'; steps=@(@{color='red';value=$null},@{color='yellow';value=99},@{color='green';value=99.9}) } 'api_requests_total')
$p += (Stat 2 4 0 4 4 'Request volume' 'sum(increase(api_requests_total[$__range]))' 'short' 0)
$p += (Stat 3 8 0 4 4 'Success rate' '100 * sum(rate(api_requests_total{status_code!~"4..|5.."}[5m])) / clamp_min(sum(rate(api_requests_total[5m])), 0.000001)' 'percent' 2 '' @{ mode='absolute'; steps=@(@{color='red';value=$null},@{color='yellow';value=95},@{color='green';value=99}) })
$p += (Stat 4 12 0 4 4 '5xx error rate' '100 * sum(rate(api_requests_total{status_code=~"5.."}[5m])) / clamp_min(sum(rate(api_requests_total[5m])), 0.000001)' 'percent' 2)
$p += (Stat 5 16 0 4 4 'P95 latency' 'histogram_quantile(0.95, sum by (le) (rate(api_request_duration_seconds_bucket[5m])))' 's' 3 '' @{ mode='absolute'; steps=@(@{color='green';value=$null},@{color='yellow';value=0.5},@{color='red';value=1}) })
$p += (Stat 6 20 0 4 4 'Services breaching SLOs' "count(count by (service) ($breachingSlos)) or vector(0)" 'short' 0 '' @{ mode='absolute'; steps=@(@{color='green';value=$null},@{color='red';value=1}) })

$p += (BarGauge 7 0 4 12 8 'Top failing APIs' 'topk(5, sum by (route) (increase(api_requests_total{status_code=~"5.."}[$__range])))' '{{route}}')
$p += (BarGauge 8 12 4 12 8 'Services breaching SLOs' $breachingSlos '{{service}} — {{slo}}')
$p += (Timeseries 9 0 12 12 8 'Request volume over time' @(@{ expr='sum(rate(api_requests_total[$__rate_interval]))'; legend='req/s' }) 'reqps')
$p += (Timeseries 10 12 12 12 8 'P95 latency over time' @(@{ expr='histogram_quantile(0.95, sum by (le) (rate(api_request_duration_seconds_bucket[$__rate_interval])))'; legend='P95' }) 's')
$p += (Logs 11 0 20 24 8 'Executive log stream' '{service_name="nestjs-observability-demo"} | json | level=~"error|warn"')

$dash = New-Dash 'tab-executive-overview' 'API Executive Overview' 'Tab: Executive view — availability, volume, success rate, 5xx, P95, top failing APIs, and service-level SLO status.' $p @('nestjs','observability','tabs','executive')
Save-DashJson $dash '08-api-executive-overview.json'

# --- 9. Metric Discovery and Lineage ---
$lineageFilter = 'metric_lineage_info{metric_name=~"$metric",display_name=~"$display",family=~"$family",datasource=~"$datasource",source_api=~"$source_api"}'
$discoveryVars = @(
  (QueryVar 'metric' 'Metric name' 'label_values(metric_lineage_info, metric_name)'),
  (QueryVar 'display' 'Display name' 'label_values(metric_lineage_info, display_name)'),
  (QueryVar 'family' 'Family' 'label_values(metric_lineage_info, family)'),
  (QueryVar 'datasource' 'Data source' 'label_values(metric_lineage_info, datasource)'),
  (QueryVar 'source_api' 'Source API' 'label_values(metric_lineage_info, source_api)'),
  (QueryVar 'log_event' 'Log event' 'label_values(metric_lineage_info{metric_name=~"$metric"}, log_event)'),
  (QueryVar 'span_name' 'Span name' 'label_values(metric_lineage_info{metric_name=~"$metric"}, span_name)')
)
$p = @()
$p += (TextPanel 1 0 0 24 5 'How to use deep metric discovery' @"
Search and filter the lineage catalog with the variables above (metric name, display name, family, data source, source API). Column filters on the table also work.

**Lineage fields:** metric name, source API, Grafana data source (mimir / loki / tempo), origin file, series family (Prometheus series or simulated store — not a SQL table in this lab), labels/tags, related log event, span name.

**Drill-down:** pick a metric, then use live series, related logs, and related traces. Click TraceID on a log line to open Tempo. KPI panels on other tabs have a **Lineage** panel link.

JSON search API: ``GET /api/observability/catalog?q=timeout``
"@)
$p += (Row 10 5 'Lineage catalog')
$p += (Table 11 0 6 24 12 'Searchable metric lineage' $lineageFilter 'Filterable metadata from metric_lineage_info. Each row traces a displayed signal back to its origin.')
$p += (Row 20 18 'Live series (Mimir)')
$p += (Table 21 0 19 24 10 'Underlying Prometheus series' '{__name__=~"$metric($|_bucket|_sum|_count)",job="nestjs-observability-demo"}' 'Raw series and labels for the selected metric. Histogram families include _bucket, _sum, and _count.')
$p += (Timeseries 22 0 29 24 7 'Selected metric rate' @(@{ expr='sum by (__name__) (rate({__name__=~"$metric($|_sum|_count)",job="nestjs-observability-demo"}[$__rate_interval]))'; legend='{{__name__}}' }) 'ops' 'line' 'none' 'Rate of the selected metric family. Choose a specific metric name for a focused view.')
$p += (Row 30 36 'Related records')
$p += (Logs 31 0 37 12 10 'Related logs' '{service_name="nestjs-observability-demo"} | json | event=~"$log_event"' 'Loki records for the selected log_event. These are the underlying log rows.')
$p += (Traces 32 12 37 12 10 'Related traces' '{ resource.service.name = "nestjs-observability-demo" && name =~ "$span_name" }' 'Tempo spans matching the selected span_name. Open a row to inspect the full checkout hierarchy.')

$dash = New-Dash 'tab-metric-discovery' 'Metric Discovery and Lineage' 'Tab: Deep metric discovery, data lineage, and drill-down to series, logs, and traces.' $p @('nestjs','observability','tabs','lineage') $discoveryVars
Save-DashJson $dash '09-metric-discovery.json'

# Remove old dashboard files that used previous UIDs
@(
  'api-request-metrics.json',
  'api-executive-telemetry.json'
) | ForEach-Object {
  $path = Join-Path $outDir $_
  if (Test-Path $path) { Remove-Item $path -Force }
}

Get-ChildItem $outDir | Select-Object Name, Length
