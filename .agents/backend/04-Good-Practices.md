# 04-Good-Practices.md (Optimized Merge)

> 🎯 Паттерны для копирования. Адаптируй имена, сохраняй структуру.  
> 🔄 Обновляй только при: новом работающем паттерне (2+ использования), изменении стека, критичном улучшении.

---

## ⚡ Quick Rules

```
✅ Перед кодом >50 строк: план → Architect check → подтверждение
✅ Tests first: unit → integration → e2e
✅ Config: всегда configService.get<T>('KEY', default)
✅ Transactions: Outbox + идемпотентность для внешних вызовов
✅ Ошибки: graceful handling, null/Result вместо throw в gRPC
```

---

## 🏗️ Architect Mode Checklist

```
[ ] Какие сущности/сервисы/контракты меняются?
[ ] Изоляция БД? Outbox? Идемпотентность? Optimistic lock?
[ ] Какой сервис отвечает за логику?
[ ] 💡 Архитектурное наблюдение: [что] → [предложение]
```

---

## 🧪 Testing Patterns (Session 28.04.2026+)

### Unit-тесты gRPC-сервисов
```typescript
// ✅ Прямая инстанциация (быстрее, надёжнее Test.createTestingModule)
service = new MyService(mockConfig, mockGrpcClient as any);
service.onModuleInit();

// ✅ Мок gRPC-клиента
const grpcMock = {
  getService: jest.fn().mockReturnValue({
    myMethod: jest.fn().mockResolvedValue(expected),
  }),
};
```

### Jest Config для E2E
```javascript
// jest-e2e.json
{
  "transform": {
    "^.+\\.ts$": ["ts-jest", {
      "tsconfig": "tests/e2e/tsconfig.json",
      "useIsolatedModules": false // отключаем Babel-трансформацию
    }]
  }
}
```

### CommonJS + TypeScript
```json
// tsconfig.base.json
{ "compilerOptions": { "esModuleInterop": true } }
```
```typescript
// Для pdfkit и подобных
const PDFDocument = require('pdfkit');
```

### Интерфейс-первый подход
> Перед тестом: сверься с реальным интерфейсом сервиса. Не мокай лишние методы.

---

## 🗄️ Database & Transactions

### DatabaseModule (@Global)
```typescript
@Global()
@Module({
  providers: [{
    provide: DataSource,
    useFactory: async (cfg: ConfigService) => {
      const ds = new DataSource({
        type: 'postgres',
        host: cfg.get('DB_HOST', 'localhost'),
        port: cfg.get<number>('DB_PORT', 5432),
        database: cfg.get('DB_NAME'),
        username: cfg.get('DB_USER'),
        password: cfg.get('DB_PASS'),
        synchronize: cfg.get('NODE_ENV') !== 'production',
        entities: [join(__dirname, '../../**/*.entity{.ts,.js}')],
        logging: cfg.get('NODE_ENV') === 'development',
      });
      await ds.initialize();
      return ds;
    },
    inject: [ConfigService],
  }],
  exports: [DataSource],
})
export class DatabaseModule {}
```

### Transactional Outbox
```typescript
// В сервисе
async createOrder(dto: CreateOrderDto) {
  return this.dataSource.transaction(async (em) => {
    const order = em.create(OrderEntity, { ...dto, status: 'PENDING', version: 0 });
    await em.save(order);
    await em.save(OutboxEventEntity, {
      aggregateType: 'Order', aggregateId: order.id,
      eventType: 'created', payload: { orderId: order.id, ...dto },
    });
    return order;
  });
}

// Outbox processor
async process() {
  const events = await this.repo.createQueryBuilder('e')
    .where('e.processedAt IS NULL').andWhere('e.retryCount < :max', { max: 5 })
    .orderBy('e.createdAt', 'ASC').setLock('pessimistic_write')
    .take(50).getMany();

  for (const e of events) {
    try {
      await this.kafka.send({ topic: `order.${e.eventType}`, messages: [{ key: e.aggregateId, value: JSON.stringify(e.payload) }] });
      e.processedAt = new Date();
    } catch (err) { e.retryCount++; e.lastError = (err as Error).message; }
    await this.repo.save(e);
  }
}
```

### Idempotent Consumer
```typescript
async tryAcquire(eventId: string, type: string): Promise<boolean> {
  const res = await this.ds.query(
    `INSERT INTO processed_events (event_id, event_type) VALUES ($1, $2) ON CONFLICT (event_id) DO NOTHING RETURNING id`,
    [eventId, type]
  );
  return res.length > 0;
}
// В consumer: если !acquired → return (дубликат)
```

### Optimistic Locking
```typescript
@Entity() export class OrderEntity {
  @VersionColumn() version: number;
  // ...
}
// В сервисе: сверяем order.version === expectedVersion перед save()
```

