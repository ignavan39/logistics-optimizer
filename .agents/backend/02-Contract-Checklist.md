# Contract Checklist — Межсервисные контракты

> "Проверяй контракт перед интеграцией" — всегда документируй контракт между сервисами.

---

## gRPC методы

### Order Service → Fleet Service

| Метод | Request | Response | Описание |
|-------|---------|-----------|----------|
| assignVehicle | AssignVehicleRequest | AssignVehicleResponse | Назначить ТС на заказ |
| releaseVehicle | ReleaseVehicleRequest | ReleaseVehicleResponse | Освободить ТС |

### Order Service → Routing Service

| Метод | Request | Response | Описание |
|-------|---------|-----------|----------|
| calculateRoute | CalculateRouteRequest | CalculateRouteResponse | Рассчитать маршрут |

### Order Service → Counterparty Service

| Метод | Request | Response | Описание |
|-------|---------|-----------|----------|
| validateContract | ValidateContractRequest | ValidateContractResponse | Проверить контракт |

---

## Kafka события

### Order Events

| Topic | Event | Payload | Описание |
|-------|-------|---------|----------|
| order.created | OrderCreatedEvent | { orderId, ... } | Новый заказ |
| order.delivered | OrderDeliveredEvent | { orderId, ... } | Заказ доставлен |

---

## Правила проверки контракта

1. **Версионирование** — используй semver в proto
2. **Обратная совместимость** — не удаляй поля, добавляй optional
3. **Документация** — комментируй каждое поле в proto
4. **Тесты** — пиши интеграционные тесты на контракт