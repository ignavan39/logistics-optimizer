# Processes — Процессы работы

> "Как работать с проектом" — процессы и чеклисты.

---

## Разработка

### Pre-commit чеклист

```bash
pnpm lint          # Линтинг
pnpm typecheck     # Типы
pnpm build        # Сборка (если нужно)
```

### Создание фичи

1. **Создай ветку** — `feature/название` или `fix/название`
2. **Напиши код** — следуй Good-Practices
3. **Напиши тесты** — следуй Testing Patterns  
4. **Запусти pre-commit** — `pnpm lint && pnpm typecheck`
5. **Создай PR** — с описанием изменений

### Создание сервиса

1. Добавь в `apps/новый-сервис/`
2. Настрой `project.json` с правилами
3. Запусти `nx g @nx/node:app новый-сервис`
4. Настрой TypeORM/DataSource
5. Добавь в docker-compose

---

## Debugging

### Локальный запуск

```bash
# Все сервисы
pnpm start:dev

# Один сервис
pnpm --filter @logistics/order-service start:dev
```

### Смотри логи

```bash
# Docker
docker compose logs -f order-service

# Kubernetes
kubectl logs -f order-service-xxx
```

### debugging инструменты

| Инструмент | URL |
|-----------|-----|
| Grafana | http://localhost:3001 |
| Jaeger | http://localhost:16686 |
| Kafka UI | http://localhost:8080 |
| Prometheus | http://localhost:9090 |

---


### Dev

```bash
docker compose up -d
```

### Production

```bash
docker build -t logistics/order-service:v1 .
docker push
kubectl apply -f k8s/
```

---

## Чеклисты

### Code Review

- [ ] Нет `any` без необходимости
- [ ] Тесты написаны
- [ ] Pre-commit проходит
- [ ] Документация обновлена (если нужно)
- [ ] Нет secrets в коде