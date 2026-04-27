import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { RoutingService } from './routing.service';

export const ROUTING_PACKAGE = 'ROUTING_PACKAGE';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: ROUTING_PACKAGE,
        inject: [ConfigService],
        /* eslint-disable @typescript-eslint/no-unsafe-assignment */
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'routing',
            protoPath: '/app/libs/proto/src/routing.proto',
            url: configService.get('GRPC_ROUTING_HOST', 'routing-service:50053'),
          },
        }),
        /* eslint-enable @typescript-eslint/no-unsafe-assignment */
      },
    ]),
  ],
  providers: [RoutingService],
  exports: [RoutingService],
})
export class RoutingModule {}