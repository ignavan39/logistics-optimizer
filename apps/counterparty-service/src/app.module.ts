import { Module, Global } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { DataSource } from 'typeorm'
import { CounterpartyGrpcController } from './counterparty.grpc.controller'
import { CounterpartyService } from './counterparty/counterparty.service'
import { ContractService } from './contract/contract.service'
import {
  CounterpartyEntity,
  ContractEntity,
  ContractTariffEntity,
} from './entities'

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
  ],
  controllers: [CounterpartyGrpcController],
  providers: [
    CounterpartyService,
    ContractService,
    {
      provide: DataSource,
      useFactory: (cfg: ConfigService) => {
        return new DataSource({
          type: 'postgres',
          host: cfg.get('COUNTERPARTY_DB_HOST', 'pg-counterparty'),
          port: cfg.get<number>('PG_PORT_BASE', 5432),
          username: cfg.get('PG_USER', 'logistics'),
          password: cfg.get('PG_PASSWORD', 'logistics_secret'),
          database: cfg.get('COUNTERPARTY_DB_NAME', 'counterparty_db'),
          entities: [CounterpartyEntity, ContractEntity, ContractTariffEntity],
          synchronize: false,
          logging: cfg.get('NODE_ENV') === 'development',
          extra: {
            max: 10,
            connectionTimeoutMillis: 5000,
          },
        })
      },
      inject: [ConfigService],
    },
  ],
  exports: [DataSource, CounterpartyService, ContractService],
})
export class AppModule {}