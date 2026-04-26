# Backend Agents — Справочник для AI ассистентов

> "Как работать с backend частью проекта" — основной документ для AI агентов.

---

## 🎯 Главный принцип

**Эволюционируй вместе с проектом.** Нашёл новый паттерн или ошибку → запиши в `.agents/backend/`:

| Что нашёл | Куда |
|----------|------|
| Решение после проблемы | `01-ADRs.md` |
| Межсервисный контракт | `02-Contract-Checklist.md` |
| Антипаттерн (не делать) | `03-Pitfalls.md` |
| Правильный паттерн (делать) | `04-Good-Practices.md` |
| Паттерн тестирования | `05-Testing-Patterns.md` |
| Процесс работы | `06-Processes.md` |

Не уверен куда → спроси пользователя.

---

## Стек

```bash
# Backend — NestJS microservices
- NestJS + TypeScript
- TypeORM + PostgreSQL
- gRPC + Kafka
- Docker + K8s
```

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

## Observability

| Инструмент | URL |
|-----------|-----|
| Grafana | http://localhost:3001 |
| Jaeger | http://localhost:16686 |
| Kafka UI | http://localhost:8080 |
| Prometheus | http://localhost:9090 |

---

## Структура сервисов

```
apps/
├── api-gateway/      # Main API
├── order-service/    # Заказы
├── fleet-service/    # Транспорт
├── routing-service/ # Маршруты
├── tracking-service/ # GPS трекинг
├── counterparty-service/ # Контрагенты
├── invoice-service/ # Счета
└── dispatcher-service/ # Диспетчеризация
```

---

## Важные файлы

- `AGENTS.md` — этот файл
- `.eslintrc.json` — ESLint правила
- `jest.config.ts` — Jest конфиг
- `docker-compose.yml` — Infra

---

## ❌ Антипаттерны

Смотри `.agents/backend/03-Pitfalls.md`

---

## ✅ Good Practices

Смотри `.agents/backend/04-Good-Practices.md`