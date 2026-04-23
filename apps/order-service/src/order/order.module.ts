import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { OrderEntity } from './entities/order.entity';
import { OrderTariffSnapshotEntity } from './entities/order-tariff-snapshot.entity';
import { OutboxEventEntity } from './entities/outbox-event.entity';
import { OrderStatusHistoryEntity } from './entities/order-status-history.entity';
import { CargoEntity } from './entities/cargo.entity';
import { DocumentEntity } from './entities/document.entity';
import { InvoiceEntity } from './entities/invoice.entity';
import { OrderService } from './order.service';
import { OrderGrpcController } from './order.grpc.controller';
import { OrderHttpController } from './order.http.controller';
import { OutboxProcessor } from './outbox/outbox.processor';
import { CounterpartyModule } from '../counterparty/counterparty.module';
import { RoutingModule } from '../routing/routing.module';
import { InvoiceModule } from './invoice.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrderEntity, OrderTariffSnapshotEntity, OutboxEventEntity, OrderStatusHistoryEntity, CargoEntity, DocumentEntity, InvoiceEntity]),
    CounterpartyModule,
    RoutingModule,
    InvoiceModule,

    // Kafka client for OutboxProcessor to publish events
    ClientsModule.registerAsync([
      {
        name: 'KAFKA_CLIENT',
        inject: [ConfigService],
        useFactory: (cfg: ConfigService) => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: 'order-service-producer',
              brokers: [cfg.get('KAFKA_BROKER', 'kafka:9092')],
            },
            producer: {
              allowAutoTopicCreation: false,
              idempotent: true,
              maxInFlightRequests: 1,
            },
          },
        }),
      },
    ]),
  ],
  controllers: [OrderGrpcController, OrderHttpController],
  providers: [OrderService, OutboxProcessor],
})
export class OrderModule {}