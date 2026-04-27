# Good-Practices — Правильные паттерны

> "Шаблоны для копирования" — проверенные подходы.

---

## 🎯 Strict Mode Activation

**Перед реализацией фичи >50 строк:**
1. Задай уточняющие вопросы (если не хватает контекста)
2. Предложи план с декомпозицией
3. Дождись подтверждения
4. Только потом пиши код

**Запрещено**: сразу генерировать код без плана.

---

## ⚡ Golden Rule: Tests First

**Перед написанием любой бизнес-логики:**
1. Создай unit-тест для чистой функции/сервиса
2. Создай интеграционный тест для Kafka/gRPC/DB взаимодействия
3. Создай e2e-сценарий для сквозного потока (если >1 сервиса)

---

## Backend Patterns

### ConfigService

```typescript
// ПРАВИЛЬНО
const configService = app.get(ConfigService);
const host = configService.get('HOST', 'localhost');
const port = configService.get<number>('PORT', 3000);

// НЕПРАВИЛЬНО
const host = process.env.HOST; // Ломается в Docker
```

### DataSource Factory

```typescript
// ПРАВИЛЬНО — TypeORM без @nestjs/typeorm
export const dataSourceFactory = async (config: ConfigService) => {
  const dataSource = new DataSource({
    type: 'postgres',
    host: config.get('DB_HOST'),
    port: config.get<number>('DB_PORT'),
    synchronize: config.get('NODE_ENV') !== 'production',
  });
  await dataSource.initialize();
  return dataSource;
};
```

### Transactional Outbox

```typescript
// ПРАВИЛЬНО — гарантированная доставка событий
@EventSubscriber('order.created')
async handleOrderCreated(evt: OrderCreatedEvent) {
  // 1. Сохраняем в outbox
  await this.outboxRepository.save({
    aggregateId: evt.orderId,
    type: 'ORDER_CREATED',
    payload: evt,
  });
  // 2. Отправляем в Kafka после commit
}
```

### Idempotent Consumer

```typescript
// ПРАВИЛЬНО — обработка дубликатов
@EventListener('order.created')
async handle(evt: OrderCreatedEvent) {
  // Проверяем обработан ли eventId
  const exists = await this.processedEvents.findOne({
    where: { eventId: evt.eventId },
  });
  if (exists) return; // Уже обработан
  
  await this.processOrder(evt);
  await this.processedEvents.save({ eventId: evt.eventId });
}
```

---

## Frontend Patterns

### React Query

```typescript
// ПРАВИЛЬНО
const { data, isLoading, error } = useQuery({
  queryKey: ['orders'],
  queryFn: () => apiClient.getOrders(),
  staleTime: 5000,
});
```

### Zustand Store

```typescript
// ПРАВИЛЬНО
interface AppStore {
  orders: Order[];
  setOrders: (orders: Order[]) => void;
}

const useStore = create<AppStore>((set) => ({
  orders: [],
  setOrders: (orders) => set({ orders }),
}));
```

---

## 📚 Документация

Поддерживай актуальность в `docs/`:

| Файл | Обновлять при |
|------|--------------|
| `docs/SERVICES.md` | Добавлении/удалении сервиса |
| `docs/COMMUNICATION.md` | Изменении gRPC методов, Kafka событий |
| `docs/DATABASE.md` | Изменении схемы БД |
| `docs/API.md` | Добавлении REST endpoints |
| `docs/FEATURES.md` | Добавлении новых фич |

**Проверка после изменений:**
```bash
pnpm build && pnpm typecheck
```

---

## Как добавлять Practices

1. Копируй проверенный паттерн
2. Объясни почему это работает
3. Добавь пример кода
4. Обозначь "ПРАВИЛЬНО" vs "НЕПРАВИЛЬНО"