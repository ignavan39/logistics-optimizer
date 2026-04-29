import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { Registry } from 'prom-client'
import { TrackingGrpcController } from './tracking/tracking.grpc.controller'
import { TelemetryConsumer } from './tracking/telemetry.consumer'
import { TrackingBatchWriter } from './tracking/batch/tracking-batch-writer'
import { TrackingMetrics } from './metrics/tracking.metrics'
import { RetentionService } from './tracking/retention.service'
import { DatabaseModule } from './database/database.module'

const PROMETHEUS_REGISTRY = new Registry()

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    DatabaseModule.forRoot(),
  ],
  controllers: [TrackingGrpcController],
  providers: [
    TelemetryConsumer,
    TrackingBatchWriter,
    { provide: TrackingMetrics, useValue: new TrackingMetrics(PROMETHEUS_REGISTRY) },
    RetentionService,
    { provide: Registry, useValue: PROMETHEUS_REGISTRY },
  ],
})
export class AppModule {}