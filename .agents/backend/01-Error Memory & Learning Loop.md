**После каждой ошибки/бага агент должен:**

1. **Записать в `.agents/backend/Error Memory & Learning Loop.md` дополнить его по шаблону**:
```markdown
-  ## ADR-001: TypeORM через DataSource напрямую
- **Дата**: 2026-04
- **Контекст**: @nestjs/typeorm конфликтует с pnpm hoisting в Docker
- **Решение**: использовать `new DataSource()` напрямую, регистрировать как provider
- **Статус**: Accepted
- **Последствия**: чуть больше бойлерплейта, но стабильность в проде
```


## ADR-001: TypeORM через DataSource напрямую
- **Дата**: 2026-04
- **Контекст**: @nestjs/typeorm конфликтует с pnpm hoisting в Docker
- **Решение**: использовать `new DataSource()` напрямую, регистрировать как provider
- **Статус**: Accepted
- **Последствия**: чуть больше бойлерплейта, но стабильность в проде

## ADR-002: Outbox pattern для Kafka
- **Дата**: 2026-03
- **Контекст**: нужна гарантированная доставка событий при сбоях
- **Решение**: писать событие в БД в той же транзакции, что и бизнес-данные; poller публикует в Kafka
- **Статус**: Accepted

## ADR-003: API versioning через URL
- **Дата**: 2026-02
- **Контекст**: нужно поддерживать обратную совместимость при изменениях контрактов
- **Решение**: `/api/v1/users`, `/api/v2/users`; старая версия поддерживается 6 месяцев после деплоя новой
- **Статус**: Accepted

## ADR-004: Test Database Strategy
- **Дата**: 2026-04
- **Контекст**: интеграционные тесты требуют изолированные БД, отличные от production
- **Решение**: отдельные `pg-*-test` БД + pgbouncer на ports 6400+, использование init SQL файлов
- **Статус**: Accepted

## ADR-005: API Gateway @nestjs/typeorm bug
- **Дата**: 2026-04
- **Контекст**: @nestjs/typeorm конфликтует с pnpm hoisting в Docker, ошибка "Nest can't resolve dependencies of the TypeOrmCoreModule"
- **Решение**: полный рефакторинг на DataSource factory pattern
- **Статус**: RESOLVED
- **Компоненты обновлены**:
  - app.module.ts — DatabaseModule с DataSource factory (@Global)
  - auth.module.ts — useFactory для AuthService, TokenService, SessionService, PasswordService, ApiKeyService, JwtStrategy
  - roles.module.ts — useFactory для RolesService, PermissionsService
  - admin.module.ts — @Inject(AuditLog) в controller
  - users.module.ts — useFactory для UsersService
- **Тестирование**: API Gateway запускается, /auth/login возвращает 401
- **Примечание**: InvoicesModule временно отключен (ESM/CJS конфликт с @logistics/document-templates)


## LEARNINGS

### JS файлы в src/
- **Проблема**: ts-jest компилирует `.ts` → `.js` в ту же папку
- **Решение**: использовать `isolatedModules: true` в jest.config.ts
- **Как находить**: `find apps libs tests -name "*.js" -path "*/src/*"`

### git checkout -- .
- **Проблема**: откатывает ВСЕ изменения, включая неотслеживаемые файлы
- **Никогда не делать**: `git checkout -- .`
- **Альтернатива**: `git restore -- source` для отдельных файлов


### @logistics/document-templates ESM/CJS
- **Проблема**: библиотека экспортирует ESM (`export interface`), но импортируется как CJS
- **Решение**: изменить package.json на `"type": "module"` или убрать export interface
- **Временно**: добавлена заглушка в invoices.service.ts