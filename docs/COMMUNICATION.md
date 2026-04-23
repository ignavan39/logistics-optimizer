# Service Communication

## Overview

Services communicate via two patterns:
- **Synchronous** — gRPC calls (request/response)
- **Asynchronous** — Kafka events (publish/subscribe)

```mermaid
flowchart LR
    subgraph Sync["Synchronous (gRPC)"]
        API[api-gateway] --> OS[order-service]
        API --> FS[fleet-service]
        API --> CS[counterparty]
        DS[dispatcher] --> FS
        DS --> OS
    end

    subgraph Async["Asynchronous (Kafka)"]
        OS -.publish.-> K[Kafka]
        K -.consume.-> DS
        K -.consume.-> TS[tracking]
        K -.consume.-> NG[notifications]
    end
```

---

## gRPC Communication

### Service Dependency Map

```mermaid
flowchart TD
    API[api-gateway] --> OS[order-service]
    API --> FS[fleet-service]
    API --> RS[routing-service]
    API --> TS[tracking-service]
    API --> CS[counterparty-service]
    API --> DS[dispatcher-service]

    DS --> OS2[order-service]
    DS --> FS2[fleet-service]
    DS --> RS2[routing-service]

    OS3[order-service] --> RS3[routing-service]
    OS4[order-service] --> CS2[counterparty-service]
```

### gRPC Calls Table

| Caller | Callee | Methods |
|--------|--------|---------|
| api-gateway | order-service | `CreateOrder`, `GetOrder`, `GetOrderHistory`, `ListOrders`, `UpdateOrderStatus`, `CancelOrder`, `GetInvoice`, `GetInvoiceByOrder`, `ListInvoices`, `UpdateInvoiceStatus`, `GetCompanySettings`, `SetSetting`, `UpdateCompanySettings` |
| api-gateway | fleet-service | `GetAvailableVehicles`, `GetVehicle`, `GetVehicleDetails`, `UpdateVehicle`, `AssignVehicle`, `ReleaseVehicle` |
| api-gateway | routing-service | `CalculateRoute`, `GetRoute`, `CalculateETA` |
| api-gateway | counterparty-service | `CreateCounterparty`, `GetCounterparty`, `UpdateCounterparty`, `ListCounterparties`, `CreateContract`, `GetContract`, `UpdateContract`, `ListContracts`, `GetContractTariffs`, `CreateContractTariff` |
| api-gateway | dispatcher-service | `DispatchOrder`, `GetDispatchState`, `CancelDispatch` |
| api-gateway | tracking-service | `GetLatestPosition`, `GetTrack`, `StreamVehiclePosition` |
| dispatcher-service | fleet-service | `GetAvailableVehicles`, `AssignVehicle`, `ReleaseVehicle` |
| dispatcher-service | routing-service | `CalculateRoute` |
| dispatcher-service | order-service | `GetOrder`, `UpdateOrderStatus` |
| order-service | routing-service | `CalculateRoute` |
| order-service | counterparty-service | `GetCounterparty`, `GetContract`, `GetContractTariffs` |

### Injection Tokens

| Token | Service | File |
|-------|---------|------|
| `ORDER_PACKAGE` | OrderService | api-gateway |
| `FLEET_PACKAGE` | FleetService | api-gateway |
| `ROUTING_PACKAGE` | RoutingService | api-gateway |
| `TRACKING_PACKAGE` | TrackingService | api-gateway |
| `COUNTERPARTY_PACKAGE` | CounterpartyService | api-gateway |
| `DISPATCHER_PACKAGE` | DispatcherService | api-gateway |
| `FLEET_SERVICE` | FleetService | dispatcher-service |
| `ROUTING_SERVICE` | RoutingService | dispatcher-service |
| `ORDER_SERVICE` | OrderService | dispatcher-service |

---

## Kafka Communication

### Topics

