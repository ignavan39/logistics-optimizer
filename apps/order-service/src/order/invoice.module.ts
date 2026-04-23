import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvoiceEntity } from './entities/invoice.entity';
import { InvoiceService } from './invoice.service';
import { InvoiceGrpcController } from './invoice.grpc.controller';

@Module({
  imports: [TypeOrmModule.forFeature([InvoiceEntity])],
  controllers: [InvoiceGrpcController],
  providers: [InvoiceService],
  exports: [InvoiceService],
})
export class InvoiceModule {}