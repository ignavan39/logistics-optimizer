# Frontend Agent — Справочник для AI ассистентов

> "Как работать с frontend частью проекта"

---

## 🎯 Главный принцип

**Эволюционируй вместе с проектом.** Нашёл новый паттерн или ошибку → запиши в `.agents/frontend/`:

| Что нашёл | Куда |
|----------|------|
| Решение после проблемы | `01-ADRs.md` |
| Контракт с бэкендом | `02-Contract-Checklist.md` |
| Антипаттерн (не делать) | `03-Pitfalls.md` |
| Правильный паттерн (делать) | `04-Good-Practices.md` |
| Паттерн тестирования | `05-Testing-Patterns.md` |
| Процесс работы | `06-Processes.md` |

---

## Команды

```bash
# Dev
cd apps/web
pnpm dev        # http://localhost:5173

# Build
pnpm build      # => dist/

# Tests
pnpm test       # Vitest
pnpm test:e2e  # Playwright

# Линтинг
pnpm lint
pnpm typecheck
```

---

## Структура

```
apps/web/src/
├── components/    # UI компоненты
├── pages/        # Страницы
├── hooks/        # Custom хуки
├── lib/          # Утилиты (api, utils)
├── stores/       # Zustand stores
├── types/       # TypeScript типы
└── app.tsx      # Entry point
```

---

## Стек

- React 18 + TypeScript
- Vite
- Tailwind CSS
- React Query + Zustand
- react-leaflet

---

## Observability

| Инструмент | URL |
|-----------|-----|
| Frontend DevTools | F12 |
| API | http://localhost:3000 |

---

## Pre-commit

```bash
pnpm lint && pnpm typecheck && pnpm build
```

---

## Карты (важно!)

Смотри `04-Good-Practices.md`:
- Всегда `loading` → `error` → `data`
- WebSocket fallback при потере соединения
- Кластеризация при >100 объектов