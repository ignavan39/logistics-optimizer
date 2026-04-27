# ADRs — Architecture Decision Records

> Решения после проблем. Всегда: Контекст → Проблема → Решение → Последствия.

---

## ⚡ Когда обновлять ЭТОТ файл

Обнови СРАЗУ если:
- Выбрал один из нескольких возможных подходов и есть причина
- Обошёл ограничение библиотеки/фреймворка нестандартным способом
- Принял решение которое неочевидно для следующего разработчика
- Решил проблему которая заняла >30 минут

**Формат:**
```markdown
## ADR-XXX: Короткое название

**Проблема:** Что было? Почему не работало?
**Контекст:** Почему возникла эта ситуация?
**Решение:** Что сделали. Почему именно это.
**Альтернативы:** Что ещё рассматривали и почему отказались.
**Последствия:** Что усложнилось / что стало лучше.
**Статус:** Accepted | Deprecated | Superseded by ADR-XXX
**Дата:** YYYY-MM
```

---

## ADR-001: TypeORM через DataSource напрямую

**Проблема:** `@nestjs/typeorm` выбрасывает `Nest can't resolve dependencies of the TypeOrmCoreModule` при сборке в Docker с pnpm.

**Контекст:** pnpm hoisting алгоритм отличается от npm/yarn, что вызывает конфликт при разрешении зависимостей TypeOrmCoreModule внутри Docker multi-stage build.

**Решение:** Регистрировать `new DataSource(config)` напрямую как `@Global()` provider. Все модули инжектируют `DataSource` и вызывают `ds.getRepository(Entity)`.

**Альтернативы:**
- npm вместо pnpm — отказались, меняет весь CI/CD
- TypeOrmModule.forRootAsync — та же проблема, другая обёртка

**Последствия:** +чуть больше бойлерплейта в модулях; −зависимость от @nestjs/typeorm полностью убрана; стабильная работа в Docker.

**Статус:** Accepted | **Дата:** 2026-04

---

## ADR-002: Outbox Pattern для Kafka

**Проблема:** При сбое после `INSERT INTO orders` но до `kafka.produce()` событие теряется. Если `kafka.produce()` упал после commit — данные сохранены, событие нет.

**Контекст:** Нужна гарантия exactly-once семантики на стороне publisher.

**Решение:** В той же транзакции что и бизнес-данные писать в `outbox_events`. Отдельный `OutboxProcessor` (poll каждые 1с) читает непроцессированные события через `SELECT FOR UPDATE SKIP LOCKED` и публикует в Kafka.

**Альтернативы:**
- Kafka Transactions — требует Kafka exactly-once на всех брокерах, сложнее в ops
- CDC (Debezium) — дополнительная инфраструктура

**Последствия:** +latency 0-1 сек на публикацию; +таблица outbox в каждой БД; −зависимость от надёжности Kafka при записи заказа.

**Статус:** Accepted | **Дата:** 2026-03

---

## ADR-003: API Versioning через URL

**Проблема:** Нужна обратная совместимость при изменении публичных контрактов REST API.

**Решение:** Версия в URL: `/api/v1/orders`, `/api/v2/orders`. Старая версия поддерживается 6 месяцев после деплоя новой.

**Альтернативы:**
- Header versioning (`Accept: application/vnd.api+json;version=1`) — хуже для кеширования и отладки
- Query param (`?v=1`) — не RESTful

**Последствия:** Дублирование контроллеров при мажорных изменениях.

**Статус:** Accepted | **Дата:** 2026-02

---

## ADR-004: Стратегия тестовых БД

**Проблема:** Интеграционные тесты требуют изолированные БД, которые не конфликтуют с dev окружением.

**Решение:** Отдельные `*_test` БД + pgbouncer на портах 6401–6407 (dev: 5433–5439). Порты пробрасываются наружу для локального запуска тестов.

| Сервис | Dev | Test |
|--------|-----|------|
| order | 5433 | 6401 |
| fleet | 5434 | 6402 |
| routing | 5435 | 6403 |
| tracking | 5436 | 6404 |
| dispatcher | 5437 | 6405 |
| counterparty | 5438 | 6406 |
| invoice | 5439 | 6407 |

**Последствия:** Нужно поднимать отдельный docker-compose для тестов.

**Статус:** Accepted | **Дата:** 2026-04

---

## ADR-005: DataSource Factory Pattern в api-gateway

**Проблема:** После ADR-001 все сервисы переведены на DataSource, но api-gateway использовал `@nestjs/typeorm` — та же ошибка при Docker build.

**Решение:** Полный рефакторинг api-gateway:
- `app.module.ts` → `@Global() DatabaseModule` с DataSource factory
- Все модули (auth, roles, admin, users) → `useFactory` для инжекции сервисов

**Затронутые файлы:**
- `app.module.ts` — DatabaseModule
- `auth.module.ts` — AuthService, TokenService, SessionService, PasswordService, ApiKeyService, JwtStrategy
- `roles.module.ts` — RolesService, PermissionsService
- `admin.module.ts` — @Inject(AuditLog) в controller
- `users.module.ts` — UsersService

**Проверка:** `POST /auth/login` возвращает 401 (сервис запустился, auth работает).

**Примечание:** InvoicesModule временно отключён (см. MEMORY.md — ESM/CJS проблема).

**Статус:** Resolved | **Дата:** 2026-04