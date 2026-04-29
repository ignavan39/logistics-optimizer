import { Module, Inject } from '@nestjs/common';
import { ClientsModule, Transport, ClientGrpc, ClientKafka } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { InvoiceEntity } from './entities/invoice.entity';
import { InvoiceService } from './invoice.service';
import { InvoiceGrpcController } from './invoice.grpc.controller';
import { InvoiceEventHandler } from './invoice-event-handler';
import { PdfController } from './pdf.controller';
import { PdfService } from './pdf.service';
import { S3StorageService } from './s3-storage.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([InvoiceEntity]),
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
            url: configService.get('GRPC_COUNTERPARTY_HOST', 'counterparty-service:50056'),
          },
        }),
      },
    ]),
  ],
  controllers: [InvoiceGrpcController, PdfController],
  providers: [
    {
      provide: DataSource,
      useFactory: async () => {
        const isProduction = process.env.NODE_ENV === 'production';
        const dataSource = new DataSource({
          type: 'postgres',
          host: process.env.INVOICE_DB_HOST || 'pg-invoice',
          port: parseInt(process.env.PG_PORT_BASE || '5432'),
          username: process.env.PG_USER || 'logistics',
          password: process.env.PG_PASSWORD || 'logistics_secret',
          database: process.env.INVOICE_DB_NAME || 'logistics_invoices',
          entities: [InvoiceEntity],
          synchronize: !isProduction,
          logging: !isProduction,
        });

        await dataSource.initialize();
        return dataSource;
      },
    },
    {
      provide: 'INVOICE_REPOSITORY',
      useFactory: (dataSource: DataSource) => {
        return dataSource.getRepository(InvoiceEntity);
      },
      inject: [DataSource],
    },
    InvoiceService,
    {
      provide: S3StorageService,
      useFactory: (configService: ConfigService) => new S3StorageService(configService),
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
      ) => new PdfService(dataSource, s3Storage, configService, orderGrpc, counterpartyGrpc),
      inject: [DataSource, S3StorageService, ConfigService, 'ORDER_PACKAGE', 'COUNTERPARTY_PACKAGE'],
    },
    InvoiceEventHandler,
  ],
  exports: [InvoiceService, PdfService],
})
export class InvoiceModule {}