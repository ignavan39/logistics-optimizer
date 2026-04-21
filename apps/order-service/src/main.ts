import './tracing';

import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

const logger = new Logger('Bootstrap');

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'order',
      protoPath: '/app/libs/proto/src/order.proto',
      url: `0.0.0.0:${process.env['GRPC_ORDER_PORT'] ?? 50051}`,
      loader: {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
      },
    },
  });

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: 'order-service',
        brokers: [process.env['KAFKA_BROKER'] ?? 'kafka:9092'],
        retry: {
          retries: 10,
          initialRetryTime: 300,
          factor: 1.5,
        },
      },
      consumer: {
        groupId: `${process.env['KAFKA_GROUP_ID_PREFIX'] ?? 'logistics'}.order-service`,
        sessionTimeout: 30_000,
        heartbeatInterval: 3_000,
        maxBytesPerPartition: 1_048_576, // 1MB
      },
      subscribe: {
        fromBeginning: false,
      },
    },
  });

  await app.startAllMicroservices();

  const httpPort = process.env['HTTP_PORT'] ?? 3011;
  const httpHost = process.env['HTTP_HOST'] ?? '0.0.0.0';
  await app.listen(httpPort, httpHost);

  logger.log(`Order Service started`);
  logger.log(`gRPC listening on :${process.env['GRPC_ORDER_PORT'] ?? 50051}`);
  logger.log(`Metrics on http://0.0.0.0:${httpPort}/metrics`);
}

bootstrap().catch((err) => {
  logger.error('Fatal bootstrap error', err);
  process.exit(1);
});
