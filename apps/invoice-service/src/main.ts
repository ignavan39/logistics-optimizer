import './tracing';

import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app/app.module';

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
      package: 'invoice',
      protoPath: '/app/libs/proto/src/invoice.proto',
      url: `0.0.0.0:${process.env['GRPC_INVOICE_PORT'] ?? 50052}`,
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
        clientId: 'invoice-service',
        brokers: [process.env['KAFKA_BROKER'] ?? 'kafka:9092'],
        retry: {
          retries: 10,
          initialRetryTime: 300,
          factor: 1.5,
        },
      },
      consumer: {
        groupId: `${process.env['KAFKA_GROUP_ID_PREFIX'] ?? 'logistics'}.invoice-service`,
        sessionTimeout: 30_000,
        heartbeatInterval: 3_000,
      },
      subscribe: {
        fromBeginning: false,
      },
    },
  });

  await app.startAllMicroservices();

  const httpPort = process.env['HTTP_PORT'] ?? 3012;
  const httpHost = process.env['HTTP_HOST'] ?? '0.0.0.0';
  await app.listen(httpPort, httpHost);

  logger.log(`Invoice Service started`);
  logger.log(`gRPC listening on :${process.env['GRPC_INVOICE_PORT'] ?? 50052}`);
  logger.log(`Metrics on http://0.0.0.0:${httpPort}/metrics`);
}

bootstrap().catch((err) => {
  logger.error('Fatal bootstrap error', err);
  process.exit(1);
});