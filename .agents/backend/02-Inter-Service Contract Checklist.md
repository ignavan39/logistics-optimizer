# Контракт межсервисного взаимодействия (обязательно перед кодом)

**Перед реализацией фичи, затрагивающей >1 сервиса:**

1. **Определи контракт в `libs/proto/`**:
2. Опиши flow в docs/COMMUNICATION.md
 sequenceDiagram
  OrderService->>DispatcherService: gRPC AssignVehicle
  DispatcherService->>FleetService: gRPC FindAvailableVehicle
  FleetService-->>DispatcherService: VehicleFound
  DispatcherService->>RoutingService: gRPC CalculateRoute
  DispatcherService->>Kafka: Publish order.assigned.v1
  OrderService<<-Kafka: Consume order.assigned.v1 (idempotent)

4. Добавь тест на контракт:
 // test/contract/proto-compatibility.spec.ts
describe('Proto backward compatibility', () => {
  it('should not remove required fields', () => {
    // fail if old client breaks with new proto
  });
});