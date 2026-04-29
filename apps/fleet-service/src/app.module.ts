import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { FleetGrpcController } from './fleet.grpc.controller'
import { FleetService } from './fleet.service'
import { DatabaseModule } from './database/database.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    DatabaseModule.forRoot(),
  ],
  controllers: [FleetGrpcController],
  providers: [FleetService],
})
export class AppModule {}