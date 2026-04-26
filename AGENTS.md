# logistics-optimizer

> NestJS микросервисный монопроект (Nx) для оптимизации логистических маршрутов

---

## 🎯 Главный принцип

**Эволюционируй вместе с проектом.** Нашёл новый паттерн или ошибку → запиши в `.agents/backend/`:

| Что нашёл | Куда |
|----------|------|
| Решение после проблемы | `.agents/backend/01-ADRs.md` |
| Межсервисный контракт | `.agents/backend/02-Contract-Checklist.md` |
| Антипаттерн (не делать) | `.agents/backend/03-Pitfalls.md` |
| Правильный паттерн (делать) | `.agents/backend/04-Good-Practices.md` |
| Паттерн тестирования | `.agents/backend/05-Testing-Patterns.md` |
| Процесс работы | `.agents/backend/06-Processes.md` |

Не уверен куда → спроси пользователя.

---

## Команды

```bash
pnpm install          # Установка зависимостей
pnpm build           # Сборка всех сервисов
pnpm start:dev       # Dev: все сервисы параллельно
pnpm test:e2e        # E2E тесты (требуют infra)
pnpm lint            # Линтинг всех
pnpm typecheck       # Проверка типов
docker compose up -d # Infra: Kafka, PG×8, Grafana, Jaeger

# Один сервис
pnpm --filter @logistics/order-service start:dev

# E2E тесты
./scripts/run-tests.sh --up --health --down
./scripts/run-tests.sh --db-only | --grpc-only | --kafka-only
```

---

## ❌ Антипаттерны (НЕ делать)

Полный список: `.agents/backend/03-Pitfalls.md`

- **process.env** → `ConfigService.get()` (ломается в Docker)
- **synchronize: true** → `synchronize: NODE_ENV === 'development'`
- **Kafka без идемпотентности** → проверять `eventId` перед обработкой
- **`any` в коде** → всегда типизировать
- **Seed в apps/** → `infra/postgres/seeds/*.sql`
- **`git checkout -- .`** → `git restore`
- **@nestjs/typeorm в Docker** → используй `DataSource` напрямую

---

## ✅ Правильные паттерны

Шаблоны для копирования: `.agents/backend/04-Good-Practices.md`

- **ConfigService** — не process.env
- **DataSource Factory** — TypeORM без @nestjs/typeorm
- **Transactional Outbox** — гарантированная доставка событий
- **Idempotent Consumer** — обработка дубликатов
- **Saga с компенсацией** — распределённые транзакции
- **Optimistic Locking** — защита от race conditions

---

## ADR (Architecture Decision Records)

Актуальные решения: `.agents/backend/01-ADRs.md`

| ID | Решение | Дата |
|----|---------|------|
| ADR-001 | TypeORM через DataSource | 2026-04 |
| ADR-002 | Outbox pattern | 2026-03 |
| ADR-003 | API versioning (/api/v1/) | 2026-02 |
| ADR-004 | Test DB: `_test` + ports 6400+ | 2026-04 |

---

## Observability

| Инструмент | URL |
|-----------|-----|
| Grafana | http://localhost:3001 (admin/admin) |
| Jaeger | http://localhost:16686 |
| Kafka UI | http://localhost:8080 |
| Prometheus | http://localhost:9090 |

---

## Pre-commit

```bash
pnpm lint && pnpm typecheck && pnpm build
```

---

## Документация

- `docs/SERVICES.md` — детальное описание сервисов
- `docs/COMMUNICATION.md` — gRPC методы, Kafka события
- `docs/PROJECT.md` — общая архитектура