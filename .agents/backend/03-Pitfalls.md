# Pitfalls — Антипаттерны (НЕ делать)

> Грабли которые уже наступили. Каждый пункт — боль из реального опыта.

---

## ⚡ Когда обновлять ЭТОТ файл

Обнови СРАЗУ если:
- Потратил >15 минут на отладку неочевидной проблемы
- Получил unexpected error которого не было в документации
- Сделал что-то что пришлось откатывать
- Нашёл поведение библиотеки/инструмента которое не совпадает с документацией

**Формат:**
```markdown
| [что не делать] | [почему сломается — конкретно] | [как правильно] |
```

---

## Backend: Инфраструктура

| ❌ Антипаттерн | 💥 Почему ломается | ✅ Правильно |
|--------------|-------------------|-------------|
| `@nestjs/typeorm` в Docker с pnpm | `Nest can't resolve dependencies of TypeOrmCoreModule` — конфликт hoisting | `new DataSource()` напрямую как `@Global()` provider (ADR-001) |
| `synchronize: true` в production | TypeORM может дропнуть/изменить колонки при несовпадении схемы | `synchronize: NODE_ENV !== 'production'` |
| `process.env.VAR` напрямую | Не работает в Docker до инициализации env, не тестируемо | `configService.get('VAR')` |
| Одинаковые порты test + prod | `docker compose up` конфликт, порты заняты | Тестовые БД на портах 6400+ (ADR-004) |
| Полагаться на init SQL при restart | `docker-entrypoint-initdb.d` выполняется только при первом старте контейнера | При schema errors: `docker compose down -v && up` |
| `.js` файлы в `src/` | ts-jest компилирует `.ts` → `.js` в ту же папку, конфликты | `isolatedModules: true` в jest.config.ts |

## Backend: TypeORM / DataSource

| ❌ Антипаттерн | 💥 Почему ломается | ✅ Правильно |
|--------------|-------------------|-------------|
| `getRepository()` вне transaction | Данные могут быть несогласованными при ошибке | `dataSource.transaction(async em => { ... })` |
| Seed в `apps/` | Тестовые данные в production коде | `infra/postgres/seeds/*.sql` |
| `@ts-ignore` для TypeORM types | Скрывает реальные ошибки типов | Типизируй правильно, используй `FindOptionsWhere<T>` |

## Backend: Kafka

| ❌ Антипаттерн | 💥 Почему ломается | ✅ Правильно |
|--------------|-------------------|-------------|
| Kafka produce без Outbox | При сбое после commit — событие теряется навсегда | Transactional Outbox pattern (ADR-002) |
| Kafka consumer без идемпотентности | Дубли при rebalance, retry, restart | Проверяй `eventId` через `processed_events` |
| In-memory Set для идемпотентности в проде | Теряется при рестарте сервиса | DB-based `IdempotencyGuard` из `libs/kafka-utils` |
| Kafka produce внутри транзакции | Kafka не участвует в DB transaction | Outbox: сначала пишем в outbox, потом poller публикует |

## Backend: gRPC

| ❌ Антипаттерн | 💥 Почему ломается | ✅ Правильно |
|--------------|-------------------|-------------|
| `waitForReady()` как единственная проверка | Возвращает `true` но методы дают `Internal Error` из-за неполной схемы БД | Тестируй реальные методы (создай тестовый объект) |
| HTTP вызовы между сервисами | Нарушает архитектурное правило R1 | Только gRPC (sync) или Kafka (async) |
| Cross-DB JOIN через TypeORM | Нарушает изоляцию БД, ломается при переезде сервиса | gRPC вызов в другой сервис |
| Хардкод gRPC адресов | Не работает в Docker/K8s | `configService.get('FLEET_SERVICE_URL')` |

## Git

| ❌ Антипаттерн | 💥 Почему ломается | ✅ Правильно |
|--------------|-------------------|-------------|
| `git checkout -- .` | Откатывает ВСЕ изменения включая untracked файлы без предупреждения | `git restore path/to/file` для конкретного файла |
| Commit secrets в .env | Credentials в истории git навсегда | `.env` в `.gitignore`, используй `.env.example` |

## Архитектура

| ❌ Антипаттерн | 💥 Почему ломается | ✅ Правильно |
|--------------|-------------------|-------------|
| Микросервис "на будущее" | Distributed transactions, network overhead, operational complexity | Начинай с модульного монолита |
| Shared database между сервисами | Tight coupling, нельзя деплоить независимо | Один сервис = одна БД |
| Saga без компенсации | Partial failure → inconsistent state | Каждый шаг Saga имеет compensating action |
| Optimistic lock без версии на сущности | Race condition при конкурентном обновлении | Поле `version INT` на всех конкурентно изменяемых сущностях |

## Pitfalls: Module Registration

| ❌ Антипаттерн | 💥 Почему ломается | ✅ Правильно |
|--------------|-------------------|-------------|
| Модуль импортирован но не добавлен в imports | Import есть, контроллеры недоступны — 404 на endpoints | Все импортированные модули должны быть в @Module({ imports: [] }) |

---

## Детальные антипаттерны с кодом

### ❌ Kafka без Outbox
```typescript
// ПЛОХО — между commit и produce может быть сбой
async createOrder(dto: CreateOrderDto) {
  const order = await this.orderRepo.save(dto);  // ← если упадёт kafka.send
  await this.kafka.send('order.created', order); // ← событие потеряется
}
```

### ✅ С Outbox
```typescript
// ХОРОШО — atomically
async createOrder(dto: CreateOrderDto) {
  return this.dataSource.transaction(async (em) => {
    const order = await em.save(OrderEntity, dto);
    await em.save(OutboxEventEntity, {
      aggregateType: 'Order',
      aggregateId: order.id,
      eventType: 'created',
      payload: { orderId: order.id, ...dto },
    });
    return order;
    // OutboxProcessor сам отправит в Kafka
  });
}
```

### ❌ gRPC без проверки методов
```typescript
// ПЛОХО — readiness не = методы работают
await client.waitForReady(Date.now() + 10000, callback);
// Предполагаем что всё готово — НЕТ
```

### ✅ Тестируй реальный метод
```typescript
// ХОРОШО
await new Promise<void>((resolve, reject) => {
  client.waitForReady(Date.now() + 10000, (err) => err ? reject(err) : resolve());
});
// Проверяем реальный метод
const { vehicles } = await client.getAvailableVehicles({ origin: 'test' });
```