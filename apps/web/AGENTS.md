# 📄 `.agents/frontend/AGENTS.md` — Frontend Agent Protocol

```markdown
# apps/web — Frontend Agent Protocol

> React 18 · TypeScript · Vite · Tailwind · React Query · Zustand · react-leaflet · Socket.io  
> 🗺️=Map 📡=WebSocket 🎨=UI 📦=State 🧪=Test

---

## 🔄 ПРОТОКОЛ: READ → THINK → DO → UPDATE (обязательно)

### 1️⃣ READ — перед любой задачей
```
Любая задача     →  .agents/frontend/MEMORY.md              (что уже знаем)
Новая фича       →  .agents/frontend/00-README.md            (архитектура + страницы)
Интеграция API   →  .agents/frontend/02-Contract-Checklist.md
Тесты            →  .agents/frontend/05-Testing-Patterns.md
Backend контракт →  .agents/backend/02-Contracts.md          (Kafka/gRPC события)
```

### 2️⃣ THINK — перед кодом (>50 строк)

**🧭 Быстрый выбор действия:**
```
Задача затрагивает...
├─ Карту? → [ ] MarkerCluster? [ ] Виртуализация? [ ] 03-Pitfalls#map
├─ Форму? → [ ] RHF + Zod? [ ] Валидация на сервере? [ ] 04-Good-Practices#forms
├─ Real-time? → [ ] WebSocket через useWebSocket? [ ] Обработка reconnect?
├─ Серверные данные? → [ ] React Query? [ ] staleTime? [ ] invalidateQueries?
├─ UI-стейт? → [ ] Zustand селектор (не весь стор)?
├─ Новый API контракт? → [ ] Обновить 02-Contract-Checklist.md + notify backend
└─ Новая страница? → [ ] Добавить в 00-README.md таблицу страниц
```

**UX Checklist (обязательно):**
- [ ] Loading state (Skeleton / Spinner)
- [ ] Error state (понятное сообщение + retry)
- [ ] Empty state (call-to-action)
- [ ] Mobile responsive (если страница публичная)

### 3️⃣ DO — выполни задачу
- Следуй `04-Good-Practices.md`
- Избегай `03-Pitfalls.md`
- Компонент без теста = не готов
- Нет `any` без явного обоснования

### 4️⃣ UPDATE — обязательный последний шаг

| Вопрос | Файл |
|--------|------|
| Решил нестандартную проблему? | `01-ADRs.md` |
| Потратил >15 мин на отладку? | `03-Pitfalls.md` |
| Нашёл паттерн для повтора? | `04-Good-Practices.md` |
| Изменился API контракт с бэкендом? | `02-Contract-Checklist.md` + `.agents/backend/02-Contracts.md` |
| Новая страница или роут? | `00-README.md` (таблица страниц) |
| Узнал что-то важное? | `MEMORY.md` |

> 📝 Правило: если не уверен, нужно ли обновлять — обновляй. Лишняя запись дешевле баг-фикса.

---

## 🤖 Как мне (агенту) экономить токены и быть умнее

1. **Сначала ищу в таблицах**, потом читаю текст
2. **Копирую код из блоков ✅**, не переписываю своими словами
3. **Если вижу `Сессия DD.MM.YYYY`** — проверяю актуальность для текущей задачи
4. **Перед коммитом** — запускаю чеклист из `00-README.md`, не импровизирую
5. **Если не уверен** — обновляю файл, а не гадаю
6. **Вижу `_добавляй_`** → это не баг, это приглашение заполнить
7. **Вижу `⚠️ Критично`** → читаю дважды перед применением

---

## 🗂️ Структура приложения (быстрый ориентир)

```
apps/web/src/
├── pages/          # Страницы (по роутам, React Router)
├── components/
│   ├── ui/         # Button, Input, Modal, Badge (базовые, без бизнес-логики)
│   ├── map/        # MapContainer, VehicleMarker, Cluster, TrackPolyline
│   ├── orders/     # OrderCard, OrderForm, StatusBadge, OrderFilters
│   ├── vehicles/   # VehicleCard, VehicleStatus, VehicleFilters
│   └── layout/     # Sidebar, Header, PageLayout, ProtectedRoute
├── hooks/          # useOrders, useWebSocket, useOrdersInvalidate, useMapBounds
├── stores/         # ui.store.ts, map.store.ts, auth.store.ts (Zustand)
├── lib/
│   ├── api/        # apiClient (axios instance), typed endpoints, interceptors
│   ├── socket.ts   # Socket.io singleton + reconnect + event registry
│   └── utils.ts    # cn(), formatDate(), formatPrice(), debounce()
└── types/          # Общие TypeScript типы (API responses, UI props)
```

---

## ⚡ Quick Reference (копируй и адаптируй)

| Задача | Инструмент | Пример кода |
|--------|-----------|-------------|
| Серверные данные | React Query | `useQuery({ queryKey: ['orders'], queryFn: api.getOrders, staleTime: 30_000 })` |
| UI-стейт | Zustand | `useStore((s) => s.selectedOrderId)` — подписка на поле, не на весь стор |
| Формы | RHF + Zod | `useForm({ resolver: zodResolver(orderSchema) })` — никаких `useState` для полей |
| Карта >50 маркеров | MarkerClusterGroup | `import { MarkerClusterGroup } from 'react-leaflet-cluster'` |
| Real-time | Socket.io + useWebSocket | `useWebSocket('order:update', (payload) => { ... })` |
| Стили | Tailwind + cn() | `cn('base-class', isActive && 'active', props.className)` |
| Тесты | Vitest + Testing Library | `render(<Component />); await waitFor(() => expect(...))` |
| Auth | axios interceptor + httpOnly cookie | `axios.interceptors.request.use(config => { config.headers.Authorization = `Bearer ${token}`; return config; })` |

---

## 🚫 Top Pitfalls (не повторять — копируй решения)

```
❌ useEffect + fetch → race condition, нет кеша
✅ React Query: useQuery({ queryKey, queryFn, staleTime })

