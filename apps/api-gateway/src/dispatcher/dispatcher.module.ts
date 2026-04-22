import { Module } from '@nestjs/common'
import { ClientsModule, Transport } from '@nestjs/microservices'
import { ConfigService } from '@nestjs/config'
import { DispatcherController } from './dispatcher.controller'
import { DispatcherService } from './dispatcher.service'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'DISPATCHER_PACKAGE',
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'dispatcher',
            protoPath: join(process.cwd(), 'libs', 'proto', 'src', 'dispatcher.proto'),
            url: configService.get('GRPC_DISPATCHER_HOST', 'dispatcher-service:50055'),
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [DispatcherController],
  providers: [DispatcherService],
  exports: [DispatcherService],
})
export class DispatcherModule {}