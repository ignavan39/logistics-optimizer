# Processes — Процессы работы

> "Как работать с frontend частью проекта".

---

## Разработка

### Pre-commit

```bash
pnpm lint          # ESLint
pnpm typecheck    # Types
pnpm build        # Сборка
```

### Создание компонента

1. **Типы** — `src/types/component.ts`
2. **Компонент** — `src/components/Component.tsx`
3. **Стили** — Tailwind классы или cn()
4. **Тест** — `src/components/Component.test.tsx`
5. **Story** — `src/components/Component.stories.tsx` (если используешь Storybook)

---

## Code Style

### Импорты

```typescript
// ✅ Правильно
// 1. React
import { useState, useEffect } from 'react';
// 2. External
import { useQuery } from '@tanstack/react-query';
import { useMap } from 'react-leaflet';
// 3. Internal - Absolute
import { cn } from '@/lib/utils';
import { OrderCard } from '@/components/OrderCard';
// 4. Relative
import { useStore } from '../store';
// 5. Styles
import './styles.css';
```

### Именование

```typescript
// Файлы — kebab-case
// order-card.tsx
// orders-list.tsx

// Компоненты — PascalCase
// OrderCard
// OrdersList

// Хуки — camelCase с use/useX
// useOrders
// useMapMarkers

// Константы — UPPER_SNAKE_CASE
// const MAX_MARKERS = 100;
```

---

## Карты (Maps)

### Работа с картой

1. **Loading** → **Error** → **Data**
2. **WebSocket** — всегда имей fallback
3. **Кластеризация** — > 100 маркеров
4. **Optimistic updates** — обновляй сразу

```typescript
// ✅ Правильная структура
if (isLoading) return <MapSkeleton />;
if (error) return <MapError error={error} />;
return <Map data={data} />;
```

---

## Debugging

### React DevTools

```bash
# Chrome/Firefox extensions
React Developer Tools
Redux/Zustand DevTools
```

###Network

```bash
# Смотри запросы
# http://localhost:3000/api/*
```

---

## Build

### Development

```bash
cd apps/web
pnpm dev
# http://localhost:5173
```

### Production

```bash
cd apps/web
pnpm build
# => dist/
```

---

## Infrastructure

### Dev

```bash
docker compose up -d postgres kafka redis
```

### Prod

```bash
docker build -t logistics/web:latest apps/web
docker push
```