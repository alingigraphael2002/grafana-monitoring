const assert = require('node:assert/strict');
const test = require('node:test');
const { boundedDecimal, boundedInteger } = require('../dist/numeric-utils');

test('boundedDecimal preserves monetary precision', () => {
  assert.equal(boundedDecimal(149.95, 99.99, 1_000_000), 149.95);
  assert.equal(boundedDecimal('79.50', 99.99, 1_000_000), 79.5);
});

test('boundedDecimal applies fallback and maximum bounds', () => {
  assert.equal(boundedDecimal('invalid', 99.99, 1_000_000), 99.99);
  assert.equal(boundedDecimal(-1, 99.99, 1_000_000), 99.99);
  assert.equal(boundedDecimal(2_000_000, 99.99, 1_000_000), 1_000_000);
});

test('boundedInteger rounds bounded values', () => {
  assert.equal(boundedInteger(2.4, 1, 100), 2);
  assert.equal(boundedInteger(2.6, 1, 100), 3);
});

test('monitoring endpoints are excluded from API telemetry', () => {
  const { RequestObservabilityMiddleware } = require('../dist/request-observability.middleware');
  const middleware = new RequestObservabilityMiddleware({});
  let nextCalls = 0;

  middleware.use(
    { originalUrl: '/metrics?format=prometheus', url: '/metrics', path: '/' },
    {},
    () => { nextCalls += 1; },
  );

  assert.equal(nextCalls, 1);
});

test('request-start log preserves the original request path', () => {
  const { RequestObservabilityMiddleware } = require('../dist/request-observability.middleware');
  const middleware = new RequestObservabilityMiddleware({
    active: { inc() {} },
  });
  const response = {
    setHeader() {},
    on() {},
  };
  const lines = [];
  const originalLog = console.log;
  console.log = (line) => lines.push(String(line));

  try {
    middleware.use(
      {
        headers: {},
        method: 'GET',
        originalUrl: '/api/hello?name=audit',
        url: '/api/hello?name=audit',
        path: '/',
      },
      response,
      () => {},
    );
  } finally {
    console.log = originalLog;
  }

  assert.equal(JSON.parse(lines[0]).path, '/api/hello?name=audit');
});
