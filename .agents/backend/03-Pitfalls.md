# 03-Pitfalls.md — Антипаттерны (НЕ делать)

> 🚫 Грабли из реального опыта. Не повторяй.  
> 🔄 Обновляй СРАЗУ если: >15 мин на отладку, unexpected error, откат, расхождение с доками.  
> 📝 Формат: `| ❌ Что | 💥 Почему | ✅ Как |`

---

## ⚡ Quick Scan: Top Traps

```
✅ DataSource: new DataSource() напрямую, не @nestjs/typeorm (ADR-001)
✅ Config: configService.get('VAR', default), не process.env
✅ Kafka: Outbox + идемпотентность в БД, не in-memory
✅ gRPC: тестируй реальные методы, не только waitForReady()
✅ Tests: прямая инстанциация сервисов с @Inject('PACKAGE')
✅ TS: esModuleInterop: true + require() для CommonJS (pdfkit)
✅ Jest E2E: useIsolatedModules: false (отключает Babel)
```

---

## 🗄️ Backend: Infrastructure & TypeORM

| ❌ Антипаттерн | 💥 Почему ломается | ✅ Правильно |
|--------------|-------------------|-------------|
| `@nestjs/typeorm` + pnpm + Docker | Conflict hoisting → `Nest can't resolve TypeOrmCoreModule` | `new DataSource()` как `@Global()` provider |
| `synchronize: true` в prod | TypeORM может дропнуть колонки | `synchronize: NODE_ENV !== 'production'` |
| TypeORM DataSource в конструкторе сервиса | `EntityMetadataNotFoundError` — getRepository() до инициализации DataSource | Создать DataSource в модуле с async factory + инжектировать репозиторий через строковый токен |
| `process.env.VAR` напрямую | Не работает в Docker до инициализации, не тестируемо | `configService.get<T>('VAR', default)` |
| Одинаковые порты test/prod | `docker compose up` → port conflict | Тестовые БД на 6400+ (ADR-004) |
| Init SQL при restart | `docker-entrypoint-initdb.d` — только первый запуск | `docker compose down -v && up` при schema errors |
| `.js` файлы в `src/` | ts-jest компилирует `.ts` → `.js`, конфликты | `isolatedModules: true` в jest.config |
| `getRepository()` вне транзакции | Несогласованные данные при ошибке | `dataSource.transaction(async em => { ... })` |
| Seed в `apps/` | Тестовые данные в prod коде | `infra/postgres/seeds/*.sql` |
| `@ts-ignore` для TypeORM | Скрывает реальные ошибки типов | Используй `FindOptionsWhere<T>`, типизируй |

---

## 📨 Backend: Kafka & Events

| ❌ Антипаттерн | 💥 Почему ломается | ✅ Правильно |
|--------------|-------------------|-------------|
| Kafka produce без Outbox | Сбой после commit → событие потеряно | Transactional Outbox (ADR-002) |
| Consumer без идемпотентности | Дубли при rebalance/retry | Проверяй `eventId` в `processed_events` |
| In-memory Set для идемпотентности | Теряется при рестарте сервиса | DB-based `IdempotencyGuard` |
| Kafka produce внутри DB transaction | Kafka не участвует в транзакции БД | Сначала outbox → потом poller публикует |

### 📦 Outbox: Code Comparison (Копируй ✅)

```typescript
// ❌ ПЛОХО: между commit и produce может быть сбой
async createOrder(dto: CreateOrderDto) {
  const order = await this.orderRepo.save(dto);     // ← commit
  await this.kafka.send('order.created', order);    // ← если упадёт здесь → событие потеряно
  return order;
}

// ✅ ХОРОШО: атомарно через транзакцию
async createOrder(dto: CreateOrderDto) {
  return this.dataSource.transaction(async (em) => {
    const order = await em.save(OrderEntity, { ...dto, status: 'PENDING' });
    await em.save(OutboxEventEntity, {
      aggregateType: 'Order',
      aggregateId: order.id,
      eventType: 'created',
      payload: { orderId: order.id, customerId: dto.customerId, ...dto },
    });
    return order; // OutboxProcessor сам отправит в Kafka позже
  });
}
```

```typescript
// ✅ Outbox Processor (poller)
@Injectable()
export class OutboxProcessor implements OnModuleInit {
  onModuleInit() { setInterval(() => this.process(), 1000); }

  async process() {
    const events = await this.repo.createQueryBuilder('e')
      .where('e.processedAt IS NULL').andWhere('e.retryCount < :max', { max: 5 })
      .orderBy('e.createdAt', 'ASC').setLock('pessimistic_write').take(50).getMany();

    for (const e of events) {
      try {
        await this.kafka.send({ topic: `order.${e.eventType}`, messages: [{ key: e.aggregateId, value: JSON.stringify(e.payload) }] });
        e.processedAt = new Date();
      } catch (err) { e.retryCount++; e.lastError = (err as Error).message; }
      await this.repo.save(e);
    }
  }
}
```

---

## 🔌 Backend: gRPC & Communication

