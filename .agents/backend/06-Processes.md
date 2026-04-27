# Processes — Процессы работы

> Чеклисты и процессы. Не надо запоминать — читай перед действием.

---

## ⚡ Когда обновлять ЭТОТ файл

Обнови если:
- Изменился процесс разработки
- Нашёл более эффективный способ делать рутинное действие
- Добавился новый тип задач

---

## 🔧 Troubleshooting: Docker Services

```
# Quick health check
docker compose ps

# Check specific service
docker logs <container-name> --tail 20

# Rebuild single service
docker build --build-arg SERVICE=<service-name> -t logistics-<service-name>:latest .
docker run -d --name test-<service-name> --network <net-id> \
  -e SERVICE_NAME=<service-name> \
  -e DB_HOST=pg-<service-name> \
  logistics-<service-name>:latest

# Common errors:
# - TypeOrm "cannot resolve ModuleRef": NestJS version mismatch
# - "invalid uuid": check entity @PrimaryColumn type
```

---

## 📅 Next Session Plan

### Priority 1: Fix Services
1. Check NestJS versions consistency
   ```bash
   grep -r '"@nestjs' package.json | head -20
   ```
2. Fix version mismatch (11.x root → 10.x services)
3. Rebuild Docker images
4. Deploy and test

### Priority 2: Fix Tests
- Run unit: `pnpm test`
- Run e2e: `pnpm test:e2e`

### Priority 3: API Test
- Test full saga: auth → create order → assign vehicle → invoice

---

## Feature Development Flow

```
1. Read .agents/MEMORY.md              ← Что уже знаем?
2. Read .agents/backend/00-README.md   ← Архитектура?
3. Plan (>50 строк → обязательно)      ← Декомпозиция + архитектурный чек
4. Write tests first                   ← Unit + Integration
5. Implement                           ← По паттернам из 04-Good-Practices
6. pnpm lint && pnpm typecheck         ← Обязательно перед коммитом
7. UPDATE agent docs                   ← Что нового? (см. AGENTS.md чеклист)
```

---

## Создание нового сервиса

```bash
# 1. Создать приложение
nx g @nx/node:app новый-сервис --directory=apps

# 2. Настроить структуру
apps/новый-сервис/src/
├── main.ts
├── app.module.ts
├── shared/database/database.module.ts   ← скопировать шаблон из 04-Good-Practices
└── [feature]/
    ├── [feature].module.ts
    ├── [feature].service.ts
    ├── [feature].controller.ts (gRPC)
    └── entities/

# 3. Добавить в docker-compose.yml (infra/docker-compose.yml)
# 4. Создать init SQL (infra/postgres/init-[service].sql)
# 5. Добавить тестовый pgbouncer (порт 6408+)
# 6. Добавить proto в libs/proto/
# 7. Обновить docs/SERVICES.md
# 8. Обновить docs/COMMUNICATION.md (новые gRPC методы)
# 9. Обновить .agents/backend/00-README.md (таблица сервисов)
# 10. Обновить AGENTS.md (архитектурная схема)
```

---

## Добавление gRPC метода

```bash
# 1. Определить в libs/proto/service.proto
# 2. pnpm --filter @logistics/proto build
# 3. Реализовать в сервисе (@GrpcMethod decorator)
# 4. Добавить клиентский вызов в зависимом сервисе
# 5. Написать интеграционный тест
# 6. Обновить .agents/backend/02-Contracts.md
# 7. Обновить docs/COMMUNICATION.md
```

---

## Добавление Kafka события

```bash
# 1. Добавить топик в infra/docker-compose.yml (kafka-init)
# 2. Определить payload interface в libs/kafka-utils/src/events/
# 3. Реализовать publisher через Outbox
# 4. Реализовать consumer с IdempotencyGuard
# 5. Написать интеграционный тест
# 6. Обновить .agents/backend/02-Contracts.md
# 7. Обновить docs/COMMUNICATION.md
```

---

## Pre-commit чеклист

```bash
pnpm lint        # ESLint
pnpm typecheck   # TypeScript строгий режим
pnpm build       # Сборка (убеждаемся что нет ошибок компиляции)
pnpm test        # Unit тесты
```

---

## Code Review чеклист

- [ ] Нет `process.env` (только `configService.get`)
- [ ] Нет `@nestjs/typeorm` (только `DataSource`)
- [ ] Нет HTTP вызовов между сервисами
- [ ] Kafka publish через Outbox (не прямой вызов)
- [ ] Kafka consumer проверяет идемпотентность
- [ ] Конкурентно изменяемые сущности имеют `@VersionColumn`
- [ ] Нет `any` без явного обоснования
- [ ] Тесты написаны
- [ ] Документация обновлена
- [ ] Нет secrets в коде

---

## Debugging — по симптому

### "Nest can't resolve dependencies"
```bash
# 1. Ищем @nestjs/typeorm
grep -r "@nestjs/typeorm" apps/
# 2. Заменяем на DataSource factory (ADR-001, ADR-005)
```

### "column does not exist"
```bash
# init SQL не применился — пересоздаём контейнер
docker compose down -v
docker compose up -d
# Ждём 30-60 сек
docker compose ps
```

### gRPC Internal Error при правильном readiness
```bash
# Проверяем схему БД
docker compose exec postgres psql -U logistics -d order_db -c "\dt"
# Смотрим трейс в Jaeger
open http://localhost:16686
```

### Kafka consumer не получает сообщения
```bash
# Проверяем consumer group
open http://localhost:8080  # Kafka UI
# Ищем lag в consumer group
```

### Jest не находит тесты
```bash
# Ищем скомпилированные .js файлы в src/
find apps libs tests -name "*.js" -path "*/src/*"
# Удаляем их
find apps libs tests -name "*.js" -path "*/src/*" -delete
```

---

## Полезные команды

```bash
# Запуск инфраструктуры
docker compose up -d

# Запуск одного сервиса
pnpm --filter @logistics/order-service start:dev

# Логи сервиса
docker compose logs -f order-service

# Подключиться к БД
docker compose exec postgres psql -U logistics -d order_db

# Посмотреть outbox
docker compose exec postgres psql -U logistics -d order_db \
  -c "SELECT event_type, processed_at, retry_count FROM outbox_events ORDER BY created_at DESC LIMIT 10"

# Посмотреть processed_events
docker compose exec postgres psql -U logistics -d dispatcher_db \
  -c "SELECT event_id, event_type FROM processed_events ORDER BY processed_at DESC LIMIT 10"

# Kafka топики
docker compose exec kafka kafka-topics.sh --list --bootstrap-server localhost:9092

# Запустить нагрузочный тест
k6 run --env BASE_URL=http://localhost:3000 --env JWT_TOKEN=xxx infra/k6/load-test.js
```