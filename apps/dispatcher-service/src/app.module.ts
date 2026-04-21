import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DispatchSagaService } from './dispatch-saga.service';
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
  ],
  providers: [DispatchSagaService, OrderEventsConsumer],
})
export class AppModule {}