| ❌ Антипаттерн | 💥 Почему ломается | ✅ Правильно |
|--------------|-------------------|-------------|
| `waitForReady()` как единственная проверка | Возвращает `true`, но методы падают из-за схемы БД | Тестируй реальный метод с тестовыми данными |
| HTTP между сервисами | Нарушает правило R1 (архитектура) | Только gRPC (sync) или Kafka (async) |
| Cross-DB JOIN через TypeORM | Нарушает изоляцию БД, ломается при миграции сервиса | gRPC вызов в другой сервис |
| Хардкод gRPC адресов | Не работает в Docker/K8s | `configService.get('FLEET_SERVICE_URL')` |
| Business logic в api-gateway | Дублирование, сложность поддержки | Gateway = proxy, логика в отдельных сервисах |

### 🔍 gRPC Readiness: Code Comparison

```typescript
// ❌ ПЛОХО: waitForReady ≠ методы работают
await client.waitForReady(Date.now() + 10000, (err) => { if (err) reject(err); else resolve(); });
// Предполагаем что всё готово — НЕТ, может быть ошибка схемы БД

// ✅ ХОРОШО: тестируй реальный метод
await client.waitForReady(Date.now() + 10000, (err) => err ? reject(err) : resolve());
const result = await client.getAvailableVehicles({ origin: 'test-origin' }); // реальный вызов
if (!result) throw new Error('gRPC method failed despite ready state');
```

---

## 🧪 Testing & Build (Session 28.04.2026+)

| ❌ Антипаттерн | 💥 Почему ломается | ✅ Правильно |
|--------------|-------------------|-------------|
| `Test.createTestingModule` для сервисов с `@Inject('PACKAGE')` | Nest не резолвит gRPC-зависимости | Прямая инстанциация: `new Service(mockCfg, mockGrpc)` + `onModuleInit()` |
| `isolatedModules: true` в ts-jest для E2E | Включает Babel → парсинг-ошибки | `useIsolatedModules: false` в jest-e2e config |
| `esModuleInterop: false` + CommonJS модули | TypeScript не импортирует `pdfkit` и подобные | `"esModuleInterop": true` + `const X = require('x')` |
| Моки не соответствуют реальному интерфейсу | Тесты проходят, код падает в prod | Сверяй моки с реальными методами сервиса перед тестом |
| Забытые `// TEMP:` комментарии | Отключённая логика уходит в prod | `grep -r "TEMP:"` перед коммитом |
| Несоответствие типов в вызовах сервисов | `calculateEstimatedPrice` возвращает не то, что ожидает код | Читай контракт, используй отдельные методы для тарифов |

### 🧪 Unit-тест шаблон для gRPC-сервисов

```typescript
// ✅ Вместо Test.createTestingModule (который падает на DI)
const grpcMock = { getService: jest.fn().mockReturnValue({ myMethod: jest.fn().mockResolvedValue(expected) }) };
const service = new MyService(mockConfig as any, grpcMock as any);
service.onModuleInit();
// Теперь тестируй: await service.myMethod()
```

---

## 🔧 Git & Workflow

| ❌ Антипаттерн | 💥 Почему ломается | ✅ Правильно |
|--------------|-------------------|-------------|
| `git checkout -- .` | Откатывает ВСЁ, включая untracked файлы | `git restore path/to/file` для конкретного файла |
| Commit secrets в `.env` | Credentials в истории git навсегда | `.env` в `.gitignore`, используй `.env.example` |

---

## 🏗️ Architecture

| ❌ Антипаттерн | 💥 Почему ломается | ✅ Правильно |
|--------------|-------------------|-------------|
| Микросервис "на будущее" | Distributed transactions, overhead, сложность | Начинай с модульного монолита |
| Shared DB между сервисами | Tight coupling, нельзя деплоить независимо | Один сервис = одна БД |
| Saga без компенсации | Partial failure → inconsistent state | Каждый шаг имеет compensating action |
| Optimistic lock без `version` | Race condition при конкурентном обновлении | Поле `version INT` на всех конкурентно изменяемых сущностях |
| Модуль импортирован, но не в `imports` | Контроллеры недоступны → 404 | Все импортированные модули в `@Module({ imports: [] })` |

---

## 💡 Meta: Как обновлять этот файл

1. **Добавляй** только после >15 мин отладки или реального инцидента
2. **Формулируй конкретно**: что сломалось → почему → как исправить
3. **Группируй** по доменам: `Infrastructure`, `Kafka`, `gRPC`, `Testing`
4. **Сокращай**: таблица > параграф, код > описание
5. **Помечай сессии**: `## 🧪 Testing (Session 28.04.2026)` для контекста

> 🎯 Цель: агент видит грабли → обходит → экономит время. Минимум токенов, максимум предотвращения боли.

---

✅ **Pre-commit checklist**:  
- [ ] `grep -r "TEMP:"` — нет забытых заглушек  
- [ ] `pnpm typecheck` — нет скрытых `@ts-ignore`  
- [ ] Тесты мокают только реальные методы  
- [ ] Новые паттерны добавлены в `04-Good-Practices.md`  
- [ ] Конфиги (`jest`, `tsconfig`) синхронизированы между app/test