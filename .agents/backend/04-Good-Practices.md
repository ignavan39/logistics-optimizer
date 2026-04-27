# Good Practices — Шаблоны для копирования

> Проверенные паттерны. Копируй как есть, адаптируй имена.

---

## ⚡ Когда обновлять ЭТОТ файл

Обнови если:
- Нашёл паттерн который применял >2 раз и он работает
- Появился новый "правильный" способ делать что-то в этом стеке
- Обновился существующий паттерн (добавилось что-то важное)

---

## 🏗️ Режим Архитектора

**Перед реализацией фичи >50 строк — ОБЯЗАТЕЛЬНО:**

1. Изложи план: какие сущности, какие сервисы, какие контракты меняются
2. Architect check:
   - Не нарушает ли изоляцию БД?
   - Нужен ли Outbox?
   - Нужна ли идемпотентность?
   - Нужен ли optimistic lock?
   - Какой сервис несёт ответственность за эту логику?
3. Получи подтверждение → только потом код

**Если видишь техдолг или возможность улучшения — скажи об этом.** Формат:
```
💡 Архитектурное наблюдение: [что заметил] → [предложение]
```

---

## 🔴 Tests First

Перед бизнес-логикой:
1. Unit тест для чистой функции/сервиса
2. Integration тест для Kafka/gRPC/DB
3. E2E сценарий если затрагивает >1 сервиса

---

## Шаблон: DatabaseModule (@Global)

```typescript
// shared/database/database.module.ts
@Global()
@Module({
  providers: [
    {
      provide: DataSource,
      useFactory: async (config: ConfigService) => {
        const ds = new DataSource({
          type: 'postgres',
          host: config.get('DB_HOST', 'localhost'),
          port: config.get<number>('DB_PORT', 5432),
          database: config.get('DB_NAME'),
          username: config.get('DB_USER', 'logistics'),
          password: config.get('DB_PASS'),
          synchronize: config.get('NODE_ENV') !== 'production',
          entities: [join(__dirname, '../../**/*.entity{.ts,.js}')],
          logging: config.get('NODE_ENV') === 'development',
        });
        await ds.initialize();
        return ds;
      },
      inject: [ConfigService],
    },
  ],
  exports: [DataSource],
})
export class DatabaseModule {}
```

---

## Шаблон: Module с useFactory

```typescript
// order/order.module.ts
@Module({
  imports: [DatabaseModule],
  providers: [
    {
      provide: OrderService,
      useFactory: (ds: DataSource, config: ConfigService) =>
        new OrderService(
          ds.getRepository(OrderEntity),
          ds.getRepository(OutboxEventEntity),
          config,
        ),
      inject: [DataSource, ConfigService],
    },
  ],
  controllers: [OrderController],
  exports: [OrderService],
})
export class OrderModule {}
```

---

## Шаблон: Transactional Outbox (полная реализация)

```typescript
// order.service.ts
async createOrder(dto: CreateOrderDto): Promise<OrderEntity> {
  return this.dataSource.transaction(async (em) => {
    const order = em.create(OrderEntity, {
      ...dto,
      status: OrderStatus.PENDING,
      version: 0,
    });
    await em.save(order);

    await em.save(OutboxEventEntity, {
      aggregateType: 'Order',
      aggregateId: order.id,
      eventType: 'created',
      payload: {
        orderId: order.id,
        customerId: dto.customerId,
        origin: dto.origin,
        destination: dto.destination,
      },
    });

    return order;
  });
}
```

```typescript
// outbox.processor.ts
@Injectable()
export class OutboxProcessor implements OnModuleInit {
  private interval: NodeJS.Timeout;

  onModuleInit() {
    this.interval = setInterval(() => this.process(), 1000);
  }

  async process() {
    const events = await this.outboxRepo
      .createQueryBuilder('e')
      .where('e.processedAt IS NULL')
      .andWhere('e.retryCount < :max', { max: 5 })
      .orderBy('e.createdAt', 'ASC')
      .setLock('pessimistic_write')
      .skip(0).take(50)
      .getMany();

    for (const event of events) {
      try {
        await this.kafka.send({
          topic: `order.${event.eventType}`,
          messages: [{ key: event.aggregateId, value: JSON.stringify(event.payload) }],
        });
        event.processedAt = new Date();
      } catch (err) {
        event.retryCount++;
        event.lastError = (err as Error).message;
      }
      await this.outboxRepo.save(event);
    }
  }
}
```

---

## Шаблон: Idempotent Consumer (DB-based)