| Topic | Partitions | Publisher | Consumers |
|-------|------------|-----------|------------|
| `order.created` | 6 | order-service | dispatcher-service, notifications |
| `order.updated` | 6 | order-service | notifications |
| `order.assigned` | 6 | order-service (via dispatcher) | notifications |
| `order.completed` | 6 | order-service | notifications |
| `order.failed` | 6 | order-service | dispatcher-service, notifications |
| `vehicle.status.changed` | 6 | fleet-service | notifications |
| `route.calculated` | 6 | routing-service | — |
| `traffic.incident` | 3 | — | — |
| `vehicle.telemetry` | 12 | telemetry-sim | tracking-service, notifications |
| `outbox.order` | 6 | order-service | — |
| `outbox.dispatcher` | 6 | dispatcher-service | — |
| `vehicle.telemetry.dlq` | 3 | — | — |
| `order.created.dlq` | 3 | — | — |

### Event Flows

```mermaid
flowchart TB
    subgraph Publish["Publishers"]
        OS[order-service]
        FS[fleet-service]
        RS[routing-service]
        SIM[telemetry-sim]
    end

    subgraph Topics["Kafka Topics"]
        OC[order.created]
        OU[order.updated]
        VT[vehicle.telemetry]
        VTDLQ[vehicle.telemetry.dlq]
    end

    subgraph Consume["Consumers"]
        DS[dispatcher-service]
        TS[tracking-service]
        NG[notifications]
    end

    OS --> OC
    OS --> OU
    FS --> VT
    SIM --> VT

    OC --> DS
    OC --> NG
    OU --> NG
    VT --> TS
    VT -.DLQ.-> VTDLQ
    VT --> NG
```

### Event Schema

All events follow `KafkaEvent` interface:

```typescript
interface KafkaEvent<T = unknown> {
  eventId: string;        // UUID - unique globally
  source: string;         // Service name
  type: string;           // Event type (e.g., 'order.created')
  aggregateId: string;    // Aggregate root ID
  occurredAt: string;     // ISO-8601 timestamp
  version: number;        // Schema version
  payload: T;             // Event-specific data
}
```

### Event Payloads

#### order.created
```json
{
  "orderId": "uuid",
  "customerId": "uuid",
  "origin": "address string",
  "destination": "address string",
  "priority": "normal|high|urgent",
  "weightKg": 1000,
  "volumeM3": 5.5,
  "slaDeadline": "2024-01-15T12:00:00Z"
}
```

#### order.updated
```json
{
  "orderId": "uuid",
  "previousStatus": "PENDING",
  "newStatus": "ASSIGNED",
  "reason": "Vehicle assigned"
}
```

#### vehicle.telemetry
```json
{
  "vehicleId": "uuid",
  "lat": 55.7558,
  "lng": 37.6173,
  "speed": 45.5,
  "heading": 180.0,
  "recordedAt": "2024-01-15T12:00:00Z"
}
```

---

## Error Handling

### gRPC Errors
- Services return `null` on not found
- `NotFoundException`, `ConflictException` for business errors
- Optimistic locking with version mismatch → Conflict

### Kafka Error Handling

| Pattern | Description |
|---------|-------------|
| Retry | Exponential backoff (1s, 2s, 4s, 8s, 16s) |
| DLQ | Failed events after max retries go to DLQ topic |
| Idempotency | In-memory Set or DB-based deduplication |

### Idempotency Patterns

#### In-Memory (Simple)
```typescript
private readonly processedEvents = new Set<string>();

async handleEvent(event: KafkaEvent) {
  if (this.processedEvents.has(event.eventId)) {
    return; // Skip duplicate
  }
  this.processedEvents.add(event.eventId);

  // Process event...

  // Cleanup to prevent memory leak
  if (this.processedEvents.size > 10_000) {
    const first = this.processedEvents.values().next().value;
    this.processedEvents.delete(first);
  }
}
```

#### Database (Production)
```typescript
// libs/kafka-utils/src/idempotency/idempotency.guard.ts
await dataSource.query(
  `INSERT INTO processed_events (event_id, event_type)
   VALUES ($1, $2)
   ON CONFLICT (event_id) DO NOTHING`,
  [eventId, eventType]
);
```

Required table:
```sql
CREATE TABLE processed_events (
  event_id UUID PRIMARY KEY,
  event_type VARCHAR(100),
  processed_at TIMESTAMPTZ DEFAULT NOW()
);
```