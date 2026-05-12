# MEMORY — Project + Learning Log

> Read first. Contains: 🔴 critical facts, 🛠 active problems, 📈 learning progress, 💡 last session.
> Updated: 2026-05-13

---

## 🔴 Critical Facts

| Fact | Context |
|------|---------|
| **REST API uses camelCase** | Responses: `counterpartyId`, `orderId`, `amountRub` — NOT `snake_case` |
| `@nestjs/typeorm` broken in Docker/pnpm | Use `new DataSource()` directly (ADR-001) |
| **Kafka: NestJS @EventPattern broken** | Use manual KafkaJS consumer in `onModuleInit()` |
| NestJS versions | Only `10.x`. Root `^11.x` breaks Docker build |
| Init SQL | Runs once. `docker compose down -v && up -d` on errors |
| gRPC enum fields arrive as strings | `'ORDER_STATUS_PENDING'`, not number. Map both ways. |
| **useMake for all commands** | `make help` — single source of truth |

---

## 🛠 Active Problems

| Problem | Priority | Workaround | Fix |
|---------|----------|------------|-----|
| `document-templates` ESM/CJS conflict | 🟡 Medium | `esModuleInterop: true` + `require()` | Migrate to ESM |
| E2E gRPC timeouts (docker runner) | 🟡 Medium | Run locally with env vars | Fix docker-compose network |
| Kafka KRaft unstable → ZooKeeper | 🟡 Medium | ZooKeeper mode | Use ZooKeeper |

---

## 📈 How I'm Learning

### What I figured out this session

| Insight | Evidence |
|---------|----------|
| Session = Problem + Command + Result pattern | make typecheck → 0 errors ✅ |
| `make health-check` before session = fast state check | Used in this session |
| "Proof it works" = command + expected + actual result | Will use in next session |
| Clean docs first, then code | Saved 2+ hours of confusion |

### Evidence (patterns that work)

| Pattern | Command | Expected | Actual | Date |
|---------|---------|----------|--------|------|
| DataSource factory | `make typecheck` | 0 errors | ✅ 0 errors | 2026-05-13 |
| KafkaJS consumer | `make test` | 49 passed | ✅ 49 passed | 2026-05-08 |
| Graceful shutdown | `docker stop` | clean exit | ✅ signal handled | 2026-05-13 |
| Docs cleanup first | `make health-check` | fast overview | ✅ | 2026-05-13 |

### Blind spots (what I don't know well)

| Topic | Last attempt | Confidence | What I need |
|-------|--------------|------------|-------------|
| E2E testing patterns | 2026-05-08 | 🟡 Medium | More practice |
| gRPC error handling | 2026-05-13 | 🟡 Medium | Real examples |
| Kafka KRaft vs ZooKeeper | 2026-05-08 | 🟡 Medium | More research |

### What I want to try next

- [ ] Use graphify for pattern detection in codebase
- [ ] Build faster: check `make health-check` before starting
- [ ] Write evidence for every new pattern I use

---

## 📅 Last Session (2026-05-13)

### What we did

**Frontend cleanup:**
- Deleted: `format.ts`, `useToast.ts`, `features/orders/index.ts` (unused exports)
- Cleaned: `utils.ts` (cn only), `api.clients.ts` (removed unused interfaces)
- Refactored: `notification.store.ts` (removed dead `useNotifications` hook)
- Improved: `entrypoint.sh` (graceful shutdown with trap SIGTERM/SIGINT)

**Backend docs cleanup:**
- Cleaned `05-Testing-Patterns.md` (removed embedded content from bad merge)
- Rewrote `00-README.md` (architecture + quick ref only, no commands)
- Fixed ports in 00-README (fleet=50053, routing=50054, etc.)
- Unified pre-commit: `make typecheck && make lint && make test`

### What we learned

- **Unused exports detection**: `grep -r "from" src/ | grep -v node_modules | sort | uniq -c | sort -rn | head -20`
- **Docker entrypoint**: Use `trap` for graceful shutdown, `exec` for PID 1
- **Graphify for knowledge extraction**: Use agent to find patterns across codebase

### Next steps

- Backend docs: rewrite MEMORY.md, simplify 06-Processes.md
- Frontend: check OrdersPage for large file candidates
- Backend: audit services for unused code patterns

---

## ✅ Confirmed Patterns (quick ref)

```typescript
// DataSource Factory (@Global)
@Global() @Module({
  providers: [{
    provide: DataSource,
    useFactory: async (cfg) => { const ds = new DataSource({...}); await ds.initialize(); return ds; },
    inject: [ConfigService],
  }],
  exports: [DataSource],
})
export class DatabaseModule {}

// Unit-test with gRPC
const grpcMock = { getService: jest.fn().mockReturnValue({ method: jest.fn() }) };
const service = new MyService(mockConfig as any, grpcMock as any);
service.onModuleInit();

// Kafka consumer (manual, not @EventPattern)
async onModuleInit() {
  const kafka = new Kafka({...});
  const consumer = kafka.consumer({ groupId: '...' });
  await consumer.connect();
  await consumer.subscribe({ topic: '...' });
  await consumer.run({ eachMessage: async ({ message }) => { ... } });
}
```

---

## 🔍 Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `Nest can't resolve dependencies` | `@nestjs/typeorm` | Replace with `DataSource` factory |
| `column does not exist` | Init SQL not applied | `docker compose down -v && up -d` |
| gRPC `Internal Error` | Incomplete DB schema | Check `\dt` + Jaeger trace |
| Kafka duplicate messages | No idempotency | Check `eventId` in `processed_events` |
| Jest can't find tests | `.js` in `src/` | `find ... -name "*.js" -path "*/src/*" -delete` |
| E2E Babel error | `isolatedModules: true` in E2E jest config | Set `useIsolatedModules: false` |

---

## 📚 Decisions (ADRs)

| ID | Decision | Date |
|----|----------|------|
| ADR-001 | TypeORM via `new DataSource()` directly | 2026-04 |
| ADR-002 | Outbox pattern for Kafka | 2026-03 |
| ADR-003 | API versioning via URL (`/api/v1/`) | 2026-02 |
| ADR-004 | Separate `*_test` DBs on ports 6401-6407 | 2026-04 |

---

> **Rule**: Problem solved >3 days ago → move to `01-ADRs.md` or `03-Pitfalls.md`. Don't accumulate history.