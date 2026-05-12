# 04-Good-Practices.md

> Patterns that work well in this codebase. Follow these — they were tested.

---

## 📂 File & Component Structure

### Разбиение крупных файлов
| Размер файла | Действие |
|-------------|----------|
| >200 lines | Кандидат на разбиение |
| Tab-based page | `pages/PageName/TabName.tsx` |
| List + Modal | `components/domain/ListTable.tsx` + `components/domain/*Modal.tsx` |

### Структура директорий
```
src/
├── lib/              # Утилиты (format, status, toast, auth, socket, api.clients)
├── types/            # Типы и константы (vehicle.ts, order.ts)
├── stores/           # Zustand stores
├── components/ui/    # Переиспользуемые UI (Button, Modal, StatusBadge)
├── components/[domain]/  # Domain-компоненты (counterparties, vehicles)
└── pages/            # Страницы (OrdersPage, SettingsPage, SettingsPage/TabName.tsx)
```

---

## 🎨 UI Components

### forwardRef на всех UI-компонентах
```tsx
// Всегда используй forwardRef — позволяет родителям получать ref
const Button = forwardRef<HTMLButtonElement, ButtonProps>(...)
```

### cn() для классов
```tsx
// Всегда через cn() (clsx + twMerge)
<button className={cn('base-class', isActive && 'active-class', className)} />
```

### 4 состояния компонента
```tsx
if (isLoading) return <Skeleton />;
if (error) return <ErrorMessage error={error} onRetry={refetch} />;
if (!data?.length) return <EmptyState />;
return <DataView data={data} />;
```

---

## 📦 State Management

### React Query — серверный стейт
```tsx
// Всегда указывай queryKey в invalidateQueries
const mutation = useMutation({
  mutationFn: api.createVehicle,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['vehicles'] });
  },
});

// staleTime 60s в main.tsx — не меняй без причины
```

### Zustand — UI стейт
```tsx
// Всегда fine-grained selector
const count = useStore((s) => s.count);       // ✅
const fullStore = useStore();                  // ❌

// Всегда функциональный update
set((s) => ({ count: s.count + 1 }));          // ✅
state.count++;                                 // ❌
```

---

## 🧩 Forms (RHF + Zod)

```tsx
const schema = z.object({ name: z.string().min(1) });
const form = useForm({ resolver: zodResolver(schema) });

<form onSubmit={form.handleSubmit(onSubmit)}>
  <input {...form.register('name')} />
  {form.formState.errors.name && <span>{form.formState.errors.name.message}</span>}
</form>
```

---

## 🏷️ Status & Constants

### Единый источник истины
```
lib/status.ts    → STATUS_LABELS, STATUS_COLORS (ORDER, VEHICLE, INVOICE, COUNTERPARTY)
types/vehicle.ts → VEHICLE_TYPE_LABELS
```

### StatusBadge компонент
```tsx
<StatusBadge type="vehicle" status="active" />
```

---

## 🔌 API Layer

### Типизированные клиенты (lib/api.clients.ts)
```tsx
// Один инстанс axios с interceptor
const api = axios.create({ baseURL: '/api' });
api.interceptors.request.use(addAuthHeader);

// Методы по доменам
export const vehiclesApi = { getAll, getById, create, update, delete };
export const ordersApi = { ... };
```

---

## 🚀 Performance

### Маркеры на карте — только нужный обновляй
```tsx
// React.memo + stable key
const Marker = React.memo(({ vehicle }) => <MarkerComponent vehicle={vehicle} />, (prev, next) =>
  prev.vehicle.lat === next.vehicle.lat && prev.vehicle.lng === next.vehicle.lng
);
```

### Lazy loading страниц
```tsx
const VehiclesPage = lazy(() => import('./pages/VehiclesPage'));
<Suspense fallback={<PageLoader />}><Routes>...</Routes></Suspense>
```

---

## ✅ Checklist перед коммитом

- [ ] `pnpm typecheck` — 0 errors
- [ ] `pnpm lint` — 0 errors (warnings ok)
- [ ] Никаких `useState` для данных с API
- [ ] Все формы через RHF + Zod
- [ ] Status константы из lib/status.ts (не inline)
- [ ] cn() для всех Tailwind классов
- [ ] Fine-grained Zustand selectors