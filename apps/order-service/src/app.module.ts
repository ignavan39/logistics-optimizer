import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { OrderModule } from './order/order.module'
import { OrderEntity } from './order/entities/order.entity'
import { OutboxEventEntity } from './order/entities/outbox-event.entity'

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
        host: cfg.get('ORDER_DB_HOST', 'pg-order'),
        port: cfg.get<number>('PG_PORT_BASE', 5432),
        username: cfg.get('PG_USER', 'logistics'),
        password: cfg.get('PG_PASSWORD', 'logistics_secret'),
        database: cfg.get('ORDER_DB_NAME', 'order_db'),
        entities: [OrderEntity, OutboxEventEntity],
        migrations: [__dirname + '/migrations/*.{ts,js}'],
        migrationsRun: true,
        synchronize: true,
        logging: cfg.get('NODE_ENV') === 'development',
        extra: {
          max: 10,
          connectionTimeoutMillis: 5_000,
          query_timeout: 10_000,
        },
      }),
    }),

    OrderModule,
  ]
})
export class AppModule { }
