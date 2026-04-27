# MEMORY — Накопленные знания о проекте

> Живая память проекта. Обновляй после каждой сессии, когда узнал что-то важное.
> Это первый файл который надо прочитать перед работой.

---

## 🔴 Критические факты (знать обязательно)

| Факт | Контекст |
|------|---------|
| `@nestjs/typeorm` сломан в Docker с pnpm | Используй `new DataSource()` напрямую (ADR-001) |
| `git checkout -- .` откатывает ВСЁ | Используй `git restore path/to/file` |
| `init SQL` запускается только при первом старте контейнера | При schema errors — пересоздай контейнер |
| gRPC `waitForReady()` = true ≠ методы работают | Тестируй реальные методы, не только readiness |
| **PDF generation: PostgreSQL advisory lock** | Только один запрос генерирует PDF, остальные poll |
| **MinIO для enterprise PDF storage** | S3-compatible, легко поднять локально |

---

## 📚 Архитектурные решения (ADRs)

| ID | Решение | Дата | Статус |
|----|---------|------|--------|
| ADR-001 | TypeORM через `new DataSource()` напрямую, без `@nestjs/typeorm` | 2026-04 | Accepted |
| ADR-002 | Outbox pattern для Kafka — писать событие в БД в той же транзакции | 2026-03 | Accepted |
| ADR-003 | API versioning через URL: `/api/v1/`, поддержка старой версии 6 месяцев | 2026-02 | Accepted |
| ADR-004 | Test DB: отдельные `*_test` БД + pgbouncer на портах 6401–6407 | 2026-04 | Accepted |
| ADR-005 | DataSource factory pattern для api-gateway после фикса @nestjs/typeorm | 2026-04 | Resolved |

---

## 🐛 Известные проблемы (открытые)

| Проблема | Где | Временное решение | Правильное решение |
|---------|-----|-------------------|--------------------|
| InvoicesModule отключён | api-gateway | Заглушка в invoices.service.ts | Исправить ESM/CJS в `@logistics/document-templates` |
| ts-jest компилирует `.ts` → `.js` в ту же папку | Все сервисы | `isolatedModules: true` в jest.config.ts | — |

---

## ✅ Проверенные паттерны

### DataSource Factory (рабочий шаблон)
```typescript
// database.module.ts
@Global()
@Module({
  providers: [
    {
      provide: DataSource,
      useFactory: async (config: ConfigService) => {
        const ds = new DataSource({
          type: 'postgres',
          host: config.get('DB_HOST'),
          port: config.get<number>('DB_PORT', 5432),
          database: config.get('DB_NAME'),
          username: config.get('DB_USER'),
          password: config.get('DB_PASS'),
          synchronize: config.get('NODE_ENV') !== 'production',
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
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

### Module с useFactory (после ADR-005)
```typescript
// После рефакторинга все модули используют useFactory для инжекции репозиториев
@Module({
  providers: [
    {
      provide: OrderService,
      useFactory: (ds: DataSource) => new OrderService(ds.getRepository(OrderEntity)),
      inject: [DataSource],
    },
  ],
})
export class OrderModule {}
```

---

## 🔍 Диагностика частых проблем

### "Nest can't resolve dependencies of TypeOrmCoreModule"
→ Используется `@nestjs/typeorm`. Заменить на `DataSource` factory (ADR-001, ADR-005).

### "column does not exist" после перезапуска
→ init SQL не запустился повторно. Пересоздай контейнер: `docker compose down -v && docker compose up -d`

### gRPC Internal Error при правильном readiness
→ Схема БД неполная. Проверь init SQL, проверь что миграции применились.

### Kafka duplicate messages
→ Нет идемпотентности. Добавь проверку `eventId` в `processed_events` перед обработкой.

### Jest не находит тесты после изменений
→ Вероятно `.js` файлы в `src/`. Найди: `find apps libs tests -name "*.js" -path "*/src/*"`

---

## ✅ Решенные проблемы

| Проблема | Решение | Дата |
|----------|---------|------|
| Cross-DB JOIN в pdf.service.ts | Используем gRPC для order/counterparty/settings | 2026-04-27 |

---

## ⚠️ Правило: НЕ ДЕЛАТЬ Cross-DB JOIN

**Никогда** не делай SQL JOIN к таблицам других сервисов:
```sql
-- ❌ ЗАПРЕЩЕНО
JOIN other_db.orders o ON ...
JOIN counterparty_db.counterparties c ON ...

