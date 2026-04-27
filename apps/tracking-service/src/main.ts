// import './tracing';

import { NestFactory } from '@nestjs/core';
import { type MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

const logger = new Logger('Bootstrap');

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'tracking',
      protoPath: '/app/libs/proto/src/tracking.proto',
      url: `0.0.0.0:${process.env['GRPC_TRACKING_PORT'] ?? 50054}`,
    },
  });

  
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: 'tracking-service',
        brokers: [process.env['KAFKA_BROKER'] ?? 'kafka:9092'],
      },
      consumer: {
        groupId: `${process.env['KAFKA_GROUP_ID_PREFIX'] ?? 'logistics'}.tracking-service`,
        // Backpressure tuning
        sessionTimeout: 60_000,
        heartbeatInterval: 5_000,
        maxBytesPerPartition: 5_242_880,      // 5MB per partition per fetch
        maxWaitTimeInMs: 200,                  // max wait before returning if no data
        minBytes: 1,
        maxBytes: 52_428_800,                  // 50MB per fetch total
      },
    },
  });

  await app.startAllMicroservices();
  await app.listen(process.env['HTTP_METRICS_PORT'] ?? 9464);

  logger.log('Tracking Service started');
  logger.log(`gRPC on :${process.env['GRPC_TRACKING_PORT'] ?? 50054}`);
}

bootstrap().catch((err) => {
  logger.error('Fatal error', err);
  process.exit(1);
});
