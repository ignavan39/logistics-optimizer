import { Module, Global, type DynamicModule } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { UserRole, Role, RolePermission, Permission } from '../roles/entities';
import { ApiKey, User, RefreshToken, Session } from '../users/entities';

const ENTITIES = [ApiKey, UserRole, Role, RolePermission, User, Session, RefreshToken, Permission];

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
              host: configService.get('AUTH_DB_HOST', 'pg-auth'),
              port: configService.get<number>('PG_PORT_BASE', 5432),
              username: configService.get('PG_USER', 'logistics'),
              password: configService.get('PG_PASSWORD', 'logistics_secret'),
              database: configService.get('AUTH_DB_NAME', 'auth_db'),
              entities: ENTITIES,
              namingStrategy: new SnakeNamingStrategy(),
              synchronize: false,
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