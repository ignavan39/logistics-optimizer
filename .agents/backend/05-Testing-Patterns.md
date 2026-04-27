# Testing Patterns

> Паттерны тестирования. Копируй структуру, адаптируй содержимое.

---

## ⚡ Когда обновлять ЭТОТ файл

Обнови если:
- Нашёл новый паттерн тестирования который работает лучше
- Обнаружил что существующий паттерн не работает в каком-то случае
- Добавил новый тип тестов (e2e, contract, load)

---

## Иерархия тестов

```
Unit Tests      → Чистая логика, без I/O, мокать всё внешнее
Integration     → Kafka/gRPC/DB через реальные порты (тестовые БД)
E2E             → Полный HTTP сценарий через api-gateway
Load            → k6 сценарии в infra/k6/
```

---

## Unit: Service Testing

```typescript
// order/order.service.spec.ts
describe('OrderService', () => {
  let service: OrderService;
  let mockOrderRepo: jest.Mocked<Repository<OrderEntity>>;
  let mockOutboxRepo: jest.Mocked<Repository<OutboxEventEntity>>;
  let mockDataSource: jest.Mocked<DataSource>;

  beforeEach(async () => {
    mockOrderRepo = {
      findOneBy: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as any;

    mockOutboxRepo = { save: jest.fn() } as any;

    mockDataSource = {
      transaction: jest.fn().mockImplementation((cb) =>
        cb({ save: jest.fn().mockImplementation((_, dto) => ({ id: 'uuid', ...dto })) })
      ),
    } as any;

    service = new OrderService(mockOrderRepo, mockOutboxRepo, mockDataSource);
  });

  describe('createOrder', () => {
    it('should create order and outbox event in single transaction', async () => {
      const dto = { customerId: 'c-1', origin: 'MSK', destination: 'SPB' };

      const result = await service.createOrder(dto);

      expect(result.status).toBe('PENDING');
      expect(mockDataSource.transaction).toHaveBeenCalledTimes(1);
    });

    it('should throw if transaction fails', async () => {
      mockDataSource.transaction.mockRejectedValueOnce(new Error('DB error'));

      await expect(service.createOrder({} as any)).rejects.toThrow('DB error');
    });
  });

  describe('updateOrderStatus', () => {
    it('should throw ConflictException on version mismatch', async () => {
      mockOrderRepo.findOneBy.mockResolvedValue({ id: '1', version: 5 } as any);

      await expect(
        service.updateOrderStatus('1', 'ASSIGNED', 3) // wrong version
      ).rejects.toThrow(ConflictException);
    });
  });
});
```

---

## Integration: gRPC Testing

```typescript
// tests/integration/fleet.grpc.spec.ts
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';

describe('FleetService gRPC Integration', () => {
  let client: any;

  beforeAll(async () => {
    const def = protoLoader.loadSync(
      join(__dirname, '../../../libs/proto/fleet.proto')
    );
    const pkg = grpc.loadPackageDefinition(def) as any;

    client = new pkg.fleet.FleetService(
      'localhost:50052',
      grpc.credentials.createInsecure()
    );

    // Ждём готовности
    await new Promise<void>((resolve, reject) => {
      client.waitForReady(Date.now() + 10_000, (err: any) =>
        err ? reject(err) : resolve()
      );
    });

    // ⚠️ Обязательно тестируем реальный метод, не только readiness
    const { vehicles } = await new Promise<any>((res, rej) =>
      client.getAvailableVehicles({ origin: 'health-check' }, (e: any, r: any) =>
        e ? rej(e) : res(r)
      )
    );
    expect(Array.isArray(vehicles)).toBe(true);
  });

  it('should assign vehicle to order', async () => {
    const response = await new Promise<any>((res, rej) =>
      client.assignVehicle(
        { vehicleId: 'test-vehicle-1', orderId: 'test-order-1', version: 0 },
        (err: any, r: any) => (err ? rej(err) : res(r))
      )
    );

    expect(response.success).toBe(true);
  });
});
```

---

## Integration: Kafka Testing

```typescript
// tests/integration/order-events.spec.ts
describe('Order Kafka Events', () => {
  let kafka: Kafka;
  let consumer: Consumer;
  let received: any[] = [];

  beforeAll(async () => {
    kafka = new Kafka({ brokers: ['localhost:9092'] });
    consumer = kafka.consumer({ groupId: 'test-group-' + Date.now() });
    await consumer.connect();
    await consumer.subscribe({ topic: 'order.created', fromBeginning: false });
    await consumer.run({
      eachMessage: async ({ message }) => {
        received.push(JSON.parse(message.value!.toString()));
      },
    });
  });

  afterAll(async () => {
    await consumer.disconnect();
  });

  it('should publish order.created event after createOrder', async () => {
    received = [];

    // Создаём заказ через API
    await axios.post('http://localhost:3000/api/v1/orders', {
      origin: 'Moscow', destination: 'SPB',
      cargo: { weightKg: 100, volumeM3: 1 },
    }, { headers: { Authorization: `Bearer ${testToken}` } });

    // Ждём событие
    await waitFor(() => received.length > 0, { timeout: 5000 });

    expect(received[0].type).toBe('order.created');
    expect(received[0].eventId).toBeDefined();
    expect(received[0].payload.origin).toBe('Moscow');
  });
});
```

