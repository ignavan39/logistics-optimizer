# 🚚 Logistics Route Optimizer

> **Микросервисная система оптимизации логистических маршрутов**  
> NestJS · Kafka · gRPC · PostgreSQL+PostGIS · OpenTelemetry · Grafana · Jaeger

---

## 📐 Архитектура

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            api-gateway (HTTP/REST)                       │
│                        JWT · Rate Limit · Swagger                        │
└────┬────────┬─────────────────────────────────────┬──────────┬───────────┘
     │ gRPC   │ gRPC                                 │ gRPC     │ gRPC
     ▼        ▼                                      ▼          ▼
┌─────────┐ ┌────────────┐  Kafka Events   ┌──────────────┐ ┌──────────────┐
│  order  │ │   fleet    │◄────────────────│  dispatcher  │ │   tracking   │
│ service │ │  service   │                 │  (Saga orch) │ │   service    │
│  PG+OB  │ │ PG+PostGIS │                 │  PG+Outbox   │ │ PG partioned │
└────┬────┘ └─────┬──────┘                 └──────┬───────┘ └──────────────┘
     │ Kafka      │ Kafka                          │ gRPC
     │            │                                ▼
     └────────────┴──────────────────────► routing-service
                       order.created             PG+PostGIS
                       order.updated             A* · VRP
                       vehicle.status            Graph cache
```

### Сервисы

| Сервис | Отвечает за | БД | Порт gRPC |
|---|---|---|---|
| `api-gateway` | REST API, auth, aggregation | — | — |
| `order-service` | Жизненный цикл заказов, state machine | PG + Outbox | 50051 |
| `fleet-service` | Автопарк, водители, геозоны | PG + PostGIS | 50052 |
| `routing-service` | Маршруты, A\*/VRP, ETA, пересчёт | PG + PostGIS | 50053 |
| `tracking-service` | GPS телеметрия, 8k msg/sec, streaming | PG partitioned | 50054 |
| `dispatcher-service` | Saga orchestrator, dispatch flow | PG | 50055 |

---

## 🚀 Быстрый старт

### 1. Предварительные требования

```bash
docker --version    # >= 24.0
docker compose version  # >= 2.20
node --version      # >= 20.0
pnpm --version      # >= 9.0
```

### 2. Клонирование и настройка

```bash
git clone https://github.com/yourname/logistics-optimizer
cd logistics-optimizer

# Копируем переменные окружения
cp .env.example .env

# Устанавливаем зависимости
pnpm install
```

### 3. Поднимаем инфраструктуру

```bash
# Только инфра (Kafka, PG×5, Prometheus, Grafana, Jaeger)
docker compose up -d

# Ждём готовности (30-60 сек)
docker compose ps

# Проверяем Kafka топики
docker compose logs kafka-init
```

### 4. Запуск сервисов (development)

```bash
# Все сервисы параллельно
pnpm start:dev

# Или отдельный сервис
pnpm --filter @logistics/order-service start:dev
```

### 5. Поднимаем симуляторы

```bash
# GPS телеметрия (300 машин, 2 Гц → ~600 msg/sec)
cd infra/telemetry-sim && node telemetry-sim.js

# Дорожные инциденты
cd infra/traffic-sim && node traffic-sim.js
```

---

## 📊 Observability

| Инструмент | URL | Что смотреть |
|---|---|---|
| **Grafana** | http://localhost:3001 (admin/admin) | Дашборды: Kafka lag, gRPC latency, PG pool, tracking throughput |
| **Jaeger** | http://localhost:16686 | Трейсы end-to-end: OrderCreated → RouteAssigned |
| **Kafka UI** | http://localhost:8080 | Топики, consumer groups, offsets, lag |
| **Prometheus** | http://localhost:9090 | Raw метрики всех сервисов |

---

## 🔑 Ключевые паттерны

### Transactional Outbox
```
order-service: createOrder()
  └── BEGIN TRANSACTION
      ├── INSERT INTO orders (...)
      └── INSERT INTO outbox_events (event_type='order.created', payload=...)
      COMMIT
      
