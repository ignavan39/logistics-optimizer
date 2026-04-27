import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { InvoiceModule } from './invoice/invoice.module';
import { InvoiceEntity } from './invoice/entities/invoice.entity';

const dataSourceFactory = {
  provide: 'DATA_SOURCE',
  useFactory: async (configService: ConfigService) => {
    const dataSource = new DataSource({
      type: 'postgres',
      host: configService.get('INVOICE_DB_HOST', 'pg-invoice'),
      port: configService.get<number>('PG_PORT_BASE', 5432),
      username: configService.get('PG_USER', 'logistics'),
      password: configService.get('PG_PASSWORD', 'logistics_secret'),
      database: configService.get('INVOICE_DB_NAME', 'logistics_invoices'),
      entities: [InvoiceEntity],
      synchronize: configService.get('NODE_ENV') === 'development',
      logging: configService.get('NODE_ENV') === 'development',
    });
    return dataSource.initialize();
  },
  inject: [ConfigService],
};

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    InvoiceModule,
  ],
  providers: [
    dataSourceFactory,
    {
      provide: DataSource,
      useFactory: async (configService: ConfigService) => {
        const dataSource = new DataSource({
          type: 'postgres',
          host: configService.get('INVOICE_DB_HOST', 'pg-invoice'),
          port: configService.get<number>('PG_PORT_BASE', 5432),
          username: configService.get('PG_USER', 'logistics'),
          password: configService.get('PG_PASSWORD', 'logistics_secret'),
          database: configService.get('INVOICE_DB_NAME', 'logistics_invoices'),
          entities: [InvoiceEntity],
          synchronize: configService.get('NODE_ENV') === 'development',
          logging: configService.get('NODE_ENV') === 'development',
        });
        return dataSource.initialize();
      },
      inject: [ConfigService],
    },
  ],
  exports: [DataSource, 'DATA_SOURCE'],
})
export class AppModule {}