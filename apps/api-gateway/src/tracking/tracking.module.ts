import { Module } from '@nestjs/common'
import { ClientsModule, Transport } from '@nestjs/microservices'
import { ConfigService } from '@nestjs/config'
import { TrackingController } from './tracking.controller'
import { TrackingService } from './tracking.service'

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'TRACKING_PACKAGE',
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'tracking',
            protoPath: '/app/libs/proto/src/tracking.proto',
            url: configService.get('GRPC_TRACKING_HOST', 'tracking-service:50054'),
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [TrackingController],
  providers: [TrackingService],
  exports: [TrackingService],
})
export class TrackingModule {}