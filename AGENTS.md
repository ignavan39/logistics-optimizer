# AGENTS.md — Logistics Route Optimizer

> NestJS микросервисный монорепо (Nx). Stack: NestJS · TypeScript · TypeORM · PostgreSQL+PostGIS · gRPC · Kafka · Docker · OpenTelemetry

---

## 🔄 ПРОТОКОЛ: READ → THINK → DO → UPDATE

Это не пожелание. Это обязательный порядок работы с проектом.

### 1. READ — перед любой задачей
```
Любая задача  →  .agents/MEMORY.md            (что уже знаем, открытые вопросы)
Backend задача  →  .agents/backend/00-README.md  (архитектура + правила)
Frontend задача →  .agents/frontend/00-README.md (архитектура + правила)
>1 сервиса     →  .agents/backend/02-Contracts.md
Пишем тесты    →  .agents/backend/05-Testing-Patterns.md
```

### 2. THINK — перед написанием кода

**Для задачи >50 строк — обязательно:**
1. Изложи план с декомпозицией
2. Укажи какие сервисы/файлы затрагиваются
3. Укажи какие контракты меняются
4. Получи подтверждение → только потом код

**Architect check — задай себе вопросы:**
- Не нарушает ли это изоляцию БД между сервисами?
- Нет ли HTTP между сервисами (только gRPC/Kafka)?
- Нужен ли Outbox для гарантии доставки?
- Нужна ли идемпотентность на консьюмере?
- Нужен ли optimistic lock для этой сущности?

### 3. DO — выполни задачу
- Следуй `.agents/backend/04-Good-Practices.md`
- Избегай `.agents/backend/03-Pitfalls.md`
- Tests First: сначала тест, потом реализация

### 4. UPDATE — **обязательный последний шаг**

После каждой задачи ответь на эти вопросы. Каждый "да" = обновление файла до конца сессии:

| Вопрос | Файл |
|--------|------|
| Решил нестандартную проблему? | `.agents/backend/01-ADRs.md` |
| Наткнулся на неочевидную ловушку (>15 мин отладки)? | `.agents/backend/03-Pitfalls.md` |
| Использовал паттерн, который стоит повторять? | `.agents/backend/04-Good-Practices.md` |
| Изменил gRPC метод или Kafka топик? | `.agents/backend/02-Contracts.md` + `docs/COMMUNICATION.md` |
| Изменил схему БД? | `docs/DATABASE.md` |
| Добавил/удалил REST endpoint? | `docs/API.md` |
| Добавил новый сервис или изменил ответственность? | `docs/SERVICES.md` |
| Узнал что-то важное о проекте? | `.agents/MEMORY.md` |

**Правило**: если не уверен нужно ли обновлять — обновляй. Лишняя запись лучше потери знания.

---

## Архитектура системы

```
┌──────────────────────────────────────────────────────────────┐
│                    api-gateway :3000                          │
│           JWT · Rate Limit · Swagger · WebSocket             │
└──┬──────┬────────┬────────┬────────┬─────────┬──────────────┘
   │gRPC  │gRPC    │gRPC    │gRPC    │gRPC     │gRPC
   ▼      ▼        ▼        ▼        ▼         ▼
order  fleet   routing  tracking counterparty dispatcher
:50051 :50052  :50053   :50054   :50056       :50055
pg-ord pg-flt  pg-rut   pg-trk   pg-cnt       pg-dis
                                              (Saga orch)
       Kafka Events ──────────────────────────────▲
       order.created / order.updated / vehicle.telemetry
```

| Сервис | gRPC порт | БД | Ключевые паттерны |
|--------|-----------|-----|-------------------|
| api-gateway | — (HTTP 3000) | pg-auth | JWT, RBAC, WebSocket |
| order-service | 50051 | pg-order | Outbox, State Machine, Tariff Snapshots |
| fleet-service | 50052 | pg-fleet+PostGIS | OptimisticLock, PostGIS proximity |
| routing-service | 50053 | pg-routing+PostGIS | Route cache, A*/VRP |
| tracking-service | 50054 | pg-tracking | Backpressure, Batch writes, Partitioning |
| dispatcher-service | 50055 | pg-dispatcher | Saga, Compensation, Retry x5 |
| counterparty-service | 50056 | pg-counterparty | OptimisticLock, Zone tariffs |
| invoice-service | 50057 | pg-invoices | PDF gen, VAT calc |

**Правила архитектуры (нарушать запрещено):**
- Межсервисное общение: только gRPC (sync) или Kafka (async). HTTP между сервисами — запрещено
- Каждый сервис имеет свою БД. Cross-service JOIN — запрещён
- Внешние ключи между БД — только soft references (UUID без FK constraint)

---

## Команды

```bash
# Инфраструктура
docker compose up -d                          # Kafka, PG×7, Prometheus, Grafana, Jaeger

# Разработка
pnpm install
pnpm start:dev                                # Все сервисы параллельно
pnpm --filter @logistics/order-service start:dev  # Один сервис

# Тесты
pnpm test                                     # Unit тесты
pnpm test:e2e                                 # E2E тесты (нужна infra)
./scripts/run-tests.sh --up --health --down  # E2E полный цикл
./scripts/run-tests.sh --grpc-only           # Только gRPC тесты

# Качество кода
pnpm lint && pnpm typecheck && pnpm build    # Pre-commit чеклист
```

---

## Observability

| Инструмент | URL | Что смотреть |
|-----------|-----|--------------|
| Grafana | http://localhost:3001 (admin/admin) | Kafka lag, gRPC latency, PG pool |
| Jaeger | http://localhost:16686 | Traces: OrderCreated → RouteAssigned |
| Kafka UI | http://localhost:8080 | Topics, consumer groups, lag |
| Prometheus | http://localhost:9090 | Raw метрики |

---

## Детальная документация

| Файл | Содержимое |
|------|-----------|
| `docs/SERVICES.md` | Детальное описание каждого сервиса |
| `docs/COMMUNICATION.md` | Все gRPC методы и Kafka топики |
| `docs/DATABASE.md` | Схемы всех БД |
| `docs/API.md` | REST API reference |
| `docs/FEATURES.md` | Ключевые паттерны с кодом |
| `.agents/MEMORY.md` | Накопленные знания о проекте |
| `.agents/backend/` | Правила и паттерны для backend |
| `.agents/frontend/` | Правила и паттерны для frontend |