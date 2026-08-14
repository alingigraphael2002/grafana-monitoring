const assert = require('node:assert/strict');
const test = require('node:test');
const { metricCatalog, searchMetricCatalog } = require('../dist/metric-catalog');

test('metric catalog covers request timeout lineage', () => {
  const hits = searchMetricCatalog({ q: 'timeout' });
  assert.ok(hits.length >= 1);
  assert.ok(hits.some((entry) => entry.metric_name === 'api_request_timeouts_total'));
});

test('metric catalog can filter by datasource and metric name', () => {
  const mimir = searchMetricCatalog({ datasource: 'mimir' });
  const kafka = searchMetricCatalog({ q: 'kafka' });
  const requests = searchMetricCatalog({ metric: 'api_requests_total' });
  assert.ok(mimir.length > 0);
  assert.ok(kafka.some((entry) => entry.display_name.toLowerCase().includes('kafka')));
  assert.ok(requests.every((entry) => entry.metric_name === 'api_requests_total'));
  assert.ok(metricCatalog.length >= 20);
});
