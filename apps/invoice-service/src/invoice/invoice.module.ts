import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport, ClientKafka, ClientGrpc } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { KafkaUtilsModule } from '@logistics/kafka-utils';
import { InvoiceEntity } from './entities/invoice.entity';
import { InvoiceService } from './invoice.service';
import { InvoiceGrpcController } from './invoice.grpc.controller';
import { InvoiceEventHandler } from './invoice-event-handler';

@Module({
  imports: [
    TypeOrmModule.forFeature([InvoiceEntity]),
    KafkaUtilsModule,
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
  controllers: [InvoiceGrpcController],
  providers: [InvoiceService, InvoiceEventHandler],
  exports: [InvoiceService],
})
export class InvoiceModule {}