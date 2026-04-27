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
| InvoicesModule временно отключён | ESM/CJS конфликт с `@logistics/document-templates` |

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

## 📝 Открытые вопросы / TODO

_Добавляй вопросы которые требуют ответа или исследования_

| Вопрос | Приоритет | Добавлено |
|--------|-----------|----------|
| Исправить ESM/CJS в @logistics/document-templates | Medium | 2026-04 |

---

## 📅 Лог сессий

_Краткое резюме что делалось в каждой сессии_

| Дата | Что делали | Что узнали |
|------|-----------|-----------|
| 2026-04 | Рефакторинг api-gateway с @nestjs/typeorm на DataSource factory | Паттерн useFactory нужен для всех модулей, не только для DatabaseModule |

---

## 🏗️ Архитектурные наблюдения

_Вещи которые стоит улучшить в будущем, но не срочно_

| Наблюдение | Предложение | Приоритет |
|-----------|-------------|-----------|
| In-memory idempotency Set теряется при рестарте | Мигрировать все сервисы на DB-based IdempotencyGuard | Medium |
| Нет единого базового класса Kafka consumer | Создать `BaseConsumer` в `libs/kafka-utils` с встроенной идемпотентностью | Low |