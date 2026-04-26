# logistics-optimizer — Frontend

> React + TypeScript веб-приложение для логистики

---

## 🎯 Главный принцип

**Эволюционируй вместе с проектом.** Нашёл новый паттерн или ошибку → запиши в `.agents/frontend/`:

| Что нашёл | Куда |
|----------|------|
| Решение после проблемы | `.agents/frontend/01-ADRs.md` |
| Контракт с бэкендом | `.agents/frontend/02-Contract-Checklist.md` |
| Антипаттерн (не делать) | `.agents/frontend/03-Pitfalls.md` |
| Правильный паттерн (делать) | `.agents/frontend/04-Good-Practices.md` |
| Паттерн тестирования | `.agents/frontend/05-Testing-Patterns.md` |
| Процесс работы | `.agents/frontend/06-Processes.md` |

---

## Команды

```bash
# Dev
cd apps/web
pnpm dev

# Build
pnpm build

# Lint & Typecheck
pnpm lint
pnpm typecheck

# Tests
pnpm test
pnpm test:e2e

# Docker
docker compose up -d
docker compose logs -f web
```

---

## Стек

```typescript
// State management
import { create } from 'zustand'                    // глобальное
import { useQuery, useMutation } from '@tanstack/react-query' // серверное

// API — только через typed client
import { apiClient } from '@logistics/api-client'    // автогенерация из OpenAPI

// Maps
import { useMemo } from 'react'
import { Marker, Popup } from 'react-leaflet'

// Styling
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

---

## ❌ Антипаттерны (НЕ делать)

Полный список: `.agents/frontend/03-Pitfalls.md`

- **useEffect для фетчинга** → React Query (`useQuery`)
- **Мутация Zustand напрямую** → только через `actions`
- **>50 маркеров без кластеризации** → `@react-leaflet/markercluster` или виртуализация
- **any в TypeScript** → всегда типизировать
- **Hardcoded URL** → использовать env variables

---

## ✅ Правильные паттерны

Полный список: `.agents/frontend/04-Good-Practices.md`

- **React Query** — запросы с кешированием, retry, инвалидацией
- **Zustand** — глобальное состояние без boilerplate
- **react-leaflet с мемоизацией** — карты с оптимизацией рендера
- **Virtualized lists** — >100 элементов без лагов

---

## Карты (важно!)

Полный список: `docs/MAPS.md` или `apps/web/src/components/Map/`

- Любая фича с картой: сначала `loading` → `error` → `data`
- Всегда fallback при потере WebSocket соединения
- Оптимизация маркеров: кластеризация при >100 объектов

---

## Pre-commit

```bash
pnpm lint && pnpm typecheck && pnpm build
```

---

## Observability

| Инструмент | URL |
|---|---|
| Frontend DevTools | F12 |
| API | http://localhost:3000 |
| Grafana | http://localhost:3001 |

---

## Документация

- `apps/web/src/` — компоненты, хуки, страницы
- `.agents/frontend/04-Good-Practices.md` — паттерны для копирования
- `.agents/frontend/03-Pitfalls.md` — что НЕ делать