OutboxProcessor (1s poll):
  └── SELECT FOR UPDATE SKIP LOCKED
      ├── kafka.produce(event_type, payload)
      └── UPDATE outbox_events SET processed_at = NOW()
```

### Idempotent Consumers
Каждый Kafka-консюмер перед обработкой проверяет `eventId` в таблице `processed_events`. При дубле — молча пропускает.

### Dispatch Saga с компенсацией
```
OrderCreated
  → FindVehicle       (fleet-service gRPC)
  → CalculateRoute    (routing-service gRPC)
  → AssignVehicle     (fleet-service gRPC, optimistic lock)
  → UpdateOrderStatus (order-service gRPC)
  → OrderAssigned ✓

При ошибке на любом шаге:
  → ReleaseVehicle (если была назначена)
  → Retry × 5 с exponential backoff (1s → 2s → 4s → 8s → 16s)
  → OrderFailed (после 5 попыток)
```

### Backpressure в tracking-service
```
TelemetryConsumer.handleTelemetry()
  → if batchWriter.isOverloaded():
      consumer.pause([partition])
      batchWriter.onNextFlush(() => consumer.resume([partition]))
  → batchWriter.enqueue(record)

BatchWriter:
  → accumulate в очереди
  → flush каждые 200ms или при 500 записей
  → bulk INSERT через unnest() → ~50k rows/sec
```

---

## 🧪 Нагрузочное тестирование

```bash
# Установить k6
brew install k6  # или https://k6.io/docs/get-started/installation/

# Запустить сценарий
k6 run \
  --env BASE_URL=http://localhost:3000 \
  --env JWT_TOKEN=your-token \
  infra/k6/load-test.js

# Ожидаемые результаты:
# ✓ order_create_latency p95 < 200ms
# ✓ eta_request_latency  p95 < 150ms
# ✓ error_rate           < 1%
# ✓ throughput           500+ RPS
```

---

## 📁 Структура monorepo

```
├── apps/
│   ├── api-gateway/        REST, JWT, rate-limit, gRPC aggregation
│   ├── order-service/      Orders CRUD + state machine + Outbox
│   ├── fleet-service/      Vehicles, drivers, PostGIS queries
│   ├── routing-service/    A*/Dijkstra/VRP + route cache
│   ├── tracking-service/   High-throughput Kafka + batch PG write
│   └── dispatcher-service/ Saga orchestrator
├── libs/
│   ├── proto/              *.proto definitions (single source of truth)
│   ├── kafka-utils/        Outbox, IdempotencyGuard, BaseConsumer
│   └── db-utils/           Migrations, PostGIS helpers
├── infra/
│   ├── docker-compose.yml         Infrastructure (Kafka, PG, observability)
│   ├── docker-compose.services.yml App services overlay
│   ├── postgres/                  DB init SQL scripts
│   ├── prometheus/                Scrape config
│   ├── grafana/                   Dashboards + provisioning
│   ├── k6/                        Load test scenarios
│   ├── telemetry-sim/             GPS vehicle simulator
│   └── traffic-sim/               Traffic incident generator
└── docs/
    └── architecture.md
```

---

## ✅ Чек-лист качества

- [x] Все межсервисные вызовы: gRPC (синхрон) или Kafka (асинхрон). Никакого HTTP между сервисами
- [x] Каждый сервис — отдельная БД. Нет cross-service joins
- [x] Transactional Outbox + Idempotent consumers. Гарантия доставки
- [x] Optimistic locking в fleet-service и order-service
- [x] Backpressure в tracking-service (pause/resume Kafka partition)
- [x] Dispatch Saga с компенсирующими транзакциями и retry
- [x] OpenTelemetry трейсинг во всех сервисах
- [x] `docker compose up -d` поднимает всё за 1 команду
- [x] Strict TypeScript (`noImplicitAny`, `strictNullChecks`)
- [x] Структурированные JSON-логи с уровнями
- [x] `.env.example` с документацией всех переменных
- [x] k6 нагрузочный тест с пороговыми значениями
