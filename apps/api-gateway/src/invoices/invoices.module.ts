import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { join } from 'path';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'INVOICE_PACKAGE',
        useFactory: (configService: ConfigService) => ({
          transport: Transport.GRPC,
          options: {
            package: 'invoice',
            protoPath: process.env.PROTO_ROOT ? `${process.env.PROTO_ROOT}/invoice.proto` : join(__dirname, '../../../../libs/proto/src/invoice.proto'),
            url: configService.get('GRPC_INVOICE_HOST', 'invoice-service:50052'),
          },
        }),
        inject: [ConfigService],
      },
    ]),
  ],
  controllers: [InvoicesController],
  providers: [InvoicesService],
})
export class InvoicesModule {}