# MEMORY — Накопленные знания о Frontend

> Живая память. Обновляй когда узнал что-то важное о проекте или технологиях.

---

## 🔴 Критические факты

| Факт | Контекст |
|------|---------|
| **REST API использует camelCase** | Ответы: `counterpartyId`, `orderId`, `amountRub`, `vatRate`, `vatAmount`, `dueDate`, `paidAt`, `createdAt` — НЕ snake_case |
| Карта с >100 маркерами без кластеризации = freeze | Всегда MarkerClusterGroup или виртуализация |
| `useEffect` + `fetch` = race condition | Только React Query для серверного стейта |
| Zustand `state.field++` — мутация стора | Всегда `set((s) => ({ count: s.count + 1 }))` |
| Socket.io reconnect не автоматический в некоторых случаях | Явно обрабатывай `disconnect`, `reconnect_error` |
| Leaflet SSR не поддерживает | Импортировать динамически если нужен SSR |

---

## 📚 Принятые решения (ADRs)

| ID | Решение | Дата |
|----|---------|------|
| ADR-001 | React Query для всего серверного стейта | 2026-04 |
| ADR-002 | Zustand для UI стейта (выбранный заказ, фильтры, сайдбар) | 2026-04 |
| ADR-003 | react-leaflet + MarkerClusterGroup для карт | 2026-04 |
| ADR-004 | Tailwind + clsx/twMerge через cn() | 2026-04 |
| ADR-005 | Socket.io-client для WebSocket (real-time tracking) | 2026-04 |
| ADR-006 | React Hook Form + Zod для всех форм | 2026-04 |

---

## 🐛 Известные проблемы (открытые)

| Проблема | Где | Временное решение |
|---------|-----|-------------------|
| _добавляй сюда_ | — | — |

---

## 🔍 Частые проблемы и решения

### Карта не рендерится / белый экран
```bash
# 1. Проверить импорт CSS
import 'leaflet/dist/leaflet.css';  # должно быть в main.tsx или layout

# 2. Проверить что контейнер имеет высоту
<div style={{ height: '400px' }}>
  <MapContainer ...>
```

### React Query не инвалидирует после мутации
```typescript
// Обязательно указывать queryKey в invalidateQueries
const mutation = useMutation({
  mutationFn: api.createOrder,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['orders'] }); // ← именно так
  },
});
```

### Zustand стейт не обновляет компонент
```typescript
// Плохо — подписка на весь стор
const store = useStore();
// Хорошо — подписка только на нужное поле
const selectedOrder = useStore((s) => s.selectedOrder);
```

### Socket.io обновляет все маркеры при каждом событии
```typescript
// Обновляй только нужный маркер через Zustand
// Не перерисовывай весь список — используй React.memo + stable key
```

---

## 📐 Страницы и их статус

| Страница | Роут | Статус |
|---------|------|--------|
| Login | `/login` | _добавляй_ |
| Orders | `/orders` | _добавляй_ |
| Order Detail | `/orders/:id` | _добавляй_ |
| Vehicles | `/vehicles` | _добавляй_ |
| Tracking | `/tracking/:vehicleId` | _добавляй_ |
| Counterparties | `/counterparties` | _добавляй_ |
| Invoices | `/invoices` | _добавляй_ |
| Settings | `/settings` | _добавляй_ |
| Admin | `/admin` | _добавляй_ |

---

## 📅 Лог сессий

| Дата | Что делали | Что узнали |
|------|-----------|-----------|
| _добавляй_ | | |

---

## 🏗️ Технический долг

| Проблема | Предложение | Приоритет |
|---------|-------------|-----------|
| _добавляй_ | | |