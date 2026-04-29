import { Module } from '@nestjs/common'
import { ClientsModule, Transport } from '@nestjs/microservices'
import { ConfigService } from '@nestjs/config'
import { FleetController } from './fleet.controller'
import { FleetService } from './fleet.service'

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'FLEET_PACKAGE',
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'fleet',
            protoPath: process.env.PROTO_ROOT ? `${process.env.PROTO_ROOT}/fleet.proto` : '/home/ivan/programming/pets/logistics-optimizer/libs/proto/src/fleet.proto',
            url: configService.get('GRPC_FLEET_HOST', 'fleet-service:50053'),
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [FleetController],
  providers: [FleetService],
  exports: [FleetService],
})
export class FleetModule {}