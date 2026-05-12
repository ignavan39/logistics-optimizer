# Processes — Runbooks

> Read before action. Don't memorize — check here.

---

## 🚀 Start Session

```bash
make health-check
```

Checks:
- Docker containers running (`docker compose ps | grep Up`)
- Git clean or stashed
- Infra healthy

---

## 🛠 Feature Development

```
1. make health-check          # Verify infra
2. Read MEMORY.md            # Critical facts + active problems
3. Plan (>50 lines → MUST)   # Decompose + architect check
4. Write tests first         # Unit → Integration → E2E
5. Implement                 # Patterns from 04-Good-Practices
6. make typecheck && make lint && make test  # Pre-commit
7. UPDATE docs               # What changed?
```

---

## 🔌 Add gRPC Method

```
1. libs/proto/service.proto — add RPC
2. make proto                # Build proto types
3. Implement @GrpcMethod()   # In service
4. Add client call           # In dependent service
5. Write integration test    # make test:grpc
6. Update 02-Contracts.md + docs/COMMUNICATION.md
```

---

## 📨 Add Kafka Topic

```
1. infra/docker-compose.yml — add topic (kafka-init)
2. libs/kafka-utils/src/events/ — define payload interface
3. Publisher via Outbox     # NOT direct produce
4. Consumer with IdempotencyGuard
5. Write integration test
6. Update 02-Contracts.md + docs/COMMUNICATION.md
```

---

## ✅ Code Review Checklist

- [ ] No `process.env` → only `configService.get()`
- [ ] No `@nestjs/typeorm` → only `DataSource`
- [ ] No HTTP between services
- [ ] Kafka publish via **Outbox** only
- [ ] Kafka consumer → **IdempotencyGuard**
- [ ] Concurrent entities → `@VersionColumn`
- [ ] No `any` without justification
- [ ] Tests written and passing
- [ ] Docs updated
- [ ] No secrets in code

---

## 🔍 Troubleshooting

| Symptom | Command | Fix |
|---------|---------|-----|
| `Nest can't resolve dependencies` | `grep -r "@nestjs/typeorm" apps/` | DataSource factory (ADR-001) |
| `column does not exist` | `docker compose down -v && up -d` | Init SQL not applied |
| gRPC `Internal Error` | `docker exec pg-order psql -U logistics -d order_db -c "\dt"` | Check schema + Jaeger |
| Kafka consumer lag | `open http://localhost:8080` | Check `processed_events` |
| Jest can't find tests | `find apps libs -name "*.js" -path "*/src/*" -delete` | Delete compiled .js |

---

## 🔧 Quick Commands

```bash
# Infra
make up            # Start Docker
make down          # Stop Docker
make logs          # Tail all logs
make restart       # Restart services

# Dev
make web           # Frontend (localhost:5173)
make proto         # Build proto files

# Quality
make typecheck     # TypeScript
make lint          # ESLint
make test          # Unit tests
make test:e2e      # E2E (needs infra)
make test:grpc     # gRPC integration

# Cleanup
make clean         # Remove containers + volumes
make clean:all     # Remove everything including node_modules
```

---

## 🏗 Create New Service

```bash
# 1. Copy from existing (e.g., counterparty-service)
# 2. Add to docker-compose.services.yml
# 3. Create init SQL in infra/postgres/init-[service].sql
# 4. Add pgbouncer on port 640X (ADR-004)
# 5. Add proto in libs/proto/
# 6. Update: 00-README.md, 02-Contracts.md, docs/SERVICES.md, docs/COMMUNICATION.md
```

---

## 📊 Observability

| Tool | Command | URL |
|------|---------|-----|
| Logs | `make logs` | — |
| Jaeger | `open http://localhost:16686` | Traces |
| Kafka UI | `open http://localhost:8080` | Topics, lag |
| Grafana | `open http://localhost:3001` | admin/admin |
| Prometheus | `open http://localhost:9090` | Metrics |