import { NestFactory } from '@nestjs/core'
import { MicroserviceOptions, Transport } from '@nestjs/microservices'
import { Logger } from '@nestjs/common'
import { AppModule } from './app.module'

const logger = new Logger('Bootstrap')

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true })

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'routing',
      protoPath: '/app/libs/proto/src/routing.proto',
      url: `0.0.0.0:${process.env['GRPC_ROUTING_PORT'] ?? 50053}`,
    },
  })

  await app.startAllMicroservices()
  const httpPort = process.env['HTTP_PORT'] ?? 3013
  const httpHost = process.env['HTTP_HOST'] ?? '0.0.0.0'
  await app.listen(httpPort, httpHost)

  logger.log('Routing Service started')
  logger.log(`gRPC on :${process.env['GRPC_ROUTING_PORT'] ?? 50053}`)
}

bootstrap().catch((err) => {
  logger.error('Fatal error', err)
  process.exit(1)
})