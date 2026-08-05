import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { NodeSDK } from '@opentelemetry/sdk-node';

const otlpEndpoint = (process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://alloy:4318').replace(/\/$/, '');

const telemetrySdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ?? `${otlpEndpoint}/v1/traces`,
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
  ],
});

telemetrySdk.start();

process.once('SIGTERM', () => {
  void telemetrySdk.shutdown();
});
