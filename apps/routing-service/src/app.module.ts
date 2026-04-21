import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { RoutingGrpcController } from './routing.grpc.controller'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        type: 'postgres',
        host: cfg.get('ROUTING_DB_HOST', 'pg-routing'),
        port: cfg.get<number>('PG_PORT_BASE', 5432),
        username: cfg.get('PG_USER', 'logistics'),
        password: cfg.get('PG_PASSWORD', 'logistics_secret'),
        database: cfg.get('ROUTING_DB_NAME', 'routing_db'),
        synchronize: false,
        logging: cfg.get('NODE_ENV') === 'development',
        extra: {
          max: 10,
          connectionTimeoutMillis: 5000,
        },
      }),
    }),
  ],
  controllers: [RoutingGrpcController],
})
export class AppModule {}