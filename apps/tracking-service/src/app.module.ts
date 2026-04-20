import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { TrackingGrpcController } from './tracking/tracking.grpc.controller'
import { TelemetryConsumer } from './tracking/telemetry.consumer'
import { TrackingBatchWriter } from './tracking/batch/tracking-batch-writer'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres',
        host: cfg.get('TRACKING_DB_HOST', 'pgbouncer-tracking'),
        port: cfg.get<number>('PGBOUNCER_PORT', 6432),
        username: cfg.get('PG_USER', 'logistics'),
        password: cfg.get('PG_PASSWORD', 'logistics_secret'),
        database: cfg.get('TRACKING_DB_NAME', 'tracking_db'),
        synchronize: false,
        logging: cfg.get('NODE_ENV') === 'development',
        extra: {
          max: 10,
          connectionTimeoutMillis: 5000,
          statement_timeout: 10000,
        },
      }),
    }),
  ],
  controllers: [TrackingGrpcController],
  providers: [TelemetryConsumer, TrackingBatchWriter],
})
export class AppModule {}