-- ✅ ПРАВИЛЬНО
-- Используй gRPC вызовы к соответствующим сервисам
const order = await firstValueFrom(this.orderClient.GetOrder({ order_id }))
const counterparty = await firstValueFrom(this.counterpartyClient.GetCounterparty({ id }))
```

---

## 📝 Открытые вопросы / TODO

_Добавляй вопросы которые требуют ответа или исследования_

| Вопрос | Приоритет | Добавлено |
|--------|-----------|----------|
| Исправить cross-DB JOIN в pdf.service.ts | High | 2026-04-27 |
| Интегрировать PDF generation в api-gateway | Medium | 2026-04-27 |

---

## 📅 Лог сессий

_Краткое резюме что делалось в каждой сессии_

| Дата | Что делали | Что узнали |
|------|-----------|-----------|
| 2026-04 | Рефакторинг api-gateway с @nestjs/typeorm на DataSource factory | Паттерн useFactory нужен для всех модулей, не только для DatabaseModule |
| 2026-04-27 | Docker + E2E tests fix | RoutingModule/TrackingModule не добавлены в imports array; Relaxed assertions в тестах; 165/175 тестов; gRPC networking требует depends_on |

### Сессия 2026-04-27 (Sprint 4 — PDF Generation)

**Что реализовали:**
1. MinIO (S3-compatible) в docker-compose для enterprise PDF storage
2. PdfService с PostgreSQL advisory lock — race condition handling
3. Lazy generation: только один запрос генерирует PDF, остальные poll
4. S3StorageService для upload в MinIO
5. PdfController с GET /invoices/:id/pdf endpoint
6. Unit tests (6 тестов)

**Что нашли и исправили:**
- ❌ Cross-DB JOIN в pdf.service.ts (JOIN к order_db, counterparty_db)
- ✅ Заменили на gRPC вызовы к order-service и counterparty-service
- 📝 Записали правило "Never do cross-DB JOIN" в MEMORY.md

**Паттерны которые записали:**
- PostgreSQL Advisory Lock (distributed lock без Redis)
- S3/MinIO Storage pattern
- Правило про рефлексию после каждой фичи

**Новые файлы:**
- apps/invoice-service/src/invoice/pdf.controller.ts
- apps/invoice-service/src/invoice/pdf.service.ts
- apps/invoice-service/src/invoice/pdf.service.spec.ts
- apps/invoice-service/src/invoice/pg-advisory-lock.ts
- apps/invoice-service/src/invoice/s3-storage.service.ts

**Коммит:** a497a33

---

## 📋 РЕФЛЕКСИЯ: Sprint 4 (2026-04-27)

### Чему научился

1. **PostgreSQL Advisory Lock — замена Redis для распределённого локинга**
   - `pg_try_advisory_lock(hash)` — non-blocking acquire
   - `pg_advisory_unlock(hash)` — release
   - Хеширование строкового ключа в int64
   - **Когда использовать:** операции которые должны выполняться только один раз (PDF generation, cache warming)

2. **MinIO как enterprise storage**
   - S3-compatible API — один код для dev (MinIO) и prod (AWS S3)
   - Легко поднять локально: `image: minio/minio`
   - `forcePathStyle: true` для MinIO (не требуется для AWS S3)
   - Health check: `mc ready local`

3. **Lazy PDF generation pattern**
   - Cache check → Acquire lock → Double-check cache → Generate → Release lock
   - Poll status для concurrent requests (max 30s)
   - Status states: null → generating → ready/failed

4. **Docker YAML структура**
   - Все сервисы должны быть внутри `services:` блока
   - minio/node-exporter были ВЫНЕ вне services (syntax error)

---

### Какие проблемы были

| # | Проблема | Как обнаружил | Последствия |
|---|----------|---------------|-------------|
| 1 | **Cross-DB JOIN в pdf.service.ts** | После реализации — рефлексия | Нарушение изоляции БД между сервисами |
| 2 | **minio/node-exporter вне services:** | `docker compose config` → syntax error | Docker не запускался |
| 3 | **ESM/CJS конфликт** | typecheck error | TypeScript не компилировал @logistics/document-templates |
| 4 | **gRPC возвращает Observable, не Promise** | typecheck error | firstValueFrom не работал |

---

### Как предотвращать

| # | Правило | Куда записано |
|---|---------|--------------|
| 1 | **Никогда НЕ делай cross-DB JOIN** | Pitfalls.md, MEMORY.md |
| 2 | **Всегда проверяй docker-compose.yml** | `docker compose config --quiet` после изменений |
| 3 | **Проверяй imports в NestJS modules** | Не забывать добавлять модули в imports[] |
| 4 | **gRPC клиент возвращает Observable** | Используй `firstValueFrom()` |
| 5 | **Рефлексия после каждой фичи** | Записано в 00-README.md |

---

### Рефлексия: E2E тесты для PDF

**Что было:**
- Существующий E2E тест: брал первый invoice из списка, не создавал свой
- Не проверял полный flow: order → invoice → PDF
- Не проверял concurrent requests

**Что сделано:**
- Добавлен full flow тест (create order → dispatch saga → poll invoice → PDF)
- Добавлен concurrent test (5 одновременных запросов)
- Проверка idempotency (все возвращают одинаковый PDF)

**Вывод:** E2E тесты должны имитировать реальное поведение пользователя (фронтенд), а не полагаться на существующие данные.

---

## 📋 УНИФИКАЦИЯ PDF GENERATION (2026-04-27) — ИТОГИ

### До унификации (проблема)

```
api-gateway: генерировал PDF на лету (generateInvoice из document-templates)
invoice-service: генерировал lazy + MinIO storage
↓ Дублирование логики!
```

### После унификации

```
GET /api/v1/invoices/:id/pdf
    │
    ▼
