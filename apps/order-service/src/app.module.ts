import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { DatabaseModule } from './database/database.module'
import { OrderModule } from './order/order.module'
import { CounterpartyModule } from './counterparty/counterparty.module'
import { RoutingModule } from './routing/routing.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    DatabaseModule.forRoot(),

    OrderModule,
    CounterpartyModule,
    RoutingModule,
  ]
})
export class AppModule { }