❌ useState для формы → потеря валидации, сложный код
✅ RHF + Zod: useForm({ resolver: zodResolver(schema) })

❌ useStore() (подписка на весь стор) → лишний ре-рендер
✅ useStore((s) => s.field) — селектор на конкретное поле

❌ Карта без кластеризации >50 маркеров → freeze браузера
✅ MarkerClusterGroup или виртуализация списка

❌ Socket без обработки reconnect → потеря real-time при нестабильной сети
✅ socket.on('reconnect_error', (err) => { ... }); socket.on('disconnect', (reason) => { ... })

❌ invalidateQueries без queryKey → инвалидируется весь кеш
✅ { queryKey: ['orders'] } — точечная инвалидация

❌ Динамический импорт Leaflet без SSR-защиты → "window is not defined"
✅ const Map = dynamic(() => import('@/components/map/Map'), { ssr: false })
```

---

## 🧪 Testing: золотые правила

| Тип | Инструмент | Когда | Правило |
|-----|-----------|-------|---------|
| Unit | Vitest | Логика, хуки, utils | Мокай API, тестируй поведение, не реализацию |
| Component | Testing Library | UI-компоненты | Тестируй как пользователь: по тексту, роли, label |
| E2E | Playwright | Критические фичи (логин → заказ → трек) | Полные сценарии, не мокай бэкенд |

**Запуск:**
```bash
pnpm test           # Unit + Component (watch mode)
pnpm test:e2e       # Playwright (нужен запущенный dev-сервер)
pnpm test -- --run  # Unit одноразово (для CI)
```

**Unit-тест шаблон для хука:**
```typescript
// hooks/__tests__/use-orders.test.tsx
describe('useOrders', () => {
  it('fetches and returns orders', async () => {
    (api.getOrders as jest.Mock).mockResolvedValue([{ id: '1', status: 'PENDING' }]);
    
    const { result, waitFor } = renderHook(() => useOrders());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data![0].status).toBe('PENDING');
  });
});
```

---

## 🔌 WebSocket Events (Socket.io) — фронтенд справочник

| Event | Payload | Где использовать | Обработка |
|-------|---------|-----------------|-----------|
| `order:update` | `{ orderId, status, updatedAt }` | Orders list, Order detail | `queryClient.setQueryData(['orders', orderId], old => ({ ...old, ...payload }))` |
| `vehicle:update` | `{ vehicleId, lat, lng, speed, heading }` | Vehicles map, Tracking | Обновлять только маркер с `vehicleId`, не весь список |
| `order:assigned` | `{ orderId, vehicleId }` | Order detail + toast | Показать нотификацию, обновить статус заказа |
| `order:completed` | `{ orderId }` | Orders list badge | Обновить статус, показать "завершён" |
| `order:failed` | `{ orderId, reason }` | Toast notification | Показать ошибку пользователю |
| `vehicle:near-destination` | `{ vehicleId, orderId }` | Toast + highlight on map | Подсветить маршрут, показать "прибывает" |

**useWebSocket хук (единая точка):**
```typescript
// hooks/useWebSocket.ts
export function useWebSocket<T>(event: string, handler: (data: T) => void) {
  useEffect(() => {
    const socket = getSocket(); // singleton из lib/socket.ts
    socket.on(event, handler);
    return () => { socket.off(event, handler); };
  }, [event, handler]);
}
```

---

## 🧬 Эволюция: как расти вместе с проектом

Каждую пятницу (или после крупной фичи):
1. **Аудит `MEMORY.md`**: перенеси решённые проблемы в `01-ADRs.md` или `03-Pitfalls.md`
2. **Проверь `03-Pitfalls.md`**: если ловушка больше не актуальна — пометь `| ❌ [устарело] |`
3. **Обнови `04-Good-Practices.md`**: если паттерн использовался 3+ раза — добавь пример
4. **Синхронизируй с бэкендом**: если изменился API — обнови `02-Contract-Checklist.md` + notify backend agent
5. **Запиши урок**: если потратил >30 мин на проблему — добавь в `MEMORY.md` с пометкой `💡`

> 📈 Метрика успеха: с каждой сессией агент тратит меньше токенов на поиск и больше на решение.

---

## ✅ Pre-commit Checklist (запускай перед каждым коммитом)

```bash
cd apps/web

# 1. Typecheck
pnpm typecheck

# 2. Lint
pnpm lint

# 3. Build (убеждаемся, что нет ошибок компиляции)
pnpm build

# 4. Unit-тесты
pnpm test -- --run

# 5. Показать пользователю статус
git status
git diff --stat

# ТОЛЬКО после подтверждения пользователя:
# git commit -m "feat: ..."
```

**НИКОГДА НЕ делать:**
- ❌ Коммитить без `pnpm typecheck` + `pnpm lint`
- ❌ Коммитить с падающими тестами
- ❌ Коммитить без подтверждения пользователя
- ❌ Игнорировать `any` в новых файлах

---

## 🔍 Диагностика по симптому (быстрое решение)

| Симптом | Вероятная причина | Быстрая проверка |
|---------|------------------|-----------------|
| Карта белый экран | Нет `leaflet.css` или высота контейнера | `grep -r "leaflet.css" src/` + `style={{ height: '400px' }}` |
| Данные не обновляются после мутации | Не указан `queryKey` в `invalidateQueries` | Проверь `onSuccess: () => queryClient.invalidateQueries({ queryKey: ['orders'] })` |
| Компонент не ре-рендерится при изменении Zustand | Подписка на весь стор вместо селектора | Замени `useStore()` → `useStore((s) => s.field)` |
| WebSocket не переподключается | Не обработан `reconnect_error` | Добавь `socket.on('reconnect_error', ...)` |
| Тесты падают с "act" warning | Асинхронный апдейт без `waitFor` | Оберни в `await waitFor(() => expect(...))` |
| Tailwind классы не применяются | `cn()` не импортирован или не используется | Проверь `import { cn } from '@/lib/utils'` |
| Формы не валидируются | `resolver` не передан в `useForm` | `useForm({ resolver: zodResolver(schema) })` |
| 401 ошибка при запросе | Токен истёк, refresh не сработал | Проверь `api.ts` — должен быть `fetchWithAuth` с обработкой 401 |

---

> 🎯 Цель: агент читает → копирует → адаптирует → работает → обновляет знания. Минимум токенов, максимум пользы.
```

---

## 📋 Что включено в этот файл

| Секция | Зачем |
|--------|-------|
| 🔄 ПРОТОКОЛ | Обязательный порядок работы: READ→THINK→DO→UPDATE |
| 🧭 Decision Tree | Быстрый выбор действия без чтения эссе |
| 🤖 Meta-правила | Как агенту экономить токены и учиться |
| 🗂️ Структура | Быстрый ориентир по папкам проекта |
| ⚡ Quick Reference | Таблица "задача → инструмент → код" для копирования |
| 🚫 Top Pitfalls | Антипаттерны с готовыми решениями |
| 🧪 Testing | Правила и шаблоны тестов |
| 🔌 WebSocket | Справочник событий и шаблон хука |
| 🧬 Эволюция | Как агенту расти с проектом |
| ✅ Pre-commit | Чеклист перед коммитом |
| 🔍 Диагностика | Таблица "симптом → причина → решение" |

---
