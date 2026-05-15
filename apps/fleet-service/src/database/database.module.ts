import { Module, Global, type DynamicModule } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { VehicleEntity } from '../entities/vehicle.entity';

@Global()
@Module({})
export class DatabaseModule {
  static forRoot(): DynamicModule {
    return {
      module: DatabaseModule,
      providers: [
        {
          provide: DataSource,
          useFactory: async (cfg: ConfigService): Promise<DataSource> => {
            const dataSource = new DataSource({
              type: 'postgres',
              host: cfg.get('FLEET_DB_HOST', 'pg-fleet'),
              port: cfg.get<number>('PG_PORT_BASE', 5432),
              username: cfg.get('PG_USER', 'logistics'),
              password: cfg.get('PG_PASSWORD', 'logistics_secret'),
              database: cfg.get('FLEET_DB_NAME', 'fleet_db'),
              entities: [VehicleEntity],
              synchronize: false,
              logging: cfg.get('NODE_ENV') === 'development',
              extra: {
                max: 10,
                connectionTimeoutMillis: 5000,
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
