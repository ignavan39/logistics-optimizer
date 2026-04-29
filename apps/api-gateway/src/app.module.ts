import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

// Auth & Users (JWT здесь, guards в GuardsModule)
import { AuthModule } from './auth/auth.module';
import { GuardsModule } from './auth/guards/guards.module';

// Feature modules (только рабочие)
import { OrdersModule } from './orders/orders.module';
import { FleetModule } from './fleet/fleet.module';
import { SettingsModule } from './settings/settings.module';
import { CounterpartyModule } from './counterparty/counterparty.module';
import { DispatcherModule } from './dispatcher/dispatcher.module';
import { InvoicesModule } from './invoices/invoices.module';
import { RoutingModule } from './routing/routing.module';
import { TrackingModule } from './tracking/tracking.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot({ throttlers: [{ ttl: 60000, limit: 10000 }] }),
    // Auth (JWT only, no DB)
    AuthModule,
    GuardsModule,
    // Feature modules
    OrdersModule,
    FleetModule,
    SettingsModule,
    CounterpartyModule,
    DispatcherModule,
    InvoicesModule,
    RoutingModule,
    TrackingModule,
    // Notifications (WebSocket + Kafka)
    NotificationsModule,
  ],
  providers: [],
})
export class AppModule {}
