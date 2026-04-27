import { Module, Global, type DynamicModule } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { OrderEntity } from '../order/entities/order.entity';
import { OrderTariffSnapshotEntity } from '../order/entities/order-tariff-snapshot.entity';
import { OutboxEventEntity } from '../order/entities/outbox-event.entity';
import { OrderStatusHistoryEntity } from '../order/entities/order-status-history.entity';
import { CargoEntity } from '../order/entities/cargo.entity';
import { DocumentEntity } from '../order/entities/document.entity';
import { SettingEntity } from '../settings/entities/setting.entity';

const ENTITIES = [
  OrderEntity,
  OrderTariffSnapshotEntity,
  OutboxEventEntity,
  OrderStatusHistoryEntity,
  CargoEntity,
  DocumentEntity,
  SettingEntity,
];

@Global()
@Module({})
export class DatabaseModule {
  static forRoot(): DynamicModule {
    return {
      module: DatabaseModule,
      providers: [
        {
          provide: DataSource,
          useFactory: async (configService: ConfigService): Promise<DataSource> => {
            const dataSource = new DataSource({
              type: 'postgres',
              host: configService.get('ORDER_DB_HOST', 'pg-order'),
              port: configService.get<number>('PG_PORT_BASE', 5432),
              username: configService.get('PG_USER', 'logistics'),
              password: configService.get('PG_PASSWORD', 'logistics_secret'),
              database: configService.get('ORDER_DB_NAME', 'order_db'),
              entities: ENTITIES,
              migrations: [__dirname + '/migrations/*.{ts,js}'],
              migrationsRun: true,
              synchronize: configService.get('NODE_ENV') !== 'production',
              logging: configService.get('NODE_ENV') === 'development',
              extra: {
                max: 10,
                connectionTimeoutMillis: 5000,
                query_timeout: 10000,
              },
            });

            await dataSource.initialize();
            return dataSource;
          },
          inject: [ConfigService],
        },
      ],
      exports: [DataSource],
    };
  }
}