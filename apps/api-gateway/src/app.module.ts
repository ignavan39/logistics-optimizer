import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { ThrottlerModule } from '@nestjs/throttler';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { AuthModule } from './auth/auth.module';
import { OrdersModule } from './orders/orders.module';
import { FleetModule } from './fleet/fleet.module';
import { RoutingModule } from './routing/routing.module';
import { TrackingModule } from './tracking/tracking.module';
import { DispatcherModule } from './dispatcher/dispatcher.module';
import { NotificationsModule } from './notifications/notifications.module';
import { CounterpartyModule } from './counterparty/counterparty.module';
import { InvoicesModule } from './invoices/invoices.module';
import { SettingsModule } from './settings/settings.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { AdminModule } from './admin/admin.module';
import { User } from './users/entities/user.entity';
import { Session } from './users/entities/session.entity';
import { ApiKey } from './users/entities/api-key.entity';
import { RefreshToken } from './users/entities/refresh-token.entity';
import { Role } from './roles/entities/role.entity';
import { Permission } from './roles/entities/permission.entity';
import { UserRole } from './roles/entities/user-role.entity';
import { RolePermission } from './roles/entities/role-permission.entity';
import { AuditLog } from './auth/entities/audit-log.entity';

const AUTH_ENTITIES = [User, Role, Permission, UserRole, RolePermission, Session, ApiKey, RefreshToken, AuditLog];

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'AUTH_DATA_SOURCE',
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const dataSource = new DataSource({
          type: 'postgres',
          host: configService.get('AUTH_DB_HOST', 'pg-auth'),
          port: +configService.get('PG_PORT_BASE', 5432),
          username: configService.get('PG_USER', 'logistics'),
          password: configService.get('PG_PASSWORD', 'logistics_secret'),
          database: configService.get('AUTH_DB_NAME', 'auth_db'),
          entities: AUTH_ENTITIES,
          synchronize: configService.get('NODE_ENV') === 'development',
          namingStrategy: new SnakeNamingStrategy(),
          logging: configService.get('NODE_ENV') === 'development',
          extra: {
            max: 10,
            connectionTimeoutMillis: 5000,
          },
        });
        await dataSource.initialize();
        return dataSource;
      },
    },
    {
      provide: AuditLog,
      useFactory: (dataSource: DataSource) => dataSource.getRepository(AuditLog),
      inject: ['AUTH_DATA_SOURCE'],
    },
  ],
  exports: ['AUTH_DATA_SOURCE', AuditLog],
})
export class DatabaseModule {}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get('THROTTLE_TTL', 60000),
            limit: config.get('THROTTLE_LIMIT', 10000),
          },
        ],
      }),
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    RolesModule,
    AdminModule,
    OrdersModule,
    FleetModule,
    CounterpartyModule,
    DispatcherModule,
    InvoicesModule,
    SettingsModule,
    RoutingModule,
    TrackingModule,
    NotificationsModule,
  ],
  providers: [],
})
export class AppModule {}