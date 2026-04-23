import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { OrderModule } from './order/order.module'
import { OrderEntity } from './order/entities/order.entity'
import { OrderTariffSnapshotEntity } from './order/entities/order-tariff-snapshot.entity'
import { OutboxEventEntity } from './order/entities/outbox-event.entity'
import { OrderStatusHistoryEntity } from './order/entities/order-status-history.entity'
import { CargoEntity } from './order/entities/cargo.entity'
import { DocumentEntity } from './order/entities/document.entity'
import { InvoiceEntity } from './order/entities/invoice.entity'
import { SettingEntity } from './order/entities/setting.entity'
import { CounterpartyModule } from './counterparty/counterparty.module'
import { RoutingModule } from './routing/routing.module'

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
        entities: [OrderEntity, OrderTariffSnapshotEntity, OutboxEventEntity, OrderStatusHistoryEntity, CargoEntity, DocumentEntity, InvoiceEntity, SettingEntity],
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
    CounterpartyModule,
    RoutingModule,
  ]
})
export class AppModule { }
