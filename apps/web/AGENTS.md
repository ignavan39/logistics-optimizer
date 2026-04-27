# apps/web — Frontend Agent

> React 18 · TypeScript · Vite · Tailwind · React Query · Zustand · react-leaflet · Socket.io

---

## 🔄 ПРОТОКОЛ: READ → THINK → DO → UPDATE

### 1. READ — перед любой задачей
```
Любая задача     →  .agents/frontend/MEMORY.md         (что уже знаем, открытые баги)
Новая фича       →  .agents/frontend/00-README.md       (архитектура + страницы)
Интеграция с API →  .agents/frontend/02-Contract-Checklist.md
Пишем тесты      →  .agents/frontend/05-Testing-Patterns.md
```

### 2. THINK — перед написанием кода

**Для задачи >50 строк — обязательно:**
1. Какая страница затрагивается? Какие компоненты?
2. Server state (React Query) или Client state (Zustand)?
3. Нужен ли оптимистичный апдейт?
4. Если карта — нужна ли кластеризация? WebSocket или polling?

**UX check:**
- Есть ли loading state?
- Есть ли error state с понятным сообщением?
- Есть ли empty state?

### 3. DO — выполни задачу
- Следуй `.agents/frontend/04-Good-Practices.md`
- Избегай `.agents/frontend/03-Pitfalls.md`
- Компонент без теста — не готов

### 4. UPDATE — **обязательный последний шаг**

| Вопрос | Файл |
|--------|------|
| Решил нестандартную проблему? | `.agents/frontend/01-ADRs.md` |
| Наткнулся на ловушку (>15 мин отладки)? | `.agents/frontend/03-Pitfalls.md` |
| Нашёл паттерн который стоит повторять? | `.agents/frontend/04-Good-Practices.md` |
| Изменился API контракт с бэкендом? | `.agents/frontend/02-Contract-Checklist.md` |
| Узнал что-то важное о проекте? | `.agents/frontend/MEMORY.md` |

---

## ⚡ ПРАВИЛО: РЕФЛЕКСИЯ ПОСЛЕ КАЖДОЙ ФИЧИ

После реализации любой фичи — ответь на вопросы:

| Вопрос | Если "да" → действие |
|--------|----------------------|
| Наткнулся на ловушку (>15 мин отладки)? | Записать в `.agents/frontend/03-Pitfalls.md` |
| Нашёл паттерн для повтора? | Записать в `.agents/frontend/04-Good-Practices.md` |
| Изменился API контракт? | Обновить `.agents/frontend/02-Contract-Checklist.md` |

---

## Структура приложения

```
apps/web/src/
├── pages/              # Страницы (React Router)
│   ├── login/
│   ├── orders/         # Список, создание, детали
│   ├── vehicles/       # Автопарк + карта
│   ├── tracking/       # Трекинг конкретного ТС
│   ├── counterparties/ # Контрагенты + контракты
│   ├── invoices/       # Счета + PDF скачивание
│   ├── settings/       # Настройки компании (admin)
│   └── admin/          # Пользователи, роли, аудит
├── components/
│   ├── ui/             # Базовые: Button, Input, Badge, Modal
│   ├── map/            # MapContainer, VehicleMarker, RoutePolyline
│   ├── orders/         # OrderCard, OrderStatusBadge, OrderForm
│   ├── vehicles/       # VehicleCard, VehicleStatusBadge
│   └── layout/         # Sidebar, Header, PageLayout
├── hooks/              # useOrders, useVehicles, useTracking, useWebSocket
├── stores/             # Zustand: ui.store.ts, map.store.ts, auth.store.ts
├── lib/
│   ├── api/            # apiClient (axios instance), typed endpoints
│   ├── socket.ts       # Socket.io клиент + reconnect
│   └── utils.ts        # cn(), formatDate(), formatPrice()
└── types/              # Общие TypeScript типы
```

---

## Стек и ключевые решения

| Задача | Инструмент | Почему |
|--------|-----------|--------|
| Server state | React Query | кеш, retry, инвалидация |
| Client state | Zustand | без boilerplate, TypeScript |
| Формы | React Hook Form + Zod | валидация, типобезопасность |
| Карты | react-leaflet | OSM, кастомные маркеры |
| Real-time | Socket.io-client | WebSocket + fallback |
| Стили | Tailwind + cn() | утилитарный, без конфликтов |
| HTTP | axios | interceptors, baseURL |
| Тесты | Vitest + Testing Library | скорость, DX |
| E2E | Playwright | надёжный, параллельный |

---

## Команды

```bash
cd apps/web

pnpm dev            # http://localhost:5173
pnpm build          # dist/
pnpm preview        # Превью production build

pnpm test           # Vitest (unit + component)
pnpm test:e2e       # Playwright

pnpm lint           # ESLint
pnpm typecheck      # tsc --noEmit
```

**Pre-commit:**
```bash
pnpm lint && pnpm typecheck && pnpm build
```

---

## Observability

| Инструмент | URL |
|-----------|-----|
| React DevTools | F12 → Components |
| React Query DevTools | F12 → Query |
| API Gateway | http://localhost:3000 |
| Grafana | http://localhost:3001 |