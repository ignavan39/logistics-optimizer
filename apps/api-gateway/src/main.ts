import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import { AuditInterceptor } from './auth/interceptors/audit.interceptor';
import { DataSource } from 'typeorm';
import helmet from 'helmet';

async function bootstrap() {
  const logger = new Logger('API-Gateway');
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get('PORT', 3000);

  // Global prefix /api
  app.setGlobalPrefix('api');

  // Security headers
  app.use(helmet());

  // Global audit interceptor
  const reflector = app.get(Reflector);
  const dataSource = app.get(DataSource);
  app.useGlobalInterceptors(new AuditInterceptor(dataSource, reflector));

  app.useGlobalFilters(new AllExceptionsFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableCors({
    origin: configService.get('CORS_ORIGIN', '*'),
    credentials: true,
  });

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Logistics Optimizer API')
    .setDescription(`
## API для управления логистикой

### Модули
- **Auth** - аутентификация и авторизация
- **Orders** - управление заказами
- **Fleet** - управление транспортом
- **Routing** - построение маршрутов
- **Tracking** - отслеживание ТС
- **Dispatcher** - диспетчеризация заказов

### Аутентификация
API использует JWT токены. Для защищённых эндпоинтов добавьте:
\`Authorization: Bearer <access_token>\`
    `)
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Аутентификация и авторизация')
    .addTag('orders', 'Управление заказами')
    .addTag('fleet', 'Управление транспортом')
    .addTag('routing', 'Построение маршрутов')
    .addTag('tracking', 'Отслеживание ТС')
    .addTag('dispatcher', 'Диспетчеризация')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port);
  logger.log(`API Gateway running on port ${port}`);
}

bootstrap();