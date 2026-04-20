import { Controller, Logger } from '@nestjs/common';
import { EventPattern, Payload, Ctx, KafkaContext } from '@nestjs/microservices';
import { TrackingBatchWriter } from './batch/tracking-batch-writer';
import { TrackingMetrics } from '../metrics/tracking.metrics';

export interface TelemetryMessage {
  vehicle_id: string;
  lat: number;
  lng: number;
  speed_kmh: number;
  heading_deg: number;
  accuracy_m: number;
  recorded_at_unix: number;
  metadata?: Record<string, string>;
}

@Controller()
export class TelemetryConsumer {
  private readonly logger = new Logger(TelemetryConsumer.name);

  constructor(
    private readonly batchWriter: TrackingBatchWriter,
    private readonly metrics: TrackingMetrics,
  ) {}

  @EventPattern('vehicle.telemetry')
  async handleTelemetry(
    @Payload() data: TelemetryMessage,
    @Ctx() ctx: KafkaContext,
  ): Promise<void> {
    const receiveTime = Date.now();

    // Lag = время от записи GPS до получения сервисом
    const recordedAt = data.recorded_at_unix * 1000;
    const lagMs = receiveTime - recordedAt;

    this.metrics.telemetryLag.observe(lagMs);
    this.metrics.messagesReceived.inc({ topic: 'vehicle.telemetry' });

    // Backpressure: если batch writer перегружен — pause partition
    if (this.batchWriter.isOverloaded()) {
      const consumer = ctx.getConsumer();
      const { topic, partition } = ctx.getMessage() as { topic: string; partition: number };

      this.logger.warn(
        `Backpressure activated: pausing partition ${partition} — queue size ${this.batchWriter.queueSize}`,
      );

      consumer.pause([{ topic, partitions: [partition] }]);

      // Resume after batch flushes
      this.batchWriter.onNextFlush(() => {
        consumer.resume([{ topic, partitions: [partition] }]);
        this.logger.log(`Partition ${partition} resumed`);
      });
    }

    // Enqueue for batch write (non-blocking)
    await this.batchWriter.enqueue({
      vehicleId: data.vehicle_id,
      lat: data.lat,
      lng: data.lng,
      speedKmh: data.speed_kmh ?? 0,
      headingDeg: data.heading_deg ?? 0,
      accuracyM: data.accuracy_m ?? 0,
      recordedAt: new Date(data.recorded_at_unix * 1000),
    });
  }
}
