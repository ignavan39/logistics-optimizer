import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { DispatchSagaService } from './dispatch-saga.service';
import { DispatcherGrpcController } from './dispatcher.grpc.controller';
import { OrderEventsConsumer } from './order-events.consumer';
import { DatabaseModule } from './database/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    DatabaseModule.forRoot(),
    ClientsModule.registerAsync([
      {
        name: 'FLEET_SERVICE',
        useFactory: (cfg: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            url: `${cfg.get('GRPC_FLEET_HOST', 'fleet-service:50052')}:50052`,
            package: 'fleet',
            protoPath: '/app/libs/proto/src/fleet.proto',
          },
        }),
        inject: [ConfigService],
      },
      {
        name: 'ROUTING_SERVICE',
        useFactory: (cfg: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            url: `${cfg.get('GRPC_ROUTING_HOST', 'routing-service:50053')}:50053`,
            package: 'routing',
            protoPath: '/app/libs/proto/src/routing.proto',
          },
        }),
        inject: [ConfigService],
      },
      {
        name: 'ORDER_SERVICE',
        useFactory: (cfg: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            url: `${cfg.get('GRPC_ORDER_HOST', 'order-service:50051')}:50051`,
            package: 'order',
            protoPath: '/app/libs/proto/src/order.proto',
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  providers: [DispatchSagaService, DispatcherGrpcController, OrderEventsConsumer],
})
export class AppModule {}