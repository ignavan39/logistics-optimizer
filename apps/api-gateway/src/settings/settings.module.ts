import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'ORDER_PACKAGE',
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          loader: {
            keepCase: true,
          },
          options: {
            package: 'order',
            protoPath: '/app/libs/proto/src/order.proto',
            url: configService.get('GRPC_ORDER_HOST', 'order-service:50051'),
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [SettingsController],
  providers: [SettingsService],
})
export class SettingsModule {}