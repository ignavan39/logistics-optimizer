# Good-Practices — Правильные паттерны

> "Шаблоны для копирования" — проверенные подходы.

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

## Как добавлять Practices

1. Копируй проверенный паттерн
2. Объясни почему это работает
3. Добавь пример кода
4. Обозначь "ПРАВИЛЬНО" vs "НЕПРАВИЛЬНО"