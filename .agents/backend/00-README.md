# Backend Agent — Quick Reference

> NestJS · TypeScript · TypeORM · PostgreSQL+PostGIS · gRPC · Kafka · Docker

---

## 🔴 Critical Facts (read first)

| Fact | Context |
|------|---------|
| `@nestjs/typeorm` broken in Docker/pnpm | Use `new DataSource()` directly (ADR-001) |
| **Use Makefile** for all commands | `make help` — single source of truth |
| `git checkout -- .` | Rollbacks EVERYTHING. Use `git restore path` |
| Init SQL runs once | `docker compose down -v && up -d` on schema errors |

---

## 🏗️ Architecture

```
api-gateway :3000 (HTTP)
  └── gRPC ──► order :50051, fleet :50053, routing :50054,
                tracking :50055, dispatcher :50056, counterparty :50057,
                invoice :50052

Kafka Topics: order.created/updated/delivered/assigned/completed/failed,
              vehicle.status.changed/telemetry
```

### Services

| Service | Port | DB | Key Patterns |
|---------|------|-----|-------------|
| api-gateway | 3000 | pg-auth | JWT, RBAC, WebSocket |
| order-service | 50051 | pg-order | Outbox, State Machine |
| fleet-service | 50053 | pg-fleet+PostGIS | OptimisticLock |
| routing-service | 50054 | pg-routing+PostGIS | Route cache |
| tracking-service | 50055 | pg-tracking | Backpressure, Batch writes |
| dispatcher-service | 50056 | pg-dispatcher | Saga, Compensation |
| counterparty-service | 50057 | pg-counterparty | OptimisticLock |
| invoice-service | 50052 | pg-invoices | PDF gen, VAT calc |

---

## 🎯 Rules

```
✅ Server state → React Query | Client state → Zustand
✅ Forms → RHF + Zod
✅ Map >50 markers → MarkerClusterGroup
✅ Real-time → socket.ts + useWebSocket
✅ Component = [loading] + [error] + [data] + [empty]
```

---

## 🔌 gRPC Ports (Docker → localhost)

| Service | Port |
|---------|------|
| order | 50051 |
| invoice | 50052 |
| fleet | 50053 |
| routing | 50054 |
| tracking | 50055 |
| dispatcher | 50056 |
| counterparty | 50057 |

---

## 📡 WebSocket Events

| Event | Payload | Where |
|-------|---------|-------|
| `order:update` | `{ orderId, status, ... }` | Orders list, detail |
| `vehicle:update` | `{ vehicleId, lat, lng, speed }` | Map, tracking |
| `order:assigned` | `{ orderId, vehicleId }` | Detail + toast |
| `order:completed` | `{ orderId }` | List badge update |

---

## 🔍 Observability

| Tool | URL |
|------|-----|
| Grafana | http://localhost:3001 (admin/admin) |
| Jaeger | http://localhost:16686 |
| Kafka UI | http://localhost:8080 |
| Prometheus | http://localhost:9090 |

---

## 📚 When to Read What

| Task | Read |
|------|------|
| Any task | `MEMORY.md` — critical facts + active problems |
| Backend task >50 lines | `00-README.md` + `02-Contracts.md` |
| Writing tests | `05-Testing-Patterns.md` |
| Something broken | `03-Pitfalls.md` (by symptom) |
| Architecture decision | `01-ADRs.md` + `04-Good-Practices.md` |
| New feature | `06-Processes.md` (runbooks) |

---

## ✅ Pre-commit (fast)

```bash
make typecheck && make lint && make test
```

---

## 💡 How to Update

1. **New feature** → `00-README.md` (architecture)
2. **gRPC/Kafka contract** → `02-Contracts.md` + `docs/COMMUNICATION.md`
3. **DB schema** → `docs/DATABASE.md`
4. **REST endpoint** → `docs/API.md`
5. **New pattern** → `04-Good-Practices.md` (after 2+ uses)
6. **Trap found** → `03-Pitfalls.md` (after >15 min debug)
7. **Decision made** → `01-ADRs.md`
8. **Critical fact** → `MEMORY.md`

> Rule: If unsure — update. Extra record cheaper than lost knowledge.