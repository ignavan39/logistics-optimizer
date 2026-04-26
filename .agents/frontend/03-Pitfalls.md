# Pitfalls — Антипаттерны (НЕ делать)

> "Грабли" — ошибки и антипаттерны во frontend разработке.

---

## Anti-patterns

| Антипаттерн | Почему плохо | Правильно |
|------------|--------------|------------|
| `useEffect` для фетчинга | Race conditions, нет кеша | React Query (`useQuery`) |
| Мутация Zustand напрямую | Непредсказуемое поведение | Только через `actions` |
| >50 маркеров без кластеризации | Лагает карта | MarkerCluster |
| `any` в TypeScript | Теряется типизация | Всегда типизируй |
| Hardcoded URL | Не работает в проде | ENV variables |
| CSS без Tailwind | Инconsistency | Tailwind + clsx |

---

## React pitfalls

### ❌ useEffect для фетчинга

```typescript
// ПЛОХО
const [orders, setOrders] = useState([]);
useEffect(() => {
  fetch('/api/orders').then(setOrders);
}, []);
```

### ✅ React Query

```typescript
// ХОРОШО
const { data } = useQuery({
  queryKey: ['orders'],
  queryFn: () => api.getOrders(),
});
```

---

## State pitfalls

### ❌ Мутация Zustand

```typescript
// ПЛОХО
const store = create((set) => ({
  count: 0,
  increment: () => store.count++, // мутация!
}));
```

### ✅ Сеттер

```typescript
// ХОРОШО
const useStore = create((set) => ({
  count: 0,
  increment: () => set((s) => ({ count: s.count + 1 })),
}));
```

---

## Map pitfalls

### ❌ Без кластеризации

```typescript
{orders.map((o) => <Marker key={o.id} position={[o.lat, o.lng]} />)}
```

### ✅ С кластеризацией

```typescript
<MarkerClusterGroup>
  {orders.map((o) => <Marker key={o.id} position={[o.lat, o.lng]} />)}
</MarkerClusterGroup>
```