import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { OrderEntity } from './entities/order.entity';
import { OutboxEventEntity } from './entities/outbox-event.entity';
import { OrderService } from './order.service';
import { OrderGrpcController } from './order.grpc.controller';
import { OrderHttpController } from './order.http.controller';
import { OutboxProcessor } from './outbox/outbox.processor';

@Module({
  imports: [
    TypeOrmModule.forFeature([OrderEntity, OutboxEventEntity]),

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
              idempotent: true,           // exactly-once producer
              maxInFlightRequests: 1,      // required for idempotent producer
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
