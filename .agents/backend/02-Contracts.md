# Contracts — Межсервисные контракты

> "Проверяй контракт перед интеграцией" — всегда документируй контракт между сервисами.

---

## 🎯 Главный принцип

Перед реализацией фичи, затрагивающей >1 сервиса:

1. **Определи контракт в `libs/proto/`**
2. Опиши flow в `docs/COMMUNICATION.md`
3. Добавь тест на контракт

---

## gRPC методы

### Order → Fleet

| Метод | Request | Response | Описание |
|-------|---------|----------|----------|
| assignVehicle | AssignVehicleRequest | AssignVehicleResponse | Назначить ТС на заказ |
| releaseVehicle | ReleaseVehicleRequest | ReleaseVehicleResponse | Освободить ТС |

### Order → Routing

| Метод | Request | Response | Описание |
|-------|---------|----------|----------|
| calculateRoute | CalculateRouteRequest | CalculateRouteResponse | Рассчитать маршрут |

### Order → Counterparty

| Метод | Request | Response | Описание |
|-------|---------|----------|----------|
| validateContract | ValidateContractRequest | ValidateContractResponse | Проверить контракт |

### Dispatcher → Fleet

| Метод | Request | Response | Описание |
|-------|---------|----------|----------|
| findAvailableVehicle | FindVehicleRequest | FindVehicleResponse | Найти свободное ТС |

### Dispatcher → Routing

| Метод | Request | Response | Описание |
|-------|---------|----------|----------|
| calculateRoute | CalculateRouteRequest | CalculateRouteResponse | Рассчитать маршрут |

---

## Kafka события

### order.* (order-service → dispatching)

| Topic | Event | Payload | Описание |
|-------|-------|---------|----------|
| order.created | OrderCreatedEvent | { orderId, companyId, cargo, ... } | Новый заказ |
| order.updated | OrderUpdatedEvent | { orderId, status, ... } | Статус изменён |
| order.delivered | OrderDeliveredEvent | { orderId, ... } | Заказ доставлен |

### vehicle.* (fleet-service → tracking)

| Topic | Event | Payload | Описание |
|-------|-------|---------|----------|
| vehicle.status | VehicleStatusEvent | { vehicleId, location, status, ... } | Статус ТС |

---

## Правила проверки контракта

1. **Версионирование** — используй semver в proto
2. **Обратная совместимость** — не удаляй поля, добавляй optional
3. **Документация** — комментируй каждое поле в proto
4. **Тесты** — пиши интеграционные тесты на контра

---

## Как описывать новый контракт

```protobuf
// libs/proto/order.proto
syntax = "proto3";

package logistics;

// Описывай каждое поле
message CreateOrderRequest {
  string company_id = 1;  // ID компании
  string cargo_id = 2;     // ID груза
  RoutePoint from = 3;     // Точка отправления
  RoutePoint to = 4;       // Точка назначения
}

// Используй semver для версионирования
// Добавляй новые поля как optional
message CreateOrderResponse {
  string order_id = 1;      // ID созданного заказа
  string status = 2;        // initial/assigned/in_transit/delivered
}
```

---

## Flow пример: Assign Vehicle

```mermaid
sequenceDiagram
  participant Order as OrderService
  participant Dispatcher as DispatcherService
  participant Fleet as FleetService
  participant Routing as RoutingService
  participant Kafka

  Order->>Kafka: order.created (Outbox)
  Kafka->>Dispatcher: Consume order.created
  Dispatcher->>Fleet: gRPC FindAvailableVehicle
  Fleet-->>Dispatcher: VehicleFound
  Dispatcher->>Routing: gRPC CalculateRoute
  Dispatcher->>Kafka: order.assigned.v1 (idempotent)
  Order<<-Kafka: Consume order.assigned (idempotent)
```

---

## Важно!

1. **gRPC readiness ≠ methods work** — waitForReady() может вернуть true, но методы возвращают Internal Error из-за неполной схемы БД
2. **Всегда тестируй реальные методы**, не только readiness
3. **Idempotent consume** — проверяй eventId перед обработкой