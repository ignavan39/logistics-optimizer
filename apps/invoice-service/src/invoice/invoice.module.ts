import { Module } from '@nestjs/common';
import { ClientsModule, Transport, ClientKafka, ClientGrpc } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { InvoiceService } from './invoice.service';
import { InvoiceGrpcController } from './invoice.grpc.controller';
import { InvoiceEventHandler } from './invoice-event-handler';
import { PdfController } from './pdf.controller';
import { PdfService } from './pdf.service';
import { S3StorageService } from './s3-storage.service';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'ORDER_PACKAGE',
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'order',
            protoPath: '/app/libs/proto/src/order.proto',
            url: configService.get('GRPC_ORDER_HOST', 'order-service:50051'),
          },
        }),
      },
      {
        name: 'KAFKA_CLIENT',
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: 'invoice-service-consumer',
              brokers: [configService.get('KAFKA_BROKER', 'kafka:9092')],
            },
            consumer: {
              groupId: `${configService.get('KAFKA_GROUP_ID_PREFIX', 'logistics')}.invoice-service`,
            },
          },
        }),
      },
      {
        name: 'COUNTERPARTY_PACKAGE',
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'counterparty',
            protoPath: '/app/libs/proto/src/counterparty.proto',
            url: configService.get('GRPC_COUNTERPARTY_HOST', 'counterparty-service:50057'),
          },
        }),
      },
    ]),
  ],
  controllers: [InvoiceGrpcController, PdfController],
  providers: [
    InvoiceService,
    InvoiceEventHandler,
    S3StorageService,
    {
      provide: DataSource,
      useFactory: async (configService: ConfigService) => {
        const dataSource = new DataSource({
          type: 'postgres',
          host: configService.get('DB_HOST', 'pg-invoice'),
          port: configService.get<number>('DB_PORT', 5432),
          database: configService.get('DB_NAME', 'logistics_invoices'),
          username: configService.get('DB_USER', 'logistics'),
          password: configService.get('DB_PASS', 'logistics_secret'),
        });
        await dataSource.initialize();
        return dataSource;
      },
      inject: [ConfigService],
    },
    {
      provide: PdfService,
      useFactory: (
        dataSource: DataSource,
        s3Storage: S3StorageService,
        configService: ConfigService,
        orderGrpc: ClientGrpc,
        counterpartyGrpc: ClientGrpc,
      ) =>
        new PdfService(dataSource, s3Storage, configService, orderGrpc, counterpartyGrpc),
      inject: [DataSource, S3StorageService, ConfigService, 'ORDER_PACKAGE', 'COUNTERPARTY_PACKAGE'],
    },
  ],
  exports: [InvoiceService, PdfService],
})
export class InvoiceModule {}