```typescript
// libs/kafka-utils/src/idempotency/idempotency.guard.ts
@Injectable()
export class IdempotencyGuard {
  constructor(private readonly dataSource: DataSource) {}

  async tryAcquire(eventId: string, eventType: string): Promise<boolean> {
    const result = await this.dataSource.query(
      `INSERT INTO processed_events (event_id, event_type)
       VALUES ($1, $2)
       ON CONFLICT (event_id) DO NOTHING
       RETURNING id`,
      [eventId, eventType],
    );
    return result.length > 0; // false = уже обработан
  }
}

// Использование в consumer:
async handle(event: KafkaEvent<OrderCreatedPayload>) {
  const acquired = await this.idempotency.tryAcquire(event.eventId, event.type);
  if (!acquired) {
    this.logger.debug(`Skipping duplicate event: ${event.eventId}`);
    return;
  }
  await this.processOrder(event.payload);
}
```

---

## Шаблон: Optimistic Locking

```typescript
// Entity
@Entity('orders')
export class OrderEntity {
  @VersionColumn() version: number;
  // ...
}

// Service
async updateOrderStatus(id: string, status: OrderStatus, expectedVersion: number) {
  const order = await this.orderRepo.findOneBy({ id });
  if (!order) throw new NotFoundException(`Order ${id} not found`);

  if (order.version !== expectedVersion) {
    throw new ConflictException(
      `Version conflict: expected ${expectedVersion}, got ${order.version}`
    );
  }

  order.status = status;
  // version инкрементируется автоматически через @VersionColumn
  return this.orderRepo.save(order);
}
```

---

## Шаблон: ConfigService (не process.env)

```typescript
// ✅ Правильно — всегда с default значением
const host = configService.get<string>('DB_HOST', 'localhost');
const port = configService.get<number>('DB_PORT', 5432);
const isDev = configService.get<string>('NODE_ENV') !== 'production';

// ❌ Никогда
const host = process.env.DB_HOST; // undefined в Docker до инициализации
```

---

## Шаблон: gRPC клиент в NestJS

```typescript
// fleet.module.ts
@Module({
  imports: [
    ClientsModule.register([{
      name: 'FLEET_PACKAGE',
      transport: Transport.GRPC,
      options: {
        package: 'fleet',
        protoPath: join(__dirname, '../../../libs/proto/fleet.proto'),
        url: process.env.FLEET_SERVICE_URL || 'localhost:50052',
      },
    }]),
  ],
})
export class FleetModule {}

// fleet.service.ts
@Injectable()
export class FleetClientService implements OnModuleInit {
  private client: FleetServiceClient;

  constructor(@Inject('FLEET_PACKAGE') private readonly grpc: ClientGrpc) {}

  onModuleInit() {
    this.client = this.grpc.getService<FleetServiceClient>('FleetService');
  }

  getAvailableVehicles(request: FindVehicleRequest) {
    return firstValueFrom(this.client.getAvailableVehicles(request));
  }
}
```

---

## Шаблон: Dispatch Saga с компенсацией

```typescript
async executeDispatch(orderId: string, attempt = 1): Promise<DispatchResult> {
  const MAX_ATTEMPTS = 5;

  try {
    const order = await this.orderService.getOrder(orderId);
    const vehicle = await this.fleetService.getAvailableVehicles({
      origin: order.origin,
      capacity: order.cargoWeight,
    });
    const route = await this.routingService.calculateRoute({
      origin: order.origin,
      destination: order.destination,
    });
    await this.fleetService.assignVehicle({
      vehicleId: vehicle.id,
      orderId,
      version: vehicle.version, // optimistic lock
    });
    await this.orderService.updateOrderStatus({ orderId, status: 'ASSIGNED' });

    return { success: true, vehicleId: vehicle.id };
  } catch (err) {
    // Компенсация
    if (vehicleId) await this.fleetService.releaseVehicle({ vehicleId, orderId });

    if (attempt < MAX_ATTEMPTS) {
      const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s, 8s, 16s
      this.logger.warn(`Dispatch attempt ${attempt} failed, retry in ${delay}ms`);
      await sleep(delay);
      return this.executeDispatch(orderId, attempt + 1);
    }

    await this.orderService.updateOrderStatus({
      orderId,
      status: 'FAILED',
      reason: `Dispatch failed after ${MAX_ATTEMPTS} attempts`,
    });
    return { success: false };
  }
}
```

---

## Шаблон: Backpressure (tracking-service)

