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