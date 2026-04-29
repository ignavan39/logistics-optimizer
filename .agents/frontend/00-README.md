# 📄 apps/web/.agents/frontend/00-README.md

```markdown
# Frontend Agent — Справочник (00-README)

> React 18 · TypeScript · Vite · Tailwind · React Query · Zustand · react-leaflet · Socket.io  
> 🗺️=Map 📡=WebSocket 🎨=UI 📦=State 🧪=Test

---

## ⚡ Золотые правила (одним взглядом)

```
✅ Server state → React Query (кеш, retry, инвалидация)
✅ Client state → Zustand (UI: фильтры, модалы, выбранный заказ)
✅ Формы → RHF + Zod (никаких useState для полей)
✅ Карта >50 маркеров → MarkerClusterGroup
✅ Real-time → единый socket.ts + useWebSocket хук
✅ Компонент = [loading] + [error] + [data] + [empty]
✅ Auth: accessToken в памяти, refreshToken в httpOnly cookie
```

---

## 🗺️ Страницы и роуты

| Страница | Роут | Ключевые компоненты | Источник данных |
|----------|------|---------------------|-----------------|
| 🔑 Login | `/login` | LoginForm | POST `/auth/login` |
| 📦 Orders | `/orders` | OrdersList, OrderFilters | `useQuery(['orders'])` |
| 🔍 Order Detail | `/orders/:id` | OrderCard, OrderMap, StatusHistory | `useQuery(['orders', id])` + WS |
| ➕ Create Order | `/orders/new` | OrderForm (RHF+Zod) | `useMutation` |
| 🚚 Vehicles | `/vehicles` | VehiclesTable, VehicleMap (Cluster) | `useQuery(['vehicles'])` |
| 📍 Tracking | `/tracking/:vehicleId` | FullScreenMap, TrackPolyline | `useQuery` + WS `vehicle:update` |
| 🤝 Counterparties | `/counterparties` | CounterpartiesList, ContractsList | `useQuery(['counterparties'])` |
| 🧾 Invoices | `/invoices` | InvoicesList, PDF-download | `useQuery(['invoices'])` |
| ⚙️ Settings | `/settings` | CompanySettingsForm (admin) | `useQuery` + `useMutation` |
| 👮 Admin | `/admin` | UsersList, AuditLogsList | `useQuery(['admin/users'])` |

---

## 🏗️ Архитектурные правила (R1-R5)

### R1: Server vs Client State 📦
```typescript
✅ useQuery(['orders'])               // серверные данные
✅ useStore((s) => s.selectedOrderId) // UI-выбор
❌ useState для данных с API          // race conditions, нет кеша, нет retry
```

### R2: Компонент = 4 состояния 🎨
```typescript
if (isLoading) return <Skeleton />;
if (error) return <ErrorMessage error={error} onRetry={refetch} />;
if (!data?.length) return <EmptyState action={createNew} />;
return <ActualComponent data={data} />;
```

### R3: Формы = RHF + Zod ✍️
```
Любая форма → useForm({ resolver: zodResolver(schema) })
Никаких useState для управления полями формы. Валидация на клиенте + дублирование на сервере.
```

### R4: Карты — производительность 🗺️
| Маркеров | Решение |
|----------|---------|
| <50 | Простые `Marker` |
| 50-500 | `MarkerClusterGroup` |
| >500 | Виртуализация + кластеризация |
Real-time → обновлять только изменившийся маркер (`React.memo` + stable `key`)

### R5: WebSocket — единая точка 📡
`lib/socket.ts` — один инстанс на приложение. Подключение при логине, отключение при логауте.  
Все компоненты подписываются через `useWebSocket` хук. Обязательно: обработка `reconnect`, `reconnect_error`, `disconnect`.

---

## 🔄 Поток данных (кратко)
```
API Response → React Query (кеш) → useQuery() / useMutation()
                                      ↓
Component render ← User Action → Zustand (UI state) или invalidateQueries
```

---

## 🔑 Auth Flow
1. `POST /auth/login` → `{ accessToken, refreshToken }`
2. `accessToken` → Zustand (memory), `refreshToken` → httpOnly cookie
3. axios interceptor: `Authorization: Bearer <token>`
4. При 401 → `POST /auth/refresh` → новый token
5. При logout → `POST /auth/logout` + `clearStore` + `socket.disconnect()`

---

## 📡 WebSocket Events (Socket.io)

| Event | Payload | Где использовать |
|-------|---------|------------------|
| `order:update` | `{ orderId, status, ... }` | Orders list, Detail |
| `vehicle:update` | `{ vehicleId, lat, lng, speed }` | Vehicles map, Tracking |
| `order:assigned` | `{ orderId, vehicleId }` | Detail + toast |
| `order:completed` | `{ orderId }` | List badge update |
| `order:failed` | `{ orderId, reason }` | Toast |
| `vehicle:near-destination` | `{ vehicleId, orderId }` | Toast + map highlight |

---

## 🧪 Тестирование

| Тип | Инструмент | Правило |
|-----|-----------|---------|
| Unit | Vitest | Мокай API, тестируй логику/хуки |
| Component | Testing Library | Тестируй как пользователь (текст, роль, label) |
| E2E | Playwright | Полные сценарии: логин → действие → результат |

**Запуск:**
```bash
pnpm test           # Unit + Component (watch)
pnpm test:e2e       # Playwright (нужен запущенный dev-сервер)
```

---

## 🚀 Команды & Pre-commit

```bash
cd apps/web

pnpm dev            # http://localhost:5173 (HMR)
pnpm build          # production build → dist/
pnpm preview        # Превью production

pnpm test           # Vitest
pnpm test:e2e       # Playwright

pnpm lint && pnpm typecheck && pnpm build  # Pre-commit (обязательно)
```

---

## 🔍 Observability

| Инструмент | Как открыть | Что смотреть |
|-----------|-------------|-------------|
| React DevTools | F12 → Components | Дерево компонентов, пропсы, ре-рендеры |
| React Query DevTools | F12 → Query | Кеш, статус запросов, инвалидация |
| Network / WS | F12 → Network | API вызовы, WebSocket frames |
| Grafana | http://localhost:3001 | Frontend метрики (если подключено) |

---

## 💡 Как обновлять этот файл

1. **Добавляй** только при изменении стека, новой странице, новом архитектурном правиле
2. **Формат**: таблица > параграф, код > описание
3. **Не дублируй** `AGENTS.md` (протокол работы) и `MEMORY.md` (live state / баги)
4. **Используй эмодзи-якоря**: 🗺️ 📡 🎨 📦 🧪 🔍 для быстрого сканирования

> 🎯 Цель: новый агент или разработчик за 2 минуты понимает: как устроено, что можно, что нельзя.
```
