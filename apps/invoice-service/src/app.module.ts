import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { InvoiceModule } from './invoice/invoice.module';
import { InvoiceEntity } from './invoice/entities/invoice.entity';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('INVOICE_DB_HOST', 'pg-invoice'),
        port: configService.get<number>('PG_PORT_BASE', 5432),
        username: configService.get('PG_USER', 'logistics'),
        password: configService.get('PG_PASSWORD', 'logistics_secret'),
        database: configService.get('INVOICE_DB_NAME', 'logistics_invoices'),
        entities: [InvoiceEntity],
        synchronize: configService.get('NODE_ENV') === 'development',
        logging: configService.get('NODE_ENV') === 'development',
      }),
    }),
    InvoiceModule,
  ],
  exports: [DataSource],
})
export class AppModule {}