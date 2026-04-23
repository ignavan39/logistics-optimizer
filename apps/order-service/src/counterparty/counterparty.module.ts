import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { CounterpartyService } from './counterparty.service';

export const COUNTERPARTY_PACKAGE = 'COUNTERPARTY_PACKAGE';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: COUNTERPARTY_PACKAGE,
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'counterparty',
            protoPath: '/app/libs/proto/src/counterparty.proto',
            url: configService.get('GRPC_COUNTERPARTY_HOST', 'counterparty-service:50056'),
          },
        }),
      },
    ]),
  ],
  providers: [CounterpartyService],
  exports: [CounterpartyService],
})
export class CounterpartyModule {}