### Advisory Lock (PostgreSQL)
```typescript
async withLock<T>(key: string, fn: () => Promise<T>): Promise<T | null> {
  const hash = this.hash(key); // детерминированный number
  const acquired = await this.ds.query(`SELECT pg_try_advisory_lock(${hash}) as ok`);
  if (!acquired[0].ok) return null;
  try { return await fn(); } finally { await this.ds.query(`SELECT pg_advisory_unlock(${hash})`); }
}
// Использовать для: генерация PDF, редкие расчёты, защита от дублей
```

---

## 🔌 gRPC & Communication

### gRPC Client Module
```typescript
@Module({
  imports: [ClientsModule.register([{
    name: 'FLEET_CLIENT', transport: Transport.GRPC,
    options: { package: 'fleet', protoPath: join(__dirname, '../proto/fleet.proto'), url: cfg.get('FLEET_URL') },
  }])],
})
export class FleetModule {}

// В сервисе
constructor(@Inject('FLEET_CLIENT') private grpc: ClientGrpc) {}
onModuleInit() { this.client = this.grpc.getService('FleetService'); }
myCall(req) { return firstValueFrom(this.client.myMethod(req)); }
```

### Graceful Error Handling
```typescript
async myMethod(dto: MyDto) {
  try { return await this.client.remoteCall(dto); }
  catch (e) { Logger.error(`Remote call failed: ${e}`, 'MyService'); return null; }
}
```

---

## 🧩 Saga & Resilience

### Dispatch Saga с компенсацией
```typescript
async execute(orderId: string, attempt = 1) {
  try {
    const [order, vehicle, route] = await Promise.all([
      this.orderService.get(orderId),
      this.fleetService.getAvailable({ origin: order.origin }),
      this.routingService.calculate({ origin: order.origin, destination: order.destination }),
    ]);
    await this.fleetService.assign({ vehicleId: vehicle.id, orderId, version: vehicle.version });
    await this.orderService.updateStatus(orderId, 'ASSIGNED');
    return { success: true, vehicleId: vehicle.id };
  } catch (err) {
    if (vehicleId) await this.fleetService.release({ vehicleId, orderId }); // компенсация
    if (attempt < 5) { await sleep(2 ** (attempt-1) * 1000); return this.execute(orderId, attempt+1); }
    await this.orderService.updateStatus(orderId, 'FAILED', { reason: 'max attempts' });
    return { success: false };
  }
}
```

### Backpressure Handler
```typescript
async handle(data: Telemetry, partition: number) {
  this.queue.push(data);
  if (this.writer.isOverloaded()) {
    this.consumer.pause([{ topic: 'telemetry', partition }]);
    this.writer.onNextFlush(() => this.consumer.resume([{ topic: 'telemetry', partition }]));
  }
  if (this.queue.length >= 500 || Date.now() - this.lastFlush >= 200) await this.flush();
}
private async flush() {
  if (!this.queue.length) return;
  await this.writer.bulkInsert(this.queue.splice(0)); // unnest() для скорости
  this.lastFlush = Date.now();
}
```

---

## ☁️ Storage (S3/MinIO)

```typescript
@Injectable()
export class S3Service {
  private client: S3Client;
  constructor(cfg: ConfigService) {
    this.client = new S3Client({
      region: 'us-east-1', endpoint: cfg.get('S3_ENDPOINT'),
      credentials: { accessKeyId: cfg.get('S3_KEY'), secretAccessKey: cfg.get('S3_SECRET') },
      forcePathStyle: true, // MinIO
    });
  }
  async upload(key: string, buf: Buffer, type: string) {
    await this.client.send(new PutObjectCommand({ Bucket: cfg.get('S3_BUCKET'), Key: key, Body: buf, ContentType: type }));
    return `https://${cfg.get('S3_ENDPOINT')}/${key}`;
  }
  keyFor(invoiceId: string) {
    const d = new Date();
    return `invoices/${d.getFullYear()}/${d.getMonth()+1}/${invoiceId}.pdf`;
  }
}
```

---

## 📚 Documentation Map

| Изменение | Файл для обновления |
|-----------|---------------------|
| Новый сервис | `docs/SERVICES.md` |
| gRPC/Kafka контракт | `docs/COMMUNICATION.md` + `02-Contracts.md` |
| Схема БД | `docs/DATABASE.md` |
| REST endpoint | `docs/API.md` |
| Новый паттерн | `docs/FEATURES.md` + этот файл |

```bash
# После изменений
pnpm build && pnpm typecheck
```

---

## 💡 Meta: Как обновлять этот файл

1. **Добавляй** только проверенное (2+ использования в коде)
2. **Удаляй** устаревшее — не копи, а заменяй
3. **Группируй** по доменам: `Testing`, `DB`, `gRPC`, `Resilience`
4. **Сокращай** описания — код говорит сам за себя
5. **Помечай** сессии/даты для контекста: `### Session 28.04.2026`

> 🎯 Цель: агент читает → копирует → адаптирует → работает. Минимум токенов, максимум пользы.

---

✅ **Check before commit**:  
- [ ] Паттерн работает в prod-like среде  
- [ ] Есть пример копирования (code block)  
- [ ] Указаны границы применения (когда использовать / не использовать)  
- [ ] Не дублирует другие файлы без причины