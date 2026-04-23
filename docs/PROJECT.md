# Project Overview

## Vision

Удобное веб-приложение для логистической компании, позволяющее создавать заказы на грузоперевозки, отслеживать транспорт в реальном времени, генерировать документы и управлять контрагентами.

## Business Features

### Order Management (Ядро системы)

| Фича | Описание | Приоритет |
|------|----------|-----------|
| Создание заказа | Форма с origin/destination, cargo details, priority | P0 |
| Статусы заказа | PENDING → ASSIGNED → IN_TRANSIT → DELIVERED → COMPLETED | P0 |
| История статусов | Аудит всех изменений статуса | P1 |
| Отмена заказа | Возможность отмены до начала исполнения | P1 |
| Фильтрация | По статусу, дате, клиенту | P2 |

### Vehicle Management (Автопарк)

| Фича | Описание | Приоритет |
|------|----------|-----------|
| Список транспорта | Таблица с типом, вместимостью, статусом | P0 |
| Отслеживание GPS | real-time позиция на карте | P0 |
| Статусы транспорта | available / in_transit / maintenance | P1 |
| Поиск ближайшего | Найти свободную машину рядом с точкой | P1 |

### Counterparty Management (Контрагенты)

| Фича | Описание | Приоритет |
|------|----------|-----------|
| Справочник контрагентов | carrier / shipper / both | P0 |
| Контракты | Номер, даты, условия оплаты | P1 |
| Тарифы | Цена за км, за кг, мин. сумма по зонам | P1 |
| INN/KPP валидация | Проверка формата | P2 |

### Document Generation (Документы)

| Фича | Описание | Приоритет |
|------|----------|-----------|
| Счета (Invoice) | PDF с seller/buyer, сумма, НДС, срок оплаты | P0 |
| Компания-продавец | Настройки из БД (name, INN, address) | P0 |
| Настройки компании | REST API для редактирования (admin only) | P0 |
| Печатная форма | Профессиональный PDF | P1 |

### Dispatch Automation (Автодиспетчеризация)

| Фича | Описание | Приоритет |
|------|----------|-----------|
| Saga orchestration | Find vehicle → Calculate route → Assign | P1 |
| Retry logic | 5 попыток с exponential backoff | P1 |
| Compensation | Rollback на ошибке | P1 |

### Real-time Tracking (Отслеживание)

| Фича | Описание | Приоритет |
|------|----------|-----------|
| GPS telemetry | 300 vehicles × 2 Hz → ~600 msg/sec | P1 |
| Map visualization | Leaflet с маркерами | P1 |
| "Near destination" alert | Когда vehicle в 5км от точки | P2 |
| History replay | Посмотреть маршрут за день | P2 |

### User Management & Auth

| Фича | Описание | Приоритет |
|------|----------|-----------|
| JWT auth | Login/logout с refresh tokens | P0 |
| Roles | admin / dispatcher / driver / viewer | P1 |
| Permissions | orders.create, vehicles.read, etc. | P1 |
| API Keys | Для внешних систем | P2 |
| Audit logs | Лог всех действий | P2 |

## MVP Scope

### Must Have (P0)
- [x] Order CRUD + status workflow
- [x] Vehicle list + GPS tracking on map
- [x] Company settings + Invoice PDF
- [x] User auth (login, JWT)
- [ ] Basic counterparty list

### Should Have (P1)
- [ ] Dispatch saga (auto-assign)
- [ ] Contract + tariff management
- [ ] Roles + permissions
- [ ] WebSocket notifications

### Nice to Have (P2)
- [ ] Driver mobile app
- [ ] Traffic incidents integration
- [ ] Analytics dashboard

## User Flows

### Flow 1: Create Order
```
1. User → POST /orders {origin, destination, cargo}
2. OrderService → Save order (status=PENDING)
3. OrderService → Kafka: order.created
4. DispatcherService → Consume → Saga: FindVehicle + Assign
5. OrderService → Kafka: order.assigned
6. User → GET /orders/:id → status=ASSIGNED
```

### Flow 2: Download Invoice
```
1. User → GET /invoices/:id/pdf
2. api-gateway → order-service.getInvoice()
3. api-gateway → order-service.getCompanySettings()
4. api-gateway → counterparty-service.getCounterparty()
5. api-gateway → generateInvoice() → PDF
6. Return PDF to user
```

### Flow 3: Track Vehicle
```
1. telemetry-sim → Kafka: vehicle.telemetry (every 500ms)
2. tracking-service → Consume → Batch write to DB
3. User → GET /tracking/:vehicleId
4. api-gateway → tracking-service → Return latest position
5. Frontend → Update marker on map
```

## Frontend Pages

| Page | Route | Features |
|------|-------|----------|
| Login | `/login` | Email/password form |
| Orders | `/orders` | List, filter, create button |
| Order Detail | `/orders/:id` | Status, cargo, map, invoice download |
| Create Order | `/orders/new` | Form with address autocomplete |
| Vehicles | `/vehicles` | Table with map preview |
| Tracking | `/tracking/:id` | Full-screen map with vehicle |
| Counterparties | `/counterparties` | List, create, contracts |
| Settings | `/settings` | Company info form (admin) |
| Admin | `/admin` | Users, roles, audit logs |

## Tech Stack (Frontend)

| Component | Technology |
|-----------|------------|
| Framework | React + Vite |
| Routing | React Router |
| State | React Query + Zustand |
| Styling | Tailwind CSS |
| Maps | Leaflet + react-leaflet |
| Forms | React Hook Form + Zod |
| HTTP | Axios |
| Notifications | Socket.io client |