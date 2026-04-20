import { Module } from '@nestjs/common'
import { Registry } from 'prom-client'

@Module({
  providers: [
    {
      provide: 'PROM_REGISTRY',
      useValue: new Registry(),
    },
  ],
  exports: ['PROM_REGISTRY'],
})
export class MetricsModule {}