import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { InvoiceModule } from './invoice/invoice.module';

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
    {
      provide: DataSource,
      useFactory: (configService: ConfigService) => {
        const ds = new DataSource({
          type: 'postgres',
          host: configService.get('INVOICE_DB_HOST', 'pg-invoice'),
          port: configService.get<number>('PG_PORT_BASE', 5432),
          username: configService.get('PG_USER', 'logistics'),
          password: configService.get('PG_PASSWORD', 'logistics_secret'),
          database: configService.get('INVOICE_DB_NAME', 'logistics_invoices'),
          synchronize: configService.get('NODE_ENV') === 'development',
          logging: configService.get('NODE_ENV') === 'development',
        })
        return ds
      },
      inject: [ConfigService],
    },
  ],
  exports: [DataSource],
})
export class AppModule {}