```typescript
async handleTelemetry(data: TelemetryData, partition: number) {
  this.queue.push(data);

  // Если writer перегружен — останавливаем потребление
  if (this.batchWriter.isOverloaded()) {
    this.kafkaConsumer.pause([{ topic: 'vehicle.telemetry', partition }]);
    this.batchWriter.onNextFlush(() => {
      this.kafkaConsumer.resume([{ topic: 'vehicle.telemetry', partition }]);
    });
  }

  const shouldFlush = this.queue.length >= 500 || Date.now() - this.lastFlush >= 200;
  if (shouldFlush) await this.flush();
}

private async flush() {
  if (!this.queue.length) return;
  const batch = this.queue.splice(0);
  await this.batchWriter.bulkInsert(batch); // unnest() → ~50k rows/sec
  this.lastFlush = Date.now();
}
```

---

## Шаблон: PostgreSQL Advisory Lock (Distributed Lock)

Для операций которые должны выполняться только один раз (например, PDF generation):

```typescript
// invoice/pg-advisory-lock.ts
export class PgAdvisoryLock {
  constructor(private readonly dataSource: DataSource) {}

  async acquire(key: string): Promise<boolean> {
    const keyHash = this.hashKey(key);
    const result = await this.dataSource.query(
      `SELECT pg_try_advisory_lock(${keyHash}) as acquired`,
    );
    return result[0]?.acquired === true;
  }

  async release(key: string): Promise<void> {
    const keyHash = this.hashKey(key);
    await this.dataSource.query(`SELECT pg_advisory_unlock(${keyHash})`);
  }

  async withLock<T>(key: string, fn: () => Promise<T>): Promise<T | null> {
    if (await this.acquire(key)) {
      try {
        return await fn();
      } finally {
        await this.release(key);
      }
    }
    return null; // Lock busy
  }

  private hashKey(key: string): number {
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = ((hash << 5) - hash) + key.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash) % 2147483647;
  }
}

// Использование в PdfService:
async getOrGeneratePdf(invoiceId: string): Promise<string> {
  const lockKey = `pdf:${invoiceId}`;
  
  // 1. Проверяем кеш
  const existing = await this.getExistingPdf(invoiceId);
  if (existing) return existing;

  // 2. Acquire lock - только один генерирует
  const result = await this.lock.withLock(lockKey, async () => {
    // Double-check кеш после получения lock
    const fresh = await this.getExistingPdf(invoiceId);
    if (fresh) return fresh;
    return this.generateAndUpload(invoiceId);
  });

  if (!result) {
    throw new ConflictException('PDF generation in progress');
  }
  return result;
}
```

**Преимущества:**
- PostgreSQL-native, не нужен Redis
- Session-level, автоматически освобождается при disconnet
- TTL через `pg_advisory_lock_shared` + таймаут

---

## Шаблон: S3/MinIO Storage

Для enterprise-совместимого хранения файлов:

```typescript
// invoice/s3-storage.service.ts
@Injectable()
export class S3StorageService {
  private readonly client: S3Client;

  constructor(private readonly configService: ConfigService) {
    this.client = new S3Client({
      region: 'us-east-1',
      endpoint: configService.get('S3_ENDPOINT'),
      credentials: {
        accessKeyId: configService.get('S3_ACCESS_KEY'),
        secretAccessKey: configService.get('S3_SECRET_KEY'),
      },
      forcePathStyle: true, // Для MinIO
    });
  }

  async upload(key: string, data: Buffer, contentType: string): Promise<string> {
    await this.client.send(new PutObjectCommand({
      Bucket: this.config.bucket,
      Key: key,
      Body: data,
      ContentType: contentType,
    }));
    return this.getPublicUrl(key);
  }

  generateKey(invoiceId: string): string {
    const now = new Date();
    return `invoices/${now.getFullYear()}/${now.getMonth() + 1}/${invoiceId}.pdf`;
  }
}
```

**Docker (MinIO):**
```yaml
minio:
  image: minio/minio
  environment:
    MINIO_ROOT_USER: ${MINIO_ACCESS_KEY}
    MINIO_ROOT_PASSWORD: ${MINIO_SECRET_KEY}
  command: server /data
```

---

## Документация: когда обновлять

| Изменение | Файл |
|-----------|------|
| Новый/удалённый сервис | `docs/SERVICES.md` |
| gRPC метод или Kafka топик | `docs/COMMUNICATION.md` + `02-Contracts.md` |
| Схема БД | `docs/DATABASE.md` |
| REST endpoint | `docs/API.md` |
| Новая фича/паттерн | `docs/FEATURES.md` |

```bash
# После любых изменений
pnpm build && pnpm typecheck
```