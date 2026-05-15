import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { OrderService } from './order.service';
import { OrderGrpcController } from './order.grpc.controller';
import { OrderHttpController } from './order.http.controller';
import { OutboxProcessor } from './outbox/outbox.processor';
import { CounterpartyModule } from '../counterparty/counterparty.module';
import { RoutingModule } from '../routing/routing.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    CounterpartyModule,
    RoutingModule,
    SettingsModule,

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