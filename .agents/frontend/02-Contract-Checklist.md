# Contract Checklist — Контракт с бэкендом

> "Проверяй контракт перед интеграцией" — документируй API контракты.

---

## REST API

### Orders

| Endpoint | Method |Request | Response | Описание |
|----------|--------|--------|----------|----------|
| `/api/v1/orders` | GET | query params | Order[] | Список заказов |
| `/api/v1/orders` | POST | CreateOrderDto | Order | Создать заказ |
| `/api/v1/orders/:id` | GET | - | Order | Получить заказ |
| `/api/v1/orders/:id` | PATCH | UpdateOrderDto | Order | Обновить заказ |

### Fleet

| Endpoint | Method | Request | Response | Описание |
|----------|--------|---------|----------|----------|
| `/api/v1/vehicles` | GET | query | Vehicle[] | Список ТС |
| `/api/v1/vehicles/:id` | GET | - | Vehicle | Получить ТС |

---

## WebSocket

| Event | Payload | Описание |
|-------|---------|----------|
| `order:update` | Order | Обновление заказа |
| `vehicle:update` | Vehicle | Обновление ТС |

---

## GraphQL (если используется)

```graphql
type Order {
  id: ID!
  status: OrderStatus!
  cargo: Cargo!
  createdAt: DateTime!
}

type Query {
  orders(filter: OrderFilter): [Order!]!
  order(id: ID!): Order
}
```

---

## Правила

1. **Версионирование** — `/api/v1/`
2. **Типизация** — все ответы типизированы
3. **Пагинация** — `limit`, `offset` или cursor
4. **Ошибки** —统一的 error format