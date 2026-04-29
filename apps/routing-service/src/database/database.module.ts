import { Module, Global, type DynamicModule } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';

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
              host: cfg.get('ROUTING_DB_HOST', 'pg-routing'),
              port: cfg.get<number>('PG_PORT_BASE', 5432),
              username: cfg.get('PG_USER', 'logistics'),
              password: cfg.get('PG_PASSWORD', 'logistics_secret'),
              database: cfg.get('ROUTING_DB_NAME', 'routing_db'),
              entities: [__dirname + '/**/*.entity{.ts,.js}'],
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