┌─────────────┐     gRPC          ┌──────────────────┐
│ api-gateway │ ──────────────── ▶│ invoice-service │
│             │                   │ (PdfService)    │
│             │ ◀─────────────── │ + MinIO storage │
│             │   { url: "..." }  └──────────────────┘
└─────────────┘
    │
    ▼
Response: 200 { "url": "http://minio:9000/invoices/..." }
```

### Что изменили

| # | Файл | Изменение |
|---|------|-----------|
| 1 | `libs/proto/src/invoice.proto` | + GetInvoicePdfUrl RPC method |
| 2 | `apps/invoice-service/src/invoice/invoice.grpc.controller.ts` | + GetInvoicePdfUrl handler |
| 3 | `apps/api-gateway/src/invoices/invoices.service.ts` | - generateInvoice(), + generateInvoicePdfUrl() |
| 4 | `apps/api-gateway/src/invoices/invoices.controller.ts` | - Buffer response, + JSON url |
| 5 | `apps/api-gateway/src/invoices/invoices.module.ts` | - ORDER_PACKAGE, COUNTERPARTY_PACKAGE |
| 6 | `apps/api-gateway/package.json` | - @logistics/document-templates |
| 7 | `tests/e2e/settings-invoices.spec.ts` | Обновлены ожидания (JSON url) |
| 8 | `docs/FEATURES.md` | Новая диаграмма архитектуры |

### Чему научился (унификация)

1. **Единая ответственность** — один сервис генерирует PDF, другой только проксирует
2. **Упрощение зависимостей** — удалили document-templates из api-gateway
3. **gRPC как API контракт** — Proto определяет что можно вызывать

### Рефлексия: проблемы и профилактика

| # | Проблема | Как предотвратить |
|---|----------|-------------------|
| 1 | Дублирование логики PDF generation | Думать о единой ответственности заранее |
| 2 | api-gateway делал too much | gRPC → microservices: proxy, не business logic |
| 3 | Лишние gRPC клиенты в api-gateway | Подключать только нужные сервисы |

### Коммиты

- `a497a33` — Sprint 4: PDF generation with MinIO/S3 storage
- `632eedc` — fix: docker-compose structure + MinIO test infra
- `<new>` — unify: PDF generation via invoice-service gRPC

### Сессия 2026-04-27 (подробно)

**Проблема:** 156/175 passed (89%), Routing и Tracking 404, relaxed assertions, gRPC тесты не работали из docker runner

**Решение:**
1. app.module.ts: добавлены RoutingModule, TrackingModule, NotificationsModule в imports
2. settings-invoices.spec.ts: исправлены 4 assertions
3. api-gateway.spec.ts: исправлены 6 assertions
4. docker-compose.test.yml: добавлены depends_on и env vars для gRPC хостов
5. grpc-cross.spec.ts: использует process.env.GRPC_*_HOST, waitForReady 30s
6. fleet/routing/order/tracking.service.spec.ts: используют GRPC_*_HOST env vars

**Финальные результаты:**
- Локально (без docker): 160/178 passed (gRPC тесты падают без запущенных сервисов)
- Docker runner: 154/178 passed (улучшение с 152)

**Ресурсы:**
- `docker-compose.test.yml` — e2e-test-runner с depends_on на все сервисы
- `Dockerfile.test` — образ для e2e тестов

---

## 🐛 Новые известные проблемы (2026-04-27)

| Проблема | Где | Причина | Решение |
|----------|-----|---------|---------|
| gRPC тесты не работают из docker runner | tests/e2e/grpc-*.spec.ts | spec файлы используют localhost напрямую | Использовать process.env.GRPC_*_HOST (исправлено в 5 файлах) |

## 📝 gRPC Tests в Docker

**Файлы для E2E gRPC тестов:**
- `tests/e2e/grpc-cross.spec.ts` — cross-service тесты
- `tests/e2e/fleet.service.spec.ts`
- `tests/e2e/routing.service.spec.ts`
- `tests/e2e/order.service.spec.ts`
- `tests/e2e/tracking.service.spec.ts`

**Все должны использовать env vars:**
```typescript
const GRPC_HOST = process.env.GRPC_FLEET_HOST || 'localhost:50053'
```

**Запуск в docker runner:**
```bash
docker compose -f docker-compose.yml -f docker-compose.services.yml -f docker-compose.test.yml run --rm e2e-test-runner
```

**Важно:** e2e-runner depends_on сервисы, но grpc-cross имеет свой waitForReady с timeout 30s

---

## ⚠️ ВАЖНО: Куда писать знания

> **Бэкенд сессия → `.agents/backend/MEMORY.md`**
> **Фронтенд сессия → `.agents/frontend/MEMORY.md`**
> **Общие знания → `.agents/MEMORY.md` (корень проекта)**

**Проверяй `.agents/backend/MEMORY.md` в начале каждой бэкенд задачи!**

---

## Рефлексия: ESLint Strict Mode (2026-04-27)

### Что сделали:
- very strict eslint: `@typescript-eslint/recommended-type-checked` + `strict-type-checked`
- `strictNullChecks: true` во всех `apps/*/tsconfig.json`

### Найденные ловушки:

| Ловушка | Решение |
|---------|---------|
| `@typescript-eslint/use-unknown-in-catch-variables` не существует в v7 | Убрать из rules |
| `no-misused-promises` options format отличается в v7 | Использовать `error` без options |
| `strictNullChecks=false` в tsconfig apps | Переопределяет base → исправить все |
| strict в base было ДО strictNullChecks → ESLint не видел | Переставить порядок |
| gRPC Observable → any при типизации | Паттерн: typed wrapper или assertion |
| TypeORM `query()` возвращает `any` | `const rows = await q.query(sql) as TypedRow[]` |
| empty class в KafkaUtilsModule | `eslint-disable @typescript-eslint/no-extraneous-class` |

### Паттерны:

- **Logger initialization:**
  ```typescript
  private readonly logger = new Logger(ClassName.name);
  ```
- **TypeORM typed query:**
  ```typescript
  const rows = await queryRunner.query(sql) as TypedRow[];
  ```
- **Kafka PromiseSettledResult:**
  ```typescript
  interface PublishResult {
    status: 'fulfilled' | 'rejected';
    reason?: unknown;
  }
  ```
- **NestJS type imports:**
  ```typescript
  import type { Logger } from '@nestjs/common';
  ```

### Новые/изменённые файлы:

| Файл | Изменение |
|------|-----------|
| `.eslintrc.json` | very strict rules |
| `tsconfig.base.json` | strictNullChecks переставлен после strict |
| `apps/*/tsconfig.json` | strictNullChecks:true добавлен |

### Оставшиеся ошибки lint (до полного исправления):

| Сервис | errors | Фокус |
|--------|--------|-------|
| fleet-service | ~50 | gRPC Observable → any |
| order-service | ~30 | gRPC + entity |
| api-gateway | ~20 | gRPC client wrappers |
| invoice-service | ~10 | minor |
| others | ~3 | мелочи |

**Всего:** 113 errors после ~30 мин работы

---

## 🏗️ Архитектурные наблюдения

_Вещи которые стоит улучшить в будущем, но не срочно_

| Наблюдение | Предложение | Приоритет |
|-----------|-------------|-----------|
| In-memory idempotency Set теряется при рестарте | Мигрировать все сервисы на DB-based IdempotencyGuard | Medium |
| Нет единого базового класса Kafka consumer | Создать `BaseConsumer` в `libs/kafka-utils` с встроенной идемпотентностью | Low |