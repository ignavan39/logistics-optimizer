import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { User, Role, Permission, UserRole, RolePermission, Session, ApiKey, RefreshToken } from './auth/entities';

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
        host: cfg.get('AUTH_DB_HOST', 'pgbouncer-auth'),
        port: cfg.get<number>('PGBOUNCER_PORT', 6432),
        username: cfg.get('PG_USER', 'logistics'),
        password: cfg.get('PG_PASSWORD', 'logistics_secret'),
        database: cfg.get('AUTH_DB_NAME', 'auth_db'),
        entities: [User, Role, Permission, UserRole, RolePermission, Session, ApiKey, RefreshToken],
        synchronize: false,
        logging: cfg.get('NODE_ENV') === 'development',
        extra: {
          max: 10,
          connectionTimeoutMillis: 5000,
          statement_timeout: 10000,
        },
      }),
    }),
    AuthModule,
  ],
})
export class AppModule {}