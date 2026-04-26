# Good-Practices — Правильные паттерны

> "Проверенные подходы для копирования" — как делать правильно.

---

## State Management

### React Query — Server State

```typescript
// Server state — данные с API
const { data, isLoading, error } = useQuery({
  queryKey: ['orders'],
  queryFn: () => apiClient.getOrders(),
  staleTime: 5000, // 5 секунд
  retry: 3,
});
```

### Zustand — Client State

```typescript
// Client state — локальное состояние
interface AppStore {
  selectedOrder: Order | null;
  setSelectedOrder: (order: Order | null) => void;
}

const useStore = create<AppStore>((set) => ({
  selectedOrder: null,
  setSelectedOrder: (order) => set({ selectedOrder: order }),
}));
```

---

## Maps — Карты

### react-leaflet с оптимизацией

```typescript
// ✅ С мемоизацией
const MarkerWithPopup = React.memo(({ position }) => (
  <Marker position={position}>
    <Popup>{/* content */}</Popup>
  </Marker>
));

// ✅ С кластеризацией > 100 маркеров
<MarkerClusterGroup>
  {orders.map((o) => (
    <MarkerWithPopup key={o.id} position={[o.lat, o.lng]} />
  ))}
</MarkerClusterGroup>
```

---

## Styling

### clsx + tailwind-merge

```typescript
// ✅ Утилита для классов
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Использование
<div className={cn('base-class', isActive && 'active')}>
```

---

## Types

### Всегда типизируй

```typescript
// ✅ Интерфейсы
interface Order {
  id: string;
  status: OrderStatus;
  cargo: Cargo;
}

// ✅ Generic функции
function fetchData<T>(url: string): Promise<T> {
  return api.get<T>(url);
}
```

---

## Components

### Структура компонента

```typescript
// ✅ Правильная структура
export function OrderCard({ order }: OrderCardProps) {
  // 1. Hooks
  const { data } = useQuery({ queryKey: ['order', order.id] });
  
  // 2. Early return
  if (!data) return <Skeleton />;
  
  // 3. Render
  return (
    <div className="order-card">
      <OrderStatus status={data.status} />
      <OrderInfo order={data} />
    </div>
  );
}
```