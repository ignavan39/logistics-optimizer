# Testing Patterns

> Копируй структуру, адаптируй имена. Не меняй тест под баг — чини причину.

---

## Test Hierarchy

| Type | What | Run | Rule |
|------|------|-----|------|
| **Unit** | Logic, services | `make test` | Mock external. Direct instantiation > Nest DI |
| **Integration** | gRPC, Kafka, DB | `make test:grpc` | Real ports, isolated `*_test` DBs |
| **E2E** | Full HTTP flow | `make test:e2e` | Live infra. Don't rely on static data |
| **Load** | k6 scenarios | `make test:load` | Only after E2E passes |

**Golden rule**: `AAA` (Arrange → Act → Assert). One test = one behavior.

---

## Jest Config: Unit vs E2E (CRITICAL)

### Unit (fast, no `.js` in `src/`)
```javascript
// apps/*/jest.config.js
transform: { '^.+\\.ts$': ['ts-jest', { isolatedModules: true }] }
```

### E2E (disable Babel, fix parse errors)
```javascript
// tests/e2e/jest.config.js
transform: {
  '^.+\\.ts$': ['ts-jest', {
    tsconfig: 'tests/e2e/tsconfig.json',
    useIsolatedModules: false
  }]
}
```
> **Rule**: `SyntaxError: Unexpected token` in E2E → check `useIsolatedModules: false`

---

## Unit: Services with gRPC clients

```typescript
// ✅ Direct instantiation (more reliable than Test.createTestingModule)
const grpcMock = {
  getService: jest.fn().mockReturnValue({
    getAvailableVehicles: jest.fn().mockResolvedValue({ vehicles: [] }),
    assignVehicle: jest.fn().mockResolvedValue({ success: true }),
  }),
};

const mockConfig = { get: jest.fn().mockReturnValue('localhost') };

let service: OrderService;
beforeEach(() => {
  service = new OrderService(mockConfig as any, grpcMock as any);
  service.onModuleInit();
});
```

---

## Integration: gRPC & Kafka

```typescript
// gRPC: test real method, not just waitForReady()
await new Promise<void>((resolve, reject) => {
  client.waitForReady(Date.now() + 10_000, (err) => err ? reject(err) : resolve());
});
const res = await new Promise<any>((res, rej) => 
  client.getAvailableVehicles({ origin: 'health-check' }, (e, r) => e ? rej(e) : res(r))
);
expect(Array.isArray(res.vehicles)).toBe(true);

// Kafka: check envelope
expect(event.eventId).toBeDefined();
expect(event.source).toBe('order-service');
expect(event.type).toBe('order.created');
```

---

## E2E: API & DB Isolation

```typescript
// Use test prefixes for easy cleanup
const TEST_PREFIX = `test-${Date.now()}`;
await pool.query(`DELETE FROM orders WHERE customer_id LIKE $1`, [`${TEST_PREFIX}%`]);

// DB Isolation: use ports from ADR-004
const TEST_DBS = {
  order: 6401, fleet: 6402, routing: 6403,
  tracking: 6404, dispatcher: 6405, counterparty: 6406, invoice: 6407
};
```

---

## Quick Run

```bash
make test                    # Unit (all)
make test --filter=order     # Unit (one service)
make test:e2e                # E2E full cycle
make test:grpc               # gRPC integration only
```

> **Meta**: Test fails >3 times → check `03-Pitfalls.md#testing`. Don't mock what you're testing.