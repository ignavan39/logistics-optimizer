import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InvoiceModule } from '../invoice/invoice.module';
import { InvoiceEntity } from '../invoice/entities/invoice.entity';

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
        host: configService.get('INVOICE_DB_HOST', 'localhost'),
        port: configService.get('INVOICE_DB_PORT', 5432),
        database: configService.get('INVOICE_DB_NAME', 'logistics_invoices'),
        username: configService.get('INVOICE_DB_USER', 'postgres'),
        password: configService.get('INVOICE_DB_PASSWORD', 'postgres'),
        entities: [InvoiceEntity],
        synchronize: configService.get('INVOICE_DB_SYNC', 'false') === 'true',
        logging: configService.get('INVOICE_DB_LOGGING', 'false') === 'true',
      }),
    }),
    InvoiceModule,
  ],
})
export class AppModule {}