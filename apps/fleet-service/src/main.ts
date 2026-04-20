import { NestFactory } from '@nestjs/core'
import { MicroserviceOptions, Transport } from '@nestjs/microservices'
import { join } from 'path'
import { Logger } from '@nestjs/common'
import { AppModule } from './app.module'

const logger = new Logger('Bootstrap')

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true })

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'fleet',
      protoPath: join(__dirname, '../../libs/proto/src/fleet.proto'),
      url: `0.0.0.0:${process.env['GRPC_FLEET_PORT'] ?? 50052}`,
    },
  })

  await app.startAllMicroservices()
  await app.listen(process.env['HTTP_METRICS_PORT'] ?? 9464)

  logger.log('Fleet Service started')
  logger.log(`gRPC on :${process.env['GRPC_FLEET_PORT'] ?? 50052}`)
}

bootstrap().catch((err) => {
  logger.error('Fatal error', err)
  process.exit(1)
})