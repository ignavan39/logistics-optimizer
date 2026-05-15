import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

const logger = new Logger('Bootstrap');

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: 'dispatcher-service',
        brokers: [process.env['KAFKA_BROKER'] ?? 'kafka:9092'],
      },
      consumer: {
        groupId: `${process.env['KAFKA_GROUP_ID_PREFIX'] ?? 'logistics'}.dispatcher-service`,
        sessionTimeout: 30_000,
        heartbeatInterval: 3_000,
      },
    },
  });

  await app.startAllMicroservices();
  await app.listen(process.env['HTTP_METRICS_PORT'] ?? 9464);

  logger.log('Dispatcher Service started');
}

bootstrap().catch((err) => {
  logger.error('Fatal error', err);
  process.exit(1);
});