import { NestFactory } from '@nestjs/core'
import { type MicroserviceOptions, Transport } from '@nestjs/microservices'
import { Logger } from '@nestjs/common'
import { AppModule } from './app.module'

const logger = new Logger('Bootstrap')

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true })

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: 'counterparty',
      protoPath: '/app/libs/proto/src/counterparty.proto',
      url: `0.0.0.0:${process.env['GRPC_COUNTERPARTY_PORT'] ?? 50056}`,
    },
  })

  await app.startAllMicroservices()
  const httpPort = process.env['HTTP_PORT'] ?? 3016
  const httpHost = process.env['HTTP_HOST'] ?? '0.0.0.0'
  await app.listen(httpPort, httpHost)

  logger.log('Counterparty Service started')
  logger.log(`gRPC on :${process.env['GRPC_COUNTERPARTY_PORT'] ?? 50056}`)
}

bootstrap().catch((err) => {
  logger.error('Fatal error', err)
  process.exit(1)
})