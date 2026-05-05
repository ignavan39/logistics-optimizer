import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CounterpartyController } from './counterparty.controller';
import { CounterpartyService } from './counterparty.service';

@Module({
  imports: [
    ConfigModule.forRoot(),
  ],
  controllers: [CounterpartyController],
  providers: [CounterpartyService],
  exports: [CounterpartyService],
})
export class CounterpartyModule {}