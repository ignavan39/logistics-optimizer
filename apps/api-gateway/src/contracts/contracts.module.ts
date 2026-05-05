import { Module } from '@nestjs/common';
import { ContractsController } from './contracts.controller';
import { CounterpartyModule } from '../counterparty/counterparty.module';

@Module({
  imports: [CounterpartyModule],
  controllers: [ContractsController],
  exports: [],
})
export class ContractsModule {}