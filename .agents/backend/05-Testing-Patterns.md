### 📄 `05-Testing-Patterns.md` (Исправлен конфликт Jest + сжат)

```markdown
# 05-Testing-Patterns.md — Паттерны тестирования

> Копируй структуру, адаптируй имена. Не меняй тест под баг — чини причину.
> 🔄 Обновляй при: новом рабочем паттерне, изменении конфига, добавлении типа тестов.

---

## 🧪 Иерархия и правила
| Тип | Что тестирует | Запуск | Правило |
|-----|--------------|--------|---------|
| **Unit** | Чистая логика, сервисы | `pnpm test` | Мокай всё внешнее. Прямая инстанциация > Nest DI |
| **Integration** | gRPC, Kafka, БД | `./scripts/run-tests.sh --grpc-only` | Реальные порты, изолированные `*_test` БД |
| **E2E** | Полный flow через HTTP | `./scripts/run-tests.sh --up --health --down` | Нужна живая infra. Не полагайся на статичные данные |
| **Load** | k6 сценарии | `k6 run infra/k6/load-test.js` | Только после прохождения E2E |

**Золотое правило**: `AAA` (Arrange → Act → Assert). Один тест = одно поведение. Имя описывает результат: `should throw ConflictException on version mismatch`.

---

## ⚙️ Jest Config: Разделение (КРИТИЧНО)

### Unit-тесты (быстро, без `.js` в `src/`)
```javascript
// apps/*/jest.config.js
transform: { '^.+\\.ts$': ['ts-jest', { isolatedModules: true }] }
```

### E2E-тесты (отключаем Babel, решаем парсинг-ошибки)
```javascript
// tests/e2e/jest.config.js
transform: {
  '^.+\\.ts$': ['ts-jest', {
    tsconfig: 'tests/e2e/tsconfig.json',
    useIsolatedModules: false // ⚠️ Отключает Babel под капотом ts-jest
  }]
}
```
> 📌 **Правило**: Если видишь `SyntaxError: Unexpected token` в E2E → проверь `useIsolatedModules: false`.

---

## 🛠 Unit: Сервисы с gRPC-клиентами
```typescript
// ✅ Прямая инстанциация (надёжнее Test.createTestingModule)
const grpcMock = {
  getService: jest.fn().mockReturnValue({
    getAvailableVehicles: jest.fn().mockResolvedValue({ vehicles: [] }),
    assignVehicle: jest.fn().mockResolvedValue({ success: true }),
  }),
};

const mockConfig = { get: jest.fn().mockReturnValue('localhost') };

let service: OrderService;
beforeEach(() => {
  service = new OrderService(mockConfig as any, grpcMock as any);
  service.onModuleInit();
});
```

---

## 🔌 Integration: gRPC & Kafka
```typescript
// gRPC: всегда тестируй реальный метод, не только waitForReady()
await new Promise<void>((resolve, reject) => {
  client.waitForReady(Date.now() + 10_000, (err) => err ? reject(err) : resolve());
});
const res = await new Promise<any>((res, rej) => 
  client.getAvailableVehicles({ origin: 'health-check' }, (e, r) => e ? rej(e) : res(r))
);
expect(Array.isArray(res.vehicles)).toBe(true);

// Kafka: проверяй envelope
expect(event.eventId).toBeDefined();
expect(event.source).toBe('order-service');
expect(event.type).toBe('order.created');
```

---

## 🌐 E2E: API & DB Isolation
```typescript
// E2E: используй тестовые префиксы для лёгкой очистки
const TEST_PREFIX = `test-${Date.now()}`;
await pool.query(`DELETE FROM orders WHERE customer_id LIKE $1`, [`${TEST_PREFIX}%`]);

