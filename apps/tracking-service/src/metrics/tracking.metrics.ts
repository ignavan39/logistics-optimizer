import { Injectable } from '@nestjs/common';
import { Counter, Gauge, Histogram, Registry } from 'prom-client';

@Injectable()
export class TrackingMetrics {
  readonly messagesReceived: Counter<string>;
  readonly telemetryInserted: Counter<string>;
  readonly batchFlushErrors: Counter<string>;
  readonly telemetryLag: Histogram<string>;
  readonly batchFlushDuration: Histogram<string>;
  readonly batchFlushSize: Histogram<string>;
  readonly batchQueueSize: Gauge<string>;
  readonly activeStreamSubscribers: Gauge<string>;

  constructor(private readonly registry: Registry) {
    this.messagesReceived = new Counter({
      name: 'tracking_messages_received_total',
      help: 'Total Kafka messages received by tracking service',
      labelNames: ['topic'],
      registers: [registry],
    });

    this.telemetryInserted = new Counter({
      name: 'tracking_telemetry_inserted_total',
      help: 'Total telemetry points successfully written to PostgreSQL',
      registers: [registry],
    });

    this.batchFlushErrors = new Counter({
      name: 'tracking_batch_flush_errors_total',
      help: 'Total batch flush failures (data loss events)',
      registers: [registry],
    });

    this.telemetryLag = new Histogram({
      name: 'tracking_telemetry_lag_ms',
      help: 'Lag between GPS recording time and service receive time (ms)',
      buckets: [10, 50, 100, 200, 500, 1000, 2000, 5000],
      registers: [registry],
    });

    this.batchFlushDuration = new Histogram({
      name: 'tracking_batch_flush_duration_ms',
      help: 'Time to flush a batch to PostgreSQL (ms)',
      buckets: [5, 10, 20, 50, 100, 200, 500],
      registers: [registry],
    });

    this.batchFlushSize = new Histogram({
      name: 'tracking_batch_flush_size',
      help: 'Number of records per batch flush',
      buckets: [10, 50, 100, 200, 300, 400, 500],
      registers: [registry],
    });

    this.batchQueueSize = new Gauge({
      name: 'tracking_batch_queue_size',
      help: 'Current in-memory queue size (backpressure indicator)',
      registers: [registry],
    });

    this.activeStreamSubscribers = new Gauge({
      name: 'tracking_active_stream_subscribers',
      help: 'Active gRPC bidirectional stream connections',
      registers: [registry],
    });
  }
}
