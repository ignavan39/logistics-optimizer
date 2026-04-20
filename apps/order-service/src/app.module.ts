import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderModule } from './order/order.module';
import { HealthModule } from './health/health.module';
import { MetricsModule } from './metrics/metrics.module';
import { OrderEntity } from './order/entities/order.entity';
import { OutboxEventEntity } from './order/entities/outbox-event.entity';

@Module({
  imports: [
    // ── Config ──────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // ── Database ─────────────────────────────────────────────────
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres',
        host: cfg.get('ORDER_DB_HOST', 'pgbouncer-order'),
        port: cfg.get<number>('PGBOUNCER_PORT', 6432),
        username: cfg.get('PG_USER', 'logistics'),
        password: cfg.get('PG_PASSWORD', 'logistics_secret'),
        database: cfg.get('ORDER_DB_NAME', 'order_db'),
        entities: [OrderEntity, OutboxEventEntity],
        migrations: [__dirname + '/migrations/*.{ts,js}'],
        migrationsRun: true,
        synchronize: false,
        logging: cfg.get('NODE_ENV') === 'development',
        // PgBouncer-compatible settings (transaction pool mode)
        extra: {
          max: 10, // connections to PgBouncer
          connectionTimeoutMillis: 5_000,
          query_timeout: 10_000,
          statement_timeout: 10_000,
        },
      }),
    }),

    // ── Feature modules ──────────────────────────────────────────
    OrderModule,
    HealthModule,
    MetricsModule,
  ],
})
export class AppModule {}
