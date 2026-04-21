import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsConsumer } from './notifications.consumer';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
    ClientsModule.registerAsync([
      {
        name: 'KAFKA_CLIENT',
        inject: [ConfigService],
        useFactory: (cfg: ConfigService) => ({
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: 'api-gateway-notifications',
              brokers: [cfg.get('KAFKA_BROKER', 'kafka:9092')],
            },
            consumer: {
              groupId: `${cfg.get('KAFKA_GROUP_ID_PREFIX', 'logistics')}.api-gateway-notifications`,
              sessionTimeout: 30_000,
              heartbeatInterval: 3_000,
            },
          },
        }),
      },
    ]),
  ],
  providers: [NotificationsGateway, NotificationsConsumer],
  exports: [NotificationsGateway],
})
export class NotificationsModule {}