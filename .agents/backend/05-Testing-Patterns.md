# Testing Patterns

> "Как тестировать" — паттерны для написания тестов.

---

## Unit Tests

### Service Testing

```typescript
describe('OrderService', () => {
  let service: OrderService;
  let mockRepo: ReturnType<typeof createMockRepository>;

  beforeEach(async () => {
    mockRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    };
    
    const module = await Test.createTestingModule({
      providers: [
        OrderService,
        { provide: getRepositoryToken(OrderEntity), useValue: mockRepo },
      ],
    }).compile();

    service = module.get(OrderService);
  });

  it('should create order', async () => {
    mockRepo.save.mockResolvedValue({ id: '1', status: 'pending' });
    
    const result = await service.create({ cargoId: 'cargo-1' });
    
    expect(result.status).toBe('pending');
  });
});
```

---

## Integration Tests

### gRPC Testing

```typescript
describe('FleetService', () => {
  it('should assign vehicle to order', async () => {
    const client = new FleetServiceClient(grpcUrl);
    
    const response = await client.assignVehicle({
      vehicleId: 'vehicle-1',
      orderId: 'order-1',
    });
    
    expect(response.success).toBe(true);
  });
});
```

---

## E2E Tests

### API Testing

```typescript
describe('Orders API', () => {
  const api = request('http://localhost:3000');

  it('should create order', async () => {
    const response = await api
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ cargoId: 'cargo-1' });

    expect(response.status).toBe(201);
    expect(response.body.id).toBeDefined();
  });
});
```

---

## Testing Rules

1. **AAA Pattern** — Arrange, Act, Assert
2. **One expectation per test** — один assertion на тест
3. **Use mocks for external** — мокай внешние зависимости
4. **Test happy path and edges** — успешный сценарий и граничные случаи
5. **Name describes behavior** — имя теста описывает поведение


# Testing Patterns — Good Practices

## 1. Test Database Strategy

### Test Database Setup with pgbouncer

```yaml
# tests/e2e/docker-compose.yml

services:
  pg-test-order:
    image: postgis/postgis:16-3.4
    environment:
      POSTGRES_USER: logistics
      POSTGRES_PASSWORD: logistics_secret
      POSTGRES_HOST_AUTH_METHOD: trust
      POSTGRES_DB: order_db_test
    volumes:
      - ../infra/postgres/init-order.sql:/docker-entrypoint-initdb.d/init.sql:ro

  pgbouncer-test-order:
    image: edoburu/pgbouncer:1.18.0
    environment:
      DB_USER: logistics
      DB_PASSWORD: logistics_secret
      DB_HOST: pg-test-order
      DB_NAME: order_db_test
      POOL_MODE: transaction
    ports:
      - '6433:5432'  # Different from production 5433
```

### Key Points
- Separate test databases with `_test` suffix
- Use pgbouncer for connection pooling
- Use different ports (6400+) to avoid conflicts with production
- Use `POSTGRES_HOST_AUTH_METHOD: trust` for tests
- Mount init SQL files the same as production

## 2. Health Check Pattern (TCP Port)

```bash
# scripts/health-check.sh

check_tcp() {
  local host=$1
  local port=$2
  local name=$3

  if timeout "$TIMEOUT" bash -c "echo > /dev/tcp/$host/$port" 2>/dev/null; then
    log_info "✓ $name port open"
    return 0
  else
    log_error "✗ $name port closed"
    return 1
  fi
}
```

### Why TCP instead of HTTP?
- Not all services implement `/health` endpoint
- TCP port check is more reliable
- Works even when service returns 500

## 3. DB Isolation Verification Test

```typescript
// tests/e2e/db-isolation.spec.ts

const DB_CONFIG = {
  order: { host: 'localhost', port: 6433, database: 'order_db_test' },
  fleet: { host: 'localhost', port: 6434, database: 'fleet_db_test' },
}

describe('DB Isolation Integration', () => {
  beforeAll(async () => {
    for (const [name, config] of Object.entries(DB_CONFIG)) {
      pools[name] = new Pool(config)
      await pools[name].query('SELECT 1')
    }
  })

  it('each service should use own database', async () => {
    const result = await pools.order.query('SELECT current_database()')
    expect(result.rows[0].db).toBe('order_db_test')
  })
})
```

## 4. E2E gRPC Test Pattern

```typescript
// tests/e2e/order.service.spec.ts

describe('OrderService E2E', () => {
  let client: any

  beforeAll(async () => {
    const packageDefinition = protoLoader.loadSync(PROTO_PATH)
    const grpcPackage = grpc.loadPackageDefinition(packageDefinition) as any
    const OrderService = grpcPackage.order.OrderService

    client = new OrderService('localhost:50051', grpc.credentials.createInsecure())

    await new Promise<void>((resolve, reject) => {
      client.waitForReady(Date.now() + 10000, (err: any) => {
        if (err) reject(err)
        else resolve()
      })
    })
  })

  it('should create new order', (done) => {
    client.createOrder({ /* request */ }, (err: any, response: any) => {
      expect(err).toBeNull()
      expect(response.id).toBeDefined()
      done()
    })
  })
})
```

## 5. Test Configuration

```javascript
// tests/e2e/jest.config.js

module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': ['ts-jest', { tsconfig: `${rootDir}/tests/e2e/tsconfig.json` }],
  },
  testEnvironment: 'node',
  rootDir,
  roots: [`${rootDir}/tests/e2e`],
}
```

## 6. Test Data Management

- Use UUID prefixes like `test-{uuid}` for isolation
- Clean up after tests with `afterAll()`
- Use transaction rollback for fast cleanup
- Each test should be independent

## 7. Running Tests

```bash
# Run specific tests
npx jest --config tests/e2e/jest.config.js tests/e2e/order.service.spec.ts

# Run all e2e tests
npx jest --config tests/e2e/jest.config.js

# With docker-compose
docker compose -f tests/e2e/docker-compose.yml up -d
npx jest --config tests/e2e/jest.config.js
docker compose -f tests/e2e/docker-compose.yml down
```