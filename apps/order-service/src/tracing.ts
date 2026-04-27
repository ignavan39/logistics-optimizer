/**
 * OpenTelemetry instrumentation — must be imported BEFORE NestJS bootstrap.
 * Instruments: HTTP, gRPC, PostgreSQL, KafkaJS automatically.
 */
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { SimpleSpanProcessor, type SpanProcessor } from '@opentelemetry/sdk-trace-node';

const exporter = new OTLPTraceExporter({
  url: process.env['JAEGER_ENDPOINT'] ?? 'http://jaeger:4318/v1/traces',
});

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'order-service',
    [SemanticResourceAttributes.SERVICE_VERSION]: '0.0.1',
    [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]:
      process.env['NODE_ENV'] ?? 'development',
  }),
  spanProcessor: new SimpleSpanProcessor(exporter) as SpanProcessor,
});

sdk.start();

process.on('SIGTERM', () => {
  sdk
    .shutdown()
    .then(() => { console.log('Tracing terminated'); })
    .catch((err: unknown) => { console.error('Error terminating tracing', err); });
});
