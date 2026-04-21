import { Module } from '@nestjs/common'
import { ClientsModule, Transport } from '@nestjs/microservices'
import { ConfigService } from '@nestjs/config'
import { RoutingController } from './routing.controller'
import { RoutingService } from './routing.service'

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'ROUTING_PACKAGE',
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'routing',
            protoPath: '/app/libs/proto/src/routing.proto',
            url: configService.get('GRPC_ROUTING_HOST', 'routing-service:50053'),
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [RoutingController],
  providers: [RoutingService],
  exports: [RoutingService],
})
export class RoutingModule {}