// DB Isolation: проверяй порты из ADR-004
const TEST_DBS = {
  order: 6401, fleet: 6402, routing: 6403,
  tracking: 6404, dispatcher: 6405, counterparty: 6406, invoice: 6407
};
```

---

## 🚀 Быстрый запуск
```bash
pnpm test                          # Unit (все)
pnpm --filter @logistics/order test # Unit (один)
./scripts/run-tests.sh --up --health --down # E2E полный цикл
./scripts/run-tests.sh --grpc-only # Только gRPC
./scripts/run-tests.sh --kafka-only # Только Kafka
```

---
💡 **Meta**: Если тест падает >3 раз подряд → проверь `03-Pitfalls.md#testing`. Не мокай то, что тестируешь.
```

---

### 📄 `06-Processes.md` (Runbook-стиль, убраны планы)

```markdown
# 06-Processes.md — Runbook & Checklists

> Чеклисты и процессы. Не запоминай — читай перед действием.
> 🔄 Обновляй при: изменении CI/CD, новом типе задач, находке более быстрого способа.

---

## 🚀 Feature Dev Flow
1. `MEMORY.md` → что уже знаем?
2. `AGENTS.md` → READ → THINK → DO → UPDATE
3. План (>50 строк) → Architect check → подтверждение
4. Tests first → Unit → Integration → E2E
5. `pnpm lint && pnpm typecheck && pnpm build`
6. Коммит → ОБНОВИТЬ доки

---

## 🧩 Создание нового сервиса
```bash
nx g @nx/node:app новый-сервис --directory=apps
# 1. Скопировать DatabaseModule из 04-Good-Practices
# 2. Добавить в docker-compose.yml + init SQL (infra/postgres/)
# 3. Портировать pgbouncer на 640X (ADR-004)
# 4. Обновить: docs/SERVICES.md, docs/COMMUNICATION.md, 00-README.md, AGENTS.md
```

---

## 🔌 Добавление gRPC / Kafka
| Шаг | gRPC | Kafka |
|-----|------|-------|
| 1 | `libs/proto/service.proto` | Топик в `docker-compose.yml` (kafka-init) |
| 2 | `pnpm --filter @logistics/proto build` | Payload в `libs/kafka-utils/src/events/` |
| 3 | Реализовать `@GrpcMethod()` | Publisher через **Outbox** |
| 4 | Клиент в зависимом сервисе | Consumer с **IdempotencyGuard** |
| 5 | Интеграционный тест | Интеграционный тест |
| 6 | `02-Contracts.md` + `docs/COMMUNICATION.md` | `02-Contracts.md` + `docs/COMMUNICATION.md` |

---

## 🔍 Debugging — по симптому
| Симптом | Команда | Решение |
|---------|---------|---------|
| `Nest can't resolve dependencies` | `grep -r "@nestjs/typeorm" apps/` | Заменить на `DataSource` factory (ADR-001) |
| `column does not exist` | `docker compose down -v && up -d` | Init SQL не применился → пересоздай контейнер |
| gRPC `Internal Error` | `docker compose exec postgres psql -U logistics -d order_db -c "\dt"` | Проверь схему БД + трейс в Jaeger (`localhost:16686`) |
| Kafka consumer lag | `http://localhost:8080` → Consumer Groups | Проверь `processed_events` и `retryCount` |
| Jest не находит тесты | `find apps libs -name "*.js" -path "*/src/*" -delete` | Удали скомпилированные `.js`, проверь `isolatedModules` |

---

## ✅ Pre-commit & Code Review Checklist
- [ ] Нет `process.env` → только `configService.get()`
- [ ] Нет `@nestjs/typeorm` → только `DataSource`
- [ ] Нет HTTP между сервисами
- [ ] Kafka publish → **только через Outbox**
- [ ] Kafka consumer → **IdempotencyGuard**
- [ ] Конкурентные сущности → `@VersionColumn`
- [ ] Нет `any` без обоснования
- [ ] Тесты написаны и проходят
- [ ] Документация обновлена
- [ ] Нет secrets в коде

---
💡 **Meta**: Если процесс устарел или появился быстрее → замени, не копи.
```

---

### 📄 `MEMORY.md` (Live State, без истории)

```markdown
# MEMORY — Текущее состояние проекта

> 🎯 Первый файл для чтения. Содержит только **актуальные факты, открытые проблемы и критические правила**.
> 🔄 Обновляй в конце каждой сессии. Переноси решённое в архив или удаляй.
> ⏱ Агенту читать только секции `🔴 КРИТИЧЕСКИЕ ФАКТЫ` и `🛠 Активные проблемы`.

---

## 🔴 КРИТИЧЕСКИЕ ФАКТЫ (Знать обязательно)
| Факт | Контекст |
|------|----------|
| `@nestjs/typeorm` сломан в Docker/pnpm | Используй `new DataSource()` напрямую (ADR-001) |
| gRPC порты (Docker → localhost) | order=50051, invoice=50052, fleet=50053, routing=50054, tracking=50055, dispatcher=50056, counterparty=50057 |
| NestJS версии | Только `10.x`. Root `^11.x` ломает Docker-сборку |
| `git checkout -- .` | Откатывает ВСЁ. Используй `git restore path/to/file` |
| E2E Babel-ошибка | В `tests/e2e/jest.config.js` → `useIsolatedModules: false` |
| Init SQL | Запускается только при первом старте. При `column does not exist` → `docker compose down -v && up -d` |

---

## 🛠 Активные проблемы / TODO
| Проблема | Статус | Временное решение | Правильное решение |
|----------|--------|-------------------|-------------------|
| `counterparty-service`, `invoice-service` DI error | 🔴 High | Заглушки в модулях | Исправить `useFactory` и зависимости |
| E2E gRPC timeouts | 🟡 Medium | Локальный `pnpm start:dev` + env vars | Исправить `docker-compose.test.yml` network |
| `document-templates` ESM/CJS конфликт | 🟡 Medium | `esModuleInterop: true` + `require()` | Перевести либу на ESM или вынести в shared |

---

## ✅ Подтверждённые паттерны (быстрая справка)
```typescript
// DataSource Factory (@Global)
@Global() @Module({ providers: [{ provide: DataSource, useFactory: async (cfg) => { const ds = new DataSource({...}); await ds.initialize(); return ds; }, inject: [ConfigService] }], exports: [DataSource] })
export class DatabaseModule {}

// Unit-тест сервиса с gRPC
const grpcMock = { getService: jest.fn().mockReturnValue({ method: jest.fn() }) };
const service = new MyService(mockConfig as any, grpcMock as any);
service.onModuleInit();
```

---

## 🔍 Диагностика частых проблем
| Ошибка | Причина | Решение |
|--------|---------|---------|
| `Nest can't resolve dependencies` | `@nestjs/typeorm` | Заменить на `DataSource` factory |
| `column does not exist` | Init SQL не применился | `docker compose down -v && up -d` |
| gRPC `Internal Error` | Схема БД неполная | Проверить `\dt` + Jaeger трейс |
| Kafka дубли | Нет идемпотентности | Проверять `eventId` в `processed_events` |
| Jest не находит тесты | `.js` в `src/` | `find ... -name "*.js" -path "*/src/*" -delete` |

---

## 📜 Архив сессий (для контекста, не читать при старте)
<details>
<summary>28.04.2026 — Fix build, tests, ports, ESM/CJS</summary>
- Исправлены порты в AGENTS.md под docker-compose
- Unit: 97/97 ✅
- E2E Babel fixed (`useIsolatedModules: false`)
- ESLint strict mode enabled, ts-jest разделён (Unit/E2E)
- PDF generation унифицирован через invoice-service + MinIO
</details>

---
📝 **Правило**: Если вопрос решён >3 дня назад → перенеси в `01-ADRs.md` или `03-Pitfalls.md` и удали отсюда. Не накапливай историю.
```

---