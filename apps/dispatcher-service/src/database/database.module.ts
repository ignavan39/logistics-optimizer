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
          useFactory: async (configService: ConfigService): Promise<DataSource> => {
            const dataSource = new DataSource({
              type: 'postgres',
              host: configService.get('DISPATCHER_DB_HOST', 'pg-dispatcher'),
              port: configService.get<number>('PG_PORT_BASE', 5432),
              username: configService.get('PG_USER', 'logistics'),
              password: configService.get('PG_PASSWORD', 'logistics_secret'),
              database: configService.get('DISPATCHER_DB_NAME', 'dispatcher_db'),
              synchronize: configService.get('NODE_ENV') !== 'production',
              logging: configService.get('NODE_ENV') === 'development',
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