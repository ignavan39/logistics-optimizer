import { Module } from '@nestjs/common'
import { CounterpartyService } from './counterparty.service'

@Module({
  providers: [CounterpartyService],
  exports: [CounterpartyService],
})
export class CounterpartyModule {}