import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {OrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { DispatchSagaService } from './dispatch-saga.service';
import { DispatcherGrpcController } from './dispatcher.grpc.controller';
import { OrderEventsConsumer } from './order-events.consumer';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres',
        host: cfg.get('DISPATCHER_DB_HOST', 'pg-dispatcher'),
        port: cfg.get<number>('PG_PORT_BASE', 5432),
        username: cfg.get('PG_USER', 'logistics'),
        password: cfg.get('PG_PASSWORD', 'logistics_secret'),
        database: cfg.get('DISPATCHER_DB_NAME', 'dispatcher_db'),
        synchronize: false,
        logging: cfg.get('NODE_ENV') === 'development',
        extra: {
          max: 10,
          connectionTimeoutMillis: 5000,
        },
      }),
    }),
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