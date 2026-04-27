# REST API Reference

API Gateway runs on port 3000. All endpoints except `/auth/*` require authentication.

## Authentication

### JWT Authentication
```
Authorization: Bearer <jwt_token>
```

### API Key Authentication
```
X-API-Key: <api_key>
```

### Permissions Syntax
Permissions use dot notation: `resource.action`
Wildcards supported: `orders.*`, `*.read`

---

## Auth Endpoints

### POST /auth/login
Login with email and password.

**Auth:** None
**Request:**
```json
{
  "email": "admin@logistics.local",
  "password": "secret"
}
```
**Response:**
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "uuid",
  "user": { "id": "uuid", "email": "...", "firstName": "...", "lastName": "..." }
}
```

### POST /auth/register
Register new user.

**Auth:** None
**Request:**
```json
{
  "email": "user@example.com",
  "password": "StrongPass123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

### POST /auth/refresh
Refresh access token.

**Auth:** None
**Request:**
```json
{
  "refreshToken": "uuid"
}
```

### POST /auth/logout
Logout and revoke session.

**Auth:** JWT

### GET /auth/me
Get current user profile.

**Auth:** JWT

---

## Orders Endpoints

### GET /orders
List orders with pagination and filters.

**Auth:** JWT (`orders.read`)
**Query:**
| Param | Type | Description |
|-------|------|-------------|
| page | int | Page number (default: 1) |
| limit | int | Items per page (default: 20) |
| status | string | Filter by status |
| customerId | uuid | Filter by customer |

### POST /orders
Create new order.

**Auth:** JWT (`orders.create`)
**Request:**
```json
{
  "origin": "Moscow, Tverskaya 1",
  "destination": "Saint Petersburg, Nevsky 10",
  "originLat": 55.7558,
  "originLng": 37.6173,
  "destinationLat": 59.9311,
  "destinationLng": 30.3609,
  "priority": "normal",
  "cargo": {
    "name": "Electronics",
    "quantity": 10,
    "weightKg": 500,
    "volumeM3": 2.5,
    "valueRub": 100000
  }
}
```

### GET /orders/:id
Get order details.

**Auth:** JWT (`orders.read`)

### PATCH /orders/:id/status
Update order status.

**Auth:** JWT (`orders.update`)
**Request:**
```json
{
  "status": "ASSIGNED",
  "reason": "Vehicle assigned"
}
```

### POST /orders/:id/cancel
Cancel order.

**Auth:** JWT (`orders.cancel`)

### GET /orders/:id/history
Get order status history.

**Auth:** JWT (`orders.read`)

---

## Vehicles Endpoints

### GET /vehicles
List vehicles.

**Auth:** JWT (`vehicles.read`)
**Query:**
| Param | Type | Description |
|-------|------|-------------|
| status | string | Filter by status |
| type | string | Filter by type |
| page | int | Page number |
| limit | int | Items per page |

### GET /vehicles/:id
Get vehicle details.

**Auth:** JWT (`vehicles.read`)

### PATCH /vehicles/:id/status
Update vehicle status.

**Auth:** JWT (`vehicles.update`)

---

## Tracking Endpoints

### GET /tracking/:vehicleId
Get latest vehicle position.

**Auth:** JWT (`tracking.read`)

### GET /tracking/:vehicleId/history
Get position history.

**Auth:** JWT (`tracking.read`)
**Query:**
| Param | Type | Description |
|-------|------|-------------|
| from | datetime | Start time |
| to | datetime | End time |
| limit | int | Max points |

### GET /tracking/:vehicleId/track
Get vehicle route track.

**Auth:** JWT (`tracking.read`)

---

## Counterparties Endpoints

### GET /counterparties
List counterparties.

**Auth:** JWT (`counterparties.read`)
**Query:**
| Param | Type | Description |
|-------|------|-------------|
| type | string | carrier/shipper/both |
| status | string | active/inactive |
| search | string | Search by name/INN |

### POST /counterparties
Create counterparty.

**Auth:** JWT (`counterparties.create`) — Admin
**Request:**
```json
{
  "name": "Transport LLC",
  "type": "carrier",
  "inn": "7712345678",
  "kpp": "771201001",
  "phone": "+7 495 123-45-67",
  "email": "info@transport.ru"
}
```

### GET /counterparties/:id
Get counterparty details.

**Auth:** JWT (`counterparties.read`)

### PATCH /counterparties/:id
Update counterparty.

**Auth:** JWT (`counterparties.update`) — Admin

### GET /counterparties/:id/contracts
List contracts for counterparty.

**Auth:** JWT (`contracts.read`)

### POST /counterparties/:id/contracts
Create contract.

**Auth:** JWT (`contracts.create`) — Admin

### GET /contracts/:id/tariffs
Get contract tariffs.

**Auth:** JWT (`tariffs.read`)

### POST /contracts/:id/tariffs
Create tariff.

**Auth:** JWT (`tariffs.create`) — Admin

---

## Invoices Endpoints

### GET /invoices
List invoices.

**Auth:** JWT (`invoices.read`)
**Query:**
| Param | Type | Description |
|-------|------|-------------|
| status | string | draft/issued/paid/cancelled |
| counterpartyId | uuid | Filter by buyer |
| page | int | Page number |
| limit | int | Items per page |

### GET /invoices/:id
Get invoice details.

**Auth:** JWT (`invoices.read`)

### GET /invoices/:id/pdf
Get invoice PDF URL (lazy generation).

**Auth:** JWT (`invoices.read`)
**Response:**
```json
{
  "url": "http://minio:9000/invoices/2026/04/invoice-id.pdf"
}
```
**Notes:**
- PDF is generated on first request (lazy)
- Concurrent requests: only one generates, others poll
- Uses PostgreSQL advisory lock to prevent duplicate generation
- Generated PDF is cached and stored in MinIO/S3
- API gateway delegates to invoice-service via gRPC

### PATCH /invoices/:id/status
Update invoice status.

**Auth:** JWT (`invoices.update`)
**Request:**
```json
{
  "status": "paid"
}
```

---

## Settings Endpoints

### GET /settings/company
Get company settings.

**Auth:** JWT

### PUT /settings/company
Update company settings.

**Auth:** JWT (`settings.manage`) — Admin
**Request:**
```json
{
  "companyName": "New Company Name",
  "companyInn": "1234567890",
  "defaultPaymentTermsDays": 45,
  "defaultVatRate": 18
}
```

---

## Admin Endpoints

### GET /admin/users
List all users.

**Auth:** JWT (`users.manage`) — Admin

### GET /admin/users/:id
Get user details.

**Auth:** JWT (`users.manage`) — Admin

### PATCH /admin/users/:id
Update user.

**Auth:** JWT (`users.manage`) — Admin

### DELETE /admin/users/:id
Deactivate user.

**Auth:** JWT (`users.manage`) — Admin

### POST /admin/users/:id/roles
Assign roles to user.

**Auth:** JWT (`users.manage`) — Admin

### GET /admin/audit-logs
List audit logs.

**Auth:** JWT (`users.manage`) — Admin
**Query:**
| Param | Type | Description |
|-------|------|-------------|
| userId | uuid | Filter by user |
| action | string | Filter by action |
| resource | string | Filter by resource |
| from | datetime | Start time |
| to | datetime | End time |
| limit | int | Max results |
| offset | int | Offset |

---

## Error Responses

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": ["validation error"],
  "error": "Bad Request"
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "Resource not found"
}
```

### 409 Conflict
```json
{
  "statusCode": 409,
  "message": "Version conflict"
}
```

---

## Rate Limiting

Default: 10,000 requests per minute per IP/user.

API Keys: Custom limit per key (default: 1000 req/hour).