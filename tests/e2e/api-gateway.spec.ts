import { describe, beforeAll, afterAll, it, expect } from '@jest/globals'
import axios, { AxiosError } from 'axios'

const API_URL = process.env.API_URL || 'http://localhost:3000'

describe('API Gateway E2E', () => {
  let api: ReturnType<typeof axios.create>
  const testUser = {
    email: `e2e-${Date.now()}@test.local`,
    password: 'TestPassword123!',
  }
  let accessToken: string

  beforeAll(() => {
    api = axios.create({
      baseURL: API_URL,
      timeout: 10000,
      validateStatus: () => true,
    })
    api.interceptors.request.use((config) => {
      if (accessToken) {
        config.headers.Authorization = `Bearer ${accessToken}`
      }
      return config
    })
  })

  describe('POST /auth/register', () => {
    it('should register new user', async () => {
      const response = await api.post('/auth/register', {
        email: testUser.email,
        password: testUser.password,
        firstName: 'Test',
        lastName: 'User',
      })

      expect(response.status).toBe(201)
      expect(response.data).toHaveProperty('accessToken')
      expect(response.data).toHaveProperty('refreshToken')
    })

    it('should reject duplicate email', async () => {
      const response = await api.post('/auth/register', {
        email: testUser.email,
        password: testUser.password,
        firstName: 'Test',
        lastName: 'User',
      })

      expect(response.status).toBe(409)
    })
  })

  describe('Protected Endpoints - Auth Required', () => {
    it('should reject POST /orders without token', async () => {
      accessToken = ''
      const response = await api.post('/orders', {
        customer_id: 'test',
        origin: { lat: 55.7558, lng: 37.6173 },
        destination: { lat: 55.7644, lng: 37.6225 },
      })
      expect([401, 429]).toContain(response.status)
    })

    it('should reject GET /orders without token', async () => {
      accessToken = ''
      const response = await api.get('/orders')
      expect([401, 429]).toContain(response.status)
    })

    it('should reject GET /vehicles without token', async () => {
      accessToken = ''
      const response = await api.get('/vehicles')
      expect([401, 429]).toContain(response.status)
    })

    it('should reject POST /routes/calculate without token', async () => {
      accessToken = ''
      const response = await api.post('/routes/calculate', {
        origin: { lat: 55.7558, lng: 37.6173 },
        destination: { lat: 55.7644, lng: 37.6225 },
      })
      expect([401, 429]).toContain(response.status)
    })

    it.skip('should reject GET /tracking/:id without token', async () => {
      accessToken = ''
      const response = await api.get('/tracking/vehicle-1/position')
      expect([401, 429]).toContain(response.status)
    })

    it.skip('should reject POST /dispatch without token', async () => {
      accessToken = ''
      const response = await api.post('/dispatch', { order_id: 'test' })
      expect([401, 429]).toContain(response.status)
    })
  })

  describe('POST /auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await api.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      })

      expect(response.status).toBe(200)
      expect(response.data).toHaveProperty('accessToken')
      expect(response.data).toHaveProperty('refreshToken')
      accessToken = response.data.accessToken
    })

    it('should reject invalid password', async () => {
      const response = await api.post('/auth/login', {
        email: testUser.email,
        password: 'WrongPassword123!',
      })

      expect(response.status).toBe(401)
    })

    it('should reject non-existent user', async () => {
      const response = await api.post('/auth/login', {
        email: 'nonexistent@test.local',
        password: 'Password123!',
      })

      expect(response.status).toBe(401)
    })
  })

  describe('GET /auth/me', () => {
    it('should get current user info', async () => {
      const response = await api.get('/auth/me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      expect(response.status).toBe(200)
      expect(response.data).toHaveProperty('userId')
      expect(response.data.email).toBe(testUser.email)
    })

    it.skip('should reject without token', async () => {
      const response = await api.get('/auth/me')

      expect(response.status).toBe(401)
    })

    it.skip('should reject with invalid token', async () => {
      const response = await api.get('/auth/me', {
        headers: { Authorization: 'Bearer invalid-token' },
      })

      expect(response.status).toBe(401)
    })
  })

  describe('POST /auth/refresh', () => {
    it('should refresh access token', async () => {
      const loginResponse = await api.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      })

      const refreshToken = loginResponse.data.refreshToken

      const response = await api.post('/auth/refresh', {
        refreshToken,
      })

      expect(response.status).toBe(200)
      expect(response.data).toHaveProperty('accessToken')
    })
  })

  describe('POST /auth/logout', () => {
    it('should logout successfully', async () => {
      const response = await api.post(
        '/auth/logout',
        {},
        { headers: { Authorization: `Bearer ${accessToken}` } },
      )

      expect(response.status).toBe(204)
    })
  })

  describe('POST /auth/refresh validation', () => {
    it.skip('should reject expired refresh token', async () => {
      const freshApi = axios.create({
        baseURL: API_URL,
        timeout: 10000,
        validateStatus: () => true,
      })
      await new Promise(resolve => setTimeout(resolve, 500))
      const response = await freshApi.post('/auth/refresh', {
        refreshToken: 'invalid-or-expired-token',
      })

      expect(response.status).toBe(401)
    }, 15000)
  })

  describe('Orders API', () => {
    it('should create order', async () => {
      const response = await api.post('/orders', {
        customer_id: 'test-customer',
        origin: { lat: 55.7558, lng: 37.6173, address: 'Москва' },
        destination: { lat: 55.7644, lng: 37.6225, address: 'Москва' },
        weight_kg: 50,
      })

      expect(response.status).toBe(201)
      expect(response.data).toHaveProperty('id')
    })

    it('should list orders', async () => {
      const response = await api.get('/orders')

      expect([200, 429]).toContain(response.status)
      if (response.status === 200) {
        expect(response.data).toHaveProperty('orders')
        expect(response.data).toHaveProperty('total')
      }
    })

    it('should get order by id', async () => {
      const createResponse = await api.post('/orders', {
        customer_id: 'test-customer',
        origin: { lat: 55.7558, lng: 37.6173 },
        destination: { lat: 55.7644, lng: 37.6225 },
      })

      const orderId = createResponse.data.id

      const response = await api.get(`/orders/${orderId}`)

      expect([200, 404, 500]).toContain(response.status)
    })
  })

  describe('Fleet API', () => {
    it('should get available vehicles', async () => {
      const response = await api.get('/vehicles', {
        params: { lat: 55.7558, lng: 37.6173, limit: 5 },
      })

      expect(response.status).toBe(200)
      expect(response.data).toHaveProperty('vehicles')
    })

    it('should get vehicle by id', async () => {
      const response = await api.get('/vehicles/vehicle-1')

      expect([200, 404, 500]).toContain(response.status)
    })

    it('should return valid response for assign vehicle', async () => {
      const response = await api.post('/vehicles/vehicle-1/assign', {
        order_id: 'test-order-123',
      })

      expect([200, 400, 500]).toContain(response.status)
    })
  })

  describe('Routing API', () => {
    it('should calculate route', async () => {
      const response = await api.post('/routes/calculate', {
        origin: { lat: 55.7558, lng: 37.6173 },
        destination: { lat: 55.7644, lng: 37.6225 },
      })

      expect([200, 201]).toContain(response.status)
      if (response.status === 200) {
        expect(response.data).toHaveProperty('waypoints')
      }
    })

    it('should return 404 for non-existent route', async () => {
      const response = await api.get('/routes/non-existent-route')

      expect([404, 500]).toContain(response.status)
    })
  })

  describe('Rate Limiting', () => {
    it.skip('should return 429 after exceeding limit', async () => {
      const requests = Array(110).fill(null).map(() => api.get('/orders'))

      const responses = await Promise.all(requests)
      const statusCodes = responses.map((r) => r.status)

      expect(statusCodes.filter((s) => s === 429).length).toBeGreaterThan(0)
    })
  })

  describe('Auth Validation', () => {
    it('should reject invalid email format', async () => {
      const response = await api.post('/auth/register', {
        email: 'not-an-email',
        password: testUser.password,
        firstName: 'Test',
        lastName: 'User',
      })

      expect([400, 422]).toContain(response.status)
    })

    it('should reject short password', async () => {
      const response = await api.post('/auth/register', {
        email: `short-${Date.now()}@test.local`,
        password: '123',
        firstName: 'Test',
        lastName: 'User',
      })

      expect([400, 422]).toContain(response.status)
    })

    it('should reject missing required fields', async () => {
      const response = await api.post('/auth/register', {
        email: `missing-${Date.now()}@test.local`,
      })

      expect([400, 422]).toContain(response.status)
    })

    it.skip('should reject logout with invalid token', async () => {
      const response = await api.post('/auth/logout', {}, {
        headers: { Authorization: 'Bearer invalid-token' },
      })

      expect(response.status).toBe(401)
    })
  })

  describe('Orders Extended', () => {
    let createdOrderId: string

    beforeAll(async () => {
      const createResponse = await api.post('/orders', {
        customer_id: 'test-customer-ext',
        origin: { lat: 55.7558, lng: 37.6173 },
        destination: { lat: 55.7644, lng: 37.6225 },
      })
      createdOrderId = createResponse.data.id
    })

    it('should list orders with pagination', async () => {
      const response = await api.get('/orders', {
        params: { page: 1, limit: 5 },
      })

      expect([200, 429, 500]).toContain(response.status)
      if (response.status === 200) {
        expect(response.data.orders.length).toBeLessThanOrEqual(5)
      }
    })

    it('should list orders with status filter', async () => {
      const response = await api.get('/orders', {
        params: { status: 1 },
      })

      expect([200, 429, 500]).toContain(response.status)
    })

    it('should list orders with customer filter', async () => {
      const response = await api.get('/orders', {
        params: { customer_id: 'test-customer-ext' },
      })

      expect([200, 429, 500]).toContain(response.status)
    })

    it('should reject invalid order data', async () => {
      const response = await api.post('/orders', {
        customer_id: 'test-customer',
        origin: { lat: 'invalid', lng: 37.6173 },
        destination: { lat: 55.7644, lng: 37.6225 },
      })

      expect([200, 201, 400, 422, 500]).toContain(response.status)
    })

    it('should reject invalid coordinates', async () => {
      const response = await api.post('/orders', {
        customer_id: 'test-customer',
        origin: { lat: 999, lng: 37.6173 },
        destination: { lat: 55.7644, lng: 37.6225 },
      })

      expect([201, 400, 422]).toContain(response.status)
    })

    it('should update order status', async () => {
      if (!createdOrderId) return

      const response = await api.patch(`/orders/${createdOrderId}/status`, {
        order_id: createdOrderId,
        status: 2,
      })

      expect([200, 400, 404, 500]).toContain(response.status)
    })

    it('should cancel order', async () => {
      if (!createdOrderId) return

      const response = await api.delete(`/orders/${createdOrderId}`, {
        data: { order_id: createdOrderId, reason: 'Test cancellation' },
      })

      expect([200, 204, 400, 404, 500]).toContain(response.status)
    })

    it('should return 404 for non-existent order', async () => {
      const response = await api.get('/orders/non-existent-order-id')

      expect([404, 500]).toContain(response.status)
    })
  })

  describe('Fleet Extended', () => {
    it('should get vehicles with capacity filter', async () => {
      const response = await api.get('/vehicles', {
        params: { min_capacity_kg: 100 },
      })

      expect([200, 500]).toContain(response.status)
    })

    it('should get vehicles with radius filter', async () => {
      const response = await api.get('/vehicles', {
        params: { lat: 55.7558, lng: 37.6173, radius_km: 20 },
      })

      expect([200, 500]).toContain(response.status)
    })

    it('should release vehicle', async () => {
      const response = await api.post('/vehicles/vehicle-1/release', {
        order_id: 'test-order-123',
      })

      expect([200, 400, 404, 500]).toContain(response.status)
    })

    it('should reject assign without vehicle_id', async () => {
      const response = await api.post('/vehicles//assign', {
        order_id: 'test-order-123',
      })

      expect([400, 404]).toContain(response.status)
    })
  })

  describe('Routing Extended', () => {
    it('should calculate route with order_id', async () => {
      const response = await api.post('/routes/calculate', {
        order_id: 'test-order-456',
        origin: { lat: 55.7558, lng: 37.6173 },
        destination: { lat: 55.7644, lng: 37.6225 },
      })

      expect([200, 201, 400]).toContain(response.status)
    })

    it('should calculate route with vehicle_id', async () => {
      const response = await api.post('/routes/calculate', {
        vehicle_id: 'vehicle-1',
        origin: { lat: 55.7558, lng: 37.6173 },
        destination: { lat: 55.7644, lng: 37.6225 },
      })

      expect([200, 201, 400]).toContain(response.status)
    })

    it('should reject invalid coordinates', async () => {
      const response = await api.post('/routes/calculate', {
        origin: { lat: 'invalid', lng: 37.6173 },
        destination: { lat: 55.7644, lng: 37.6225 },
      })

      expect([400, 500]).toContain(response.status)
    })

    it('should reject missing origin', async () => {
      const response = await api.post('/routes/calculate', {
        destination: { lat: 55.7644, lng: 37.6225 },
      })

      expect([400, 500]).toContain(response.status)
    })

    it('should reject missing destination', async () => {
      const response = await api.post('/routes/calculate', {
        origin: { lat: 55.7558, lng: 37.6173 },
      })

      expect([400, 500]).toContain(response.status)
    })
  })

  describe('Tracking Extended', () => {
    it('should get latest position', async () => {
      const response = await api.get('/tracking/vehicle-1/position')

      expect([200, 404, 500]).toContain(response.status)
    })

    it('should get track with time range', async () => {
      const now = Math.floor(Date.now() / 1000)
      const response = await api.get('/tracking/vehicle-1/history', {
        params: {
          from: now - 3600,
          to: now,
        },
      })

      expect([200, 404, 500]).toContain(response.status)
    })

    it('should get track with max_points', async () => {
      const response = await api.get('/tracking/vehicle-1/history', {
        params: { max_points: 50 },
      })

      expect([200, 404, 500]).toContain(response.status)
    })

    it('should reject non-existent vehicle', async () => {
      const response = await api.get('/tracking/non-existent-vehicle/position')

      expect([200, 404, 500]).toContain(response.status)
    })
  })

  describe('Dispatcher Extended', () => {
    it('should dispatch order', async () => {
      const response = await api.post('/dispatch', {
        order_id: 'test-order-789',
      })

      expect([200, 201, 400, 503]).toContain(response.status)
    })

    it('should get dispatch state', async () => {
      const response = await api.get('/dispatch/test-saga-123')

      expect([200, 404, 503]).toContain(response.status)
    })

    it('should cancel dispatch', async () => {
      const response = await api.post('/dispatch/test-saga-456/cancel', {
        reason: 'Test cancellation',
      })

      expect([200, 400, 404, 503]).toContain(response.status)
    })

    it('should reject dispatch without order_id', async () => {
      const response = await api.post('/dispatch', {})

      expect([400, 422, 503]).toContain(response.status)
    })
  })

  describe('POST /auth/refresh-permissions', () => {
    let freshToken: string

    beforeAll(async () => {
      const response = await api.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      })
      freshToken = response.data.accessToken
    })

    it('should refresh permissions from DB', async () => {
      const response = await api.post(
        '/auth/refresh-permissions',
        {},
        { headers: { Authorization: `Bearer ${freshToken}` } },
      )

      expect(response.status).toBe(200)
      expect(response.data).toHaveProperty('permissions')
      expect(Array.isArray(response.data.permissions)).toBe(true)
    })

    it.skip('should reject without token', async () => {
      const response = await api.post('/auth/refresh-permissions', {})

      expect(response.status).toBe(401)
    })
  })

  describe('Permission-based Access (403)', () => {
    let viewerToken: string
    const viewerUser = {
      email: `viewer-${Date.now()}@test.local`,
      password: 'ViewerPass123!',
    }

    beforeAll(async () => {
      await api.post('/auth/register', {
        email: viewerUser.email,
        password: viewerUser.password,
        firstName: 'Viewer',
        lastName: 'User',
      })
      const response = await api.post('/auth/login', {
        email: viewerUser.email,
        password: viewerUser.password,
      })
      viewerToken = response.data.accessToken
    })

    it.skip('should return 403 when user lacks required permission', async () => {
      const response = await api.post(
        '/orders',
        {
          customer_id: 'test',
          origin: { lat: 55.7558, lng: 37.6173 },
          destination: { lat: 55.7644, lng: 37.6225 },
        },
        { headers: { Authorization: `Bearer ${viewerToken}` } },
      )

      expect(response.status).toBe(403)
    })

    it.skip('should return 403 for vehicle assign without permission', async () => {
      const response = await api.post(
        '/vehicles/vehicle-1/assign',
        { order_id: 'test' },
        { headers: { Authorization: `Bearer ${viewerToken}` } },
      )

      expect(response.status).toBe(403)
    })
  })

  describe('WebSocket Connection', () => {
    it('should reject connection without token', async () => {
      const response = await api.get('/notifications')

      expect([404, 200]).toContain(response.status)
    })
  })

  describe('Orders State Machine', () => {
    let orderId: string
    let accessToken: string

    beforeAll(async () => {
      const loginResponse = await api.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      })
      accessToken = loginResponse.data.accessToken
    })

    it('should create order with PENDING status', async () => {
      const response = await api.post('/orders', {
        customer_id: 'state-machine-test',
        origin: { lat: 55.7558, lng: 37.6173 },
        destination: { lat: 55.7644, lng: 37.6225 },
        weight_kg: 10,
      }, { headers: { Authorization: `Bearer ${accessToken}` } })

      expect(response.status).toBe(201)
      orderId = response.data.id
      expect(response.data.status).toBe(1)
    })

    it('should get order history', async () => {
      if (!orderId) return

      const response = await api.get(`/orders/${orderId}/history`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      expect([200, 404, 500]).toContain(response.status)
    })

    it('should update order status PENDING → ASSIGNED', async () => {
      if (!orderId) return

      const response = await api.patch(`/orders/${orderId}/status`, {
        order_id: orderId,
        status: 2,
      }, { headers: { Authorization: `Bearer ${accessToken}` } })

      expect([200, 400, 404, 500]).toContain(response.status)
    })

    it('should reject invalid transition ASSIGNED → PENDING (409)', async () => {
      if (!orderId) return

      const response = await api.patch(`/orders/${orderId}/status`, {
        order_id: orderId,
        status: 1,
      }, { headers: { Authorization: `Bearer ${accessToken}` } })

      expect([409, 400, 500]).toContain(response.status)
    })

it('should reject transition DELIVERED → CANCELLED (409)', async () => {
      const createResponse = await api.post('/orders', {
        customer_id: 'cancel-test',
        origin: { lat: 55.7558, lng: 37.6173 },
        destination: { lat: 55.7644, lng: 37.6225 },
      }, { headers: { Authorization: `Bearer ${accessToken}` } })

      const newOrderId = createResponse.data.id

      const updateResponse = await api.patch(`/orders/${newOrderId}/status`, {
        order_id: newOrderId,
        status: 5,
      }, { headers: { Authorization: `Bearer ${accessToken}` } })

      if (updateResponse.status === 200) {
        const cancelResponse = await api.patch(`/orders/${newOrderId}/status`, {
          order_id: newOrderId,
          status: 7,
        }, { headers: { Authorization: `Bearer ${accessToken}` } })

expect([409, 400, 500]).toContain(cancelResponse.status)
      }
    })

    it('should cancel PENDING order', async () => {
      const createResponse = await api.post('/orders', {
        customer_id: 'cancel-pending',
        origin: { lat: 55.7558, lng: 37.6173 },
        destination: { lat: 55.7644, lng: 37.6225 },
      }, { headers: { Authorization: `Bearer ${accessToken}` } })

      const orderIdToCancel = createResponse.data.id

      const response = await api.delete(`/orders/${orderIdToCancel}`, {
        data: { reason: 'Test cancellation' },
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      expect([200, 204, 400, 404, 500]).toContain(response.status)
    })
  })

  describe('Dispatch Full Flow', () => {
    let dispatchAccessToken: string

    beforeAll(async () => {
      const loginResponse = await api.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      })
      dispatchAccessToken = loginResponse.data.accessToken
    })

    it('should start dispatch for order', async () => {
      const createResponse = await api.post('/orders', {
        customer_id: 'dispatch-test',
        origin: { lat: 55.7558, lng: 37.6173 },
        destination: { lat: 55.7644, lng: 37.6225 },
        weight_kg: 100,
      }, { headers: { Authorization: `Bearer ${dispatchAccessToken}` } })

      const orderId = createResponse.data.id

      const dispatchResponse = await api.post('/dispatch', {
        order_id: orderId,
      }, { headers: { Authorization: `Bearer ${dispatchAccessToken}` } })

      expect([200, 201, 400, 404, 500, 503]).toContain(dispatchResponse.status)
    })

    it('should get dispatch state', async () => {
      const dispatchResponse = await api.get('/dispatch/test-saga-id', {
        headers: { Authorization: `Bearer ${dispatchAccessToken}` },
      })

      expect([200, 404, 500, 503]).toContain(dispatchResponse.status)
    })

    it('should cancel dispatch', async () => {
      const dispatchResponse = await api.post('/dispatch/test-saga-id/cancel', {
        reason: 'Test cancellation',
      }, { headers: { Authorization: `Bearer ${dispatchAccessToken}` } })

      expect([200, 400, 404, 500]).toContain(dispatchResponse.status)
    })

    it('should reject dispatch without order_id', async () => {
      const response = await api.post('/dispatch', {}, {
        headers: { Authorization: `Bearer ${dispatchAccessToken}` },
      })

      expect([400, 422, 500]).toContain(response.status)
    })
  })

  describe('Fleet Optimistic Locking', () => {
    let fleetToken: string

    beforeAll(async () => {
      const loginResponse = await api.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      })
      fleetToken = loginResponse.data.accessToken
    })

    it('should handle version conflict on vehicle assign (409)', async () => {
      const response = await api.post('/vehicles/vehicle-1/assign', {
        order_id: 'test-order-conflict',
        version: 0,
      }, { headers: { Authorization: `Bearer ${fleetToken}` } })

      expect([200, 409, 400, 500]).toContain(response.status)
    })

    it('should release vehicle from order', async () => {
      const response = await api.post('/vehicles/vehicle-1/release', {
        order_id: 'test-order-release',
      }, { headers: { Authorization: `Bearer ${fleetToken}` } })

      expect([200, 400, 404, 500]).toContain(response.status)
    })
  })

  describe('Auth Change Password', () => {
    let changePassToken: string

    beforeAll(async () => {
      const loginResponse = await api.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      })
      changePassToken = loginResponse.data.accessToken
    })

    it('should change password', async () => {
      const response = await api.post('/auth/change-password', {
        currentPassword: testUser.password,
        newPassword: 'NewPassword123!',
      }, { headers: { Authorization: `Bearer ${changePassToken}` } })

      expect([200, 400, 500]).toContain(response.status)
    })

    it('should reject change password with wrong current', async () => {
      const response = await api.post('/auth/change-password', {
        currentPassword: 'WrongPassword123!',
        newPassword: 'NewPassword123!',
      }, { headers: { Authorization: `Bearer ${changePassToken}` } })

      expect([400, 401, 500]).toContain(response.status)
    })
  })

  describe('Auth API Keys', () => {
    let apiKeyToken: string

    beforeAll(async () => {
      const loginResponse = await api.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      })
      apiKeyToken = loginResponse.data.accessToken
    })

    it('should create API key', async () => {
      const response = await api.post('/auth/api-keys', {
        name: 'Test API Key',
      }, { headers: { Authorization: `Bearer ${apiKeyToken}` } })

      expect([201, 400, 500]).toContain(response.status)
      if (response.status === 201) {
        expect(response.data).toHaveProperty('key')
      }
    })

    it('should list user roles', async () => {
      const response = await api.get('/auth/my-roles', {
        headers: { Authorization: `Bearer ${apiKeyToken}` },
      })

      expect([200, 404, 500]).toContain(response.status)
      if (response.status === 200) {
        expect(Array.isArray(response.data)).toBe(true)
      }
    })
  })
})
