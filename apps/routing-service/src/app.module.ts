import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { RoutingGrpcController } from './routing.grpc.controller'
import { RoutingHttpController } from './routing.http.controller'
import { RoutingService } from './routing.service'
import { RouteCacheService } from './routing/route-cache.service'
import { DatabaseModule } from './database/database.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    DatabaseModule.forRoot(),
  ],
  controllers: [RoutingGrpcController, RoutingHttpController],
  providers: [RoutingService, RouteCacheService],
})
export class AppModule {}