# Frontend Agent — Архитектурный справочник

> React 18 · TypeScript · Vite · Tailwind · React Query · Zustand · react-leaflet · Socket.io

---

## ⚡ Когда обновлять ЭТОТ файл

Обнови если:
- Добавилась новая страница или роут
- Изменился стек (новая библиотека)
- Изменились правила архитектуры

---

## Страницы приложения

| Страница | Роут | Основные компоненты | Данные |
|---------|------|--------------------|----|
| Login | `/login` | LoginForm | POST /auth/login |
| Orders | `/orders` | OrdersList, OrderFilters | GET /api/v1/orders |
| Order Detail | `/orders/:id` | OrderCard, OrderMap, StatusHistory | GET /api/v1/orders/:id |
| Create Order | `/orders/new` | OrderForm (RHF+Zod) | POST /api/v1/orders |
| Vehicles | `/vehicles` | VehiclesTable, VehicleMap | GET /api/v1/vehicles |
| Tracking | `/tracking/:vehicleId` | FullScreenMap, TrackPolyline | GET /tracking/:id + WS |
| Counterparties | `/counterparties` | CounterpartiesList, ContractsList | GET /api/v1/counterparties |
| Invoices | `/invoices` | InvoicesList, PDF-download | GET /api/v1/invoices |
| Settings | `/settings` | CompanySettingsForm (admin) | GET/PUT /settings/company |
| Admin | `/admin` | UsersList, AuditLogsList | GET /admin/users |

---

## Правила архитектуры

### R1: Server State vs Client State
```
Server State (React Query):  всё что приходит с API
Client State (Zustand):      UI-состояние — выбранный заказ, открытый модал, фильтры, sidebar

Граница чёткая:
✅ useQuery(['orders'])               → список заказов
✅ useStore((s) => s.selectedOrderId) → какой заказ выбран в UI
❌ useState для данных с API          → race conditions, нет кеша
```

### R2: Компонент = loading + error + data
```typescript
// Каждый компонент с данными обязан обрабатывать все 3 состояния
if (isLoading) return <Skeleton />;
if (error) return <ErrorMessage error={error} />;
if (!data?.length) return <EmptyState />;
return <ActualComponent data={data} />;
```

### R3: Формы = React Hook Form + Zod
```
Любая форма → RHF + Zod схема
Никаких useState для управления полями формы
```

### R4: Карты — производительность обязательна
```
<50 маркеров  → простые Marker
>50 маркеров  → MarkerClusterGroup
Real-time    → обновлять только изменившийся маркер, не весь список
```

### R5: WebSocket через единый socket.ts
```typescript
// lib/socket.ts — один инстанс на приложение
// Подключение при логине, дисконнект при логауте
// Все компоненты подписываются через useWebSocket хук
```

---

## Архитектура стейта

```
API Response
    ↓
React Query (кеш + sync)
    ↓                    ↓
 useQuery()           useMutation() + onSuccess → invalidateQueries
    ↓
 Component render
    ↓
User Action → Zustand (UI state) или useMutation (server mutation)
```

---

## Auth Flow

```
1. POST /auth/login → { accessToken, refreshToken }
2. Сохранить accessToken в memory (Zustand), refreshToken в httpOnly cookie
3. axios interceptor добавляет Authorization: Bearer <token>
4. При 401 → POST /auth/refresh → новый accessToken
5. При logout → POST /auth/logout + clearStore
```

---

## WebSocket Events (Socket.io)

| Event | Payload | Где использовать |
|-------|---------|-----------------|
| `order:update` | `{ orderId, status, ... }` | Orders list, Order detail |
| `vehicle:update` | `{ vehicleId, lat, lng, ... }` | Vehicles map, Tracking |
| `order:assigned` | `{ orderId, vehicleId }` | Order detail notification |
| `order:completed` | `{ orderId }` | Orders list badge |
| `order:failed` | `{ orderId, reason }` | Toast notification |
| `vehicle:near-destination` | `{ vehicleId, orderId }` | Toast notification |

---

## Структура хука с React Query

```typescript
// hooks/use-orders.ts
export function useOrders(filters?: OrderFilters) {
  return useQuery({
    queryKey: ['orders', filters],
    queryFn: () => apiClient.getOrders(filters),
    staleTime: 30_000,
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ['orders', id],
    queryFn: () => apiClient.getOrder(id),
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: apiClient.createOrder,
    onSuccess: (newOrder) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      // Optimistic: добавляем в кеш сразу
      queryClient.setQueryData(['orders', newOrder.id], newOrder);
    },
  });
}
```

---

## Роли и доступ к страницам

| Роль | Доступные страницы |
|------|-------------------|
| admin | Все |
| dispatcher | orders, vehicles, tracking, counterparties, invoices |
| driver | orders (только свои), tracking |
| viewer | orders (read), vehicles (read), tracking (read) |
| api_client | Нет UI (только API) |