---

## E2E: API Testing

```typescript
// tests/e2e/orders.e2e.spec.ts
describe('Orders E2E', () => {
  const api = axios.create({ baseURL: 'http://localhost:3000' });
  let token: string;

  beforeAll(async () => {
    const { data } = await api.post('/auth/login', {
      email: 'admin@logistics.local',
      password: 'secret',
    });
    token = data.accessToken;
  });

  it('full order lifecycle: create → dispatch → assign', async () => {
    // 1. Создаём заказ
    const { data: order } = await api.post(
      '/api/v1/orders',
      { origin: 'Moscow, Tverskaya 1', destination: 'SPB, Nevsky 10',
        cargo: { weightKg: 500, volumeM3: 2 } },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    expect(order.status).toBe('PENDING');

    // 2. Ждём автоназначения через Saga
    await waitFor(async () => {
      const { data } = await api.get(`/api/v1/orders/${order.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      expect(data.status).toBe('ASSIGNED');
    }, { timeout: 30_000, interval: 1000 });

    // 3. Проверяем историю статусов
    const { data: history } = await api.get(
      `/api/v1/orders/${order.id}/history`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    expect(history.map((h: any) => h.newStatus)).toContain('ASSIGNED');
  });
});
```

---

## DB Isolation Verification

```typescript
// tests/e2e/db-isolation.spec.ts
const TEST_DB_CONFIG = {
  order:        { host: 'localhost', port: 6401, database: 'order_db_test' },
  fleet:        { host: 'localhost', port: 6402, database: 'fleet_db_test' },
  routing:      { host: 'localhost', port: 6403, database: 'routing_db_test' },
  tracking:     { host: 'localhost', port: 6404, database: 'tracking_db_test' },
  dispatcher:   { host: 'localhost', port: 6405, database: 'dispatcher_db_test' },
  counterparty: { host: 'localhost', port: 6406, database: 'counterparty_db_test' },
  invoice:      { host: 'localhost', port: 6407, database: 'invoice_db_test' },
};

describe('DB Isolation', () => {
  const pools: Record<string, Pool> = {};

  beforeAll(async () => {
    for (const [name, cfg] of Object.entries(TEST_DB_CONFIG)) {
      pools[name] = new Pool(cfg);
      await pools[name].query('SELECT 1'); // проверяем доступность
    }
  });

  afterAll(async () => {
    for (const pool of Object.values(pools)) await pool.end();
  });

  it.each(Object.entries(TEST_DB_CONFIG))(
    '%s should use its own database',
    async (name, cfg) => {
      const { rows } = await pools[name].query('SELECT current_database() AS db');
      expect(rows[0].db).toBe(cfg.database);
    }
  );
});
```

---

## Test Data Management

```typescript
// tests/helpers/test-data.ts
const TEST_PREFIX = `test-${Date.now()}`;

export const testOrder = (overrides = {}) => ({
  customerId: `${TEST_PREFIX}-customer`,
  origin: 'Moscow, Test St 1',
  destination: 'SPB, Test Av 2',
  cargo: { weightKg: 100, volumeM3: 1 },
  ...overrides,
});

// В тестах
afterAll(async () => {
  // Удаляем тестовые данные по префиксу
  await pool.query(
    `DELETE FROM orders WHERE customer_id LIKE $1`,
    [`${TEST_PREFIX}%`]
  );
});
```

---

## Jest Config для E2E

```javascript
// tests/e2e/jest.config.js
const rootDir = process.cwd();

module.exports = {
  rootDir,
  roots: [`${rootDir}/tests/e2e`],
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', {
      tsconfig: `${rootDir}/tests/e2e/tsconfig.json`,
      isolatedModules: true, // ← предотвращает .js файлы в src/
    }],
  },
  testEnvironment: 'node',
  testTimeout: 30_000, // E2E могут быть медленными
};
```

---

## Запуск тестов

```bash
# Unit
pnpm test

# Один сервис
pnpm --filter @logistics/order-service test

# E2E (нужна infra)
./scripts/run-tests.sh --up --health --down

# По группам
./scripts/run-tests.sh --db-only
./scripts/run-tests.sh --grpc-only
./scripts/run-tests.sh --kafka-only

# Конкретный файл
npx jest tests/e2e/order.service.spec.ts --config tests/e2e/jest.config.js

# Нагрузочный (нужен k6)
k6 run --env BASE_URL=http://localhost:3000 --env JWT_TOKEN=... infra/k6/load-test.js
```

---

## Правила

1. **AAA** — Arrange, Act, Assert в каждом тесте
2. **Один assertion на тест** — упавший тест даёт точную информацию
3. **Имя описывает поведение** — `should throw ConflictException on version mismatch`
4. **Независимость** — каждый тест работает сам по себе
5. **Test prefix** — тестовые данные с префиксом `test-{timestamp}` для лёгкой очистки
6. **Не мокай то что тестируешь** — если тестируешь интеграцию, нужна реальная БД