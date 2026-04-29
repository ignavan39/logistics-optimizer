import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CounterpartyController } from './counterparty.controller';
import { CounterpartyService } from './counterparty.service';

@Module({
  imports: [
    ConfigModule.forRoot(), // Make ConfigService available
    ClientsModule.registerAsync([
      {
        name: 'COUNTERPARTY_PACKAGE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'counterparty',
            protoPath: process.env.PROTO_ROOT ? `${process.env.PROTO_ROOT}/counterparty.proto` : '/home/ivan/programming/pets/logistics-optimizer/libs/proto/src/counterparty.proto',
            url: configService.get('GRPC_COUNTERPARTY_HOST', 'counterparty-service:50057'),
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [CounterpartyController],
  providers: [CounterpartyService],
  exports: [CounterpartyService],
})
export class CounterpartyModule {}
