# Backend Agent — Справочник для AI ассистентов

> "Как работать с backend частью проекта"

---

## 🎯 Главный принцип

**Эволюционируй вместе с проектом.** Нашёл новый паттерн или ошибку → запиши в `.agents/backend/`:

| Что нашёл | Куда |
|----------|------|
| Решение после проблемы | `01-ADRs.md` |
| Межсервисный контракт | `02-Contracts.md` |
| Антипаттерн (не делать) | `03-Pitfalls.md` |
| Правильный паттерн (делать) | `04-Good-Practices.md` |
| Паттерн тестирования | `05-Testing-Patterns.md` |
| Процесс работы | `06-Processes.md` |

---

## ⚡ ПРАВИЛО: РЕФЛЕКСИЯ ПОСЛЕ КАЖДОЙ ФИЧИ

После реализации любой фичи — ответь на вопросы:

| Вопрос | Если "да" → действие |
|--------|---------------------|
| Нарушил изоляцию БД? | Записать в MEMORY, исправить |
| Есть race conditions? | Добавить lock |
| Нужен повторяемый паттерн? | Записать в Good-Practices |
| Изменил контракт? | Обновить Contracts.md |
| Изменил схему БД? | Обновить DATABASE.md |

**Без рефлексии — не коммитить!**

---

## Команды

```bash
# Dev
pnpm install
pnpm build
pnpm start:dev

# Один сервис
pnpm --filter @logistics/order-service start:dev

# Tests
pnpm test
pnpm test:e2e

# Линтинг
pnpm lint
pnpm typecheck
```

---

## Сервисы

```
apps/
├── api-gateway/         # Main API, HTTP 3000
├── order-service/    # Заказы, gRPC 50051
├── fleet-service/    # Транспорт, gRPC 50052
├── routing-service/ # Маршруты, gRPC 50053
├── tracking-service/ # GPS трекинг, gRPC 50054
├── dispatcher-service/ # Диспетчеризация, gRPC 50055
├── counterparty-service/ # Контрагенты
└── invoice-service/ # Счета
```

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

## Важно!

- **Stack**: NestJS + TypeScript + TypeORM + PostgreSQL + gRPC + Kafka + Docker
- **Monorepo**: Nx
- **ADR-001**: TypeORM через DataSource напрямую (не @nestjs/typeorm)
- Все контракты смотри в `02-Contracts.md`
- Все антипаттерны смотри в `03-Pitfalls.md`