import { Module } from '@nestjs/common'
import { ClientsModule, Transport } from '@nestjs/microservices'
import { ConfigService } from '@nestjs/config'
import { OrdersController } from './orders.controller'
import { OrdersService } from './orders.service'
import { GuardsModule } from '../auth/guards/guards.module'

@Module({
  imports: [
    GuardsModule,
    ClientsModule.registerAsync([
      {
        name: 'ORDERS_PACKAGE',
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'order',
            protoPath: process.env.PROTO_ROOT ? `${process.env.PROTO_ROOT}/order.proto` : '/home/ivan/programming/pets/logistics-optimizer/libs/proto/src/order.proto',
            url: configService.get('GRPC_ORDER_HOST', 'order-service:50051'),
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}