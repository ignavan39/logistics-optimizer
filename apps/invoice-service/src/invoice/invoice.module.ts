import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport, ClientKafka } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { InvoiceEntity } from './entities/invoice.entity';
import { InvoiceService } from './invoice.service';
import { InvoiceGrpcController } from './invoice.grpc.controller';
import { InvoiceEventHandler } from './invoice-event-handler';

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
    ]),
  ],
  controllers: [InvoiceGrpcController],
  providers: [InvoiceService, InvoiceEventHandler],
  exports: [InvoiceService],
})
export class InvoiceModule {}