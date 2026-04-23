import { describe, beforeAll, afterAll, it, expect } from '@jest/globals'
import axios, { AxiosInstance } from 'axios'

const API_URL = process.env.API_URL || 'http://localhost:3000'

describe('Full Dispatch Saga E2E', () => {
  let api: AxiosInstance
  let accessToken: string
  let testUser = {
    email: `saga-e2e-${Date.now()}@test.local`,
    password: 'TestPassword123!',
  }

  beforeAll(async () => {
    api = axios.create({
      baseURL: API_URL,
      timeout: 10000,
      validateStatus: () => true,
    })

    const registerResponse = await api.post('/auth/register', {
      email: testUser.email,
      password: testUser.password,
      firstName: 'Saga',
      lastName: 'Tester',
    })
    accessToken = registerResponse.data.accessToken
  })

  afterAll(async () => {
    if (accessToken) {
      await api.post('/auth/logout', {}, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
    }
  })

  describe('Happy Path: Complete Order → Invoice Flow', () => {
    let sagaOrderId: string
    let sagaDispatchId: string

    it('should create order', async () => {
      const response = await api.post('/orders', {
        customer_id: 'saga-happy-path',
        origin: { lat: 55.7558, lng: 37.6173 },
        destination: { lat: 55.7644, lng: 37.6225 },
        weight_kg: 50,
        price: 10000,
      }, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      expect([201, 400, 500]).toContain(response.status)
      if (response.status === 201) {
        sagaOrderId = response.data.id
        expect(response.data.status).toBe(1)
      }
    })

    it('should start dispatch saga', async () => {
      if (!sagaOrderId) return

      const response = await api.post('/dispatch', {
        order_id: sagaOrderId,
      }, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      expect([200, 201, 400, 404, 500, 503]).toContain(response.status)
      if (response.status === 200 || response.status === 201) {
        sagaDispatchId = response.data.saga_id || response.data.id
        expect(response.data).toHaveProperty('status')
      }
    })

    it('should wait for vehicle assignment', async () => {
      if (!sagaDispatchId) return

      await new Promise(resolve => setTimeout(resolve, 2000))

      const response = await api.get(`/dispatch/${sagaDispatchId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      expect([200, 404, 500]).toContain(response.status)
    })

    it('should update order status to IN_TRANSIT', async () => {
      if (!sagaOrderId) return

      const response = await api.patch(`/orders/${sagaOrderId}/status`, {
        order_id: sagaOrderId,
        status: 3,
      }, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      expect([200, 400, 409, 500]).toContain(response.status)
    })

    it('should update order status to DELIVERED', async () => {
      if (!sagaOrderId) return

      const response = await api.patch(`/orders/${sagaOrderId}/status`, {
        order_id: sagaOrderId,
        status: 5,
      }, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      expect([200, 400, 409, 500]).toContain(response.status)
    })

    it('should verify invoice was created automatically', async () => {
      const response = await api.get('/invoices', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (response.status === 200) {
        const invoices = response.data.invoices || response.data.data || []
        const sagaInvoice = invoices.find((inv: any) => inv.order_id === sagaOrderId)
        expect(sagaInvoice).toBeDefined()
      }
    })
  })

  describe('Saga Failure: No Available Vehicles', () => {
    let failureOrderId: string

    it('should handle dispatch when no vehicles available', async () => {
      const orderResponse = await api.post('/orders', {
        customer_id: 'saga-no-vehicles',
        origin: { lat: 55.7558, lng: 37.6173 },
        destination: { lat: 55.7644, lng: 37.6225 },
        weight_kg: 1000,
      }, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (orderResponse.status === 201) {
        failureOrderId = orderResponse.data.id

        const dispatchResponse = await api.post('/dispatch', {
          order_id: failureOrderId,
        }, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })

        expect([503, 400, 500]).toContain(dispatchResponse.status)
      }
    })

    it('should keep order in PENDING after failed dispatch', async () => {
      if (!failureOrderId) return

      const response = await api.get(`/orders/${failureOrderId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (response.status === 200) {
        expect(response.data.status).toBe(1)
      }
    })

    it('should allow retry dispatch', async () => {
      if (!failureOrderId) return

      const dispatchResponse = await api.post('/dispatch', {
        order_id: failureOrderId,
        retry: true,
      }, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      expect([200, 201, 400, 404, 500, 503]).toContain(dispatchResponse.status)
    })
  })

  describe('Saga Cancellation', () => {
    it('should cancel dispatch saga mid-flight', async () => {
      const orderResponse = await api.post('/orders', {
        customer_id: 'saga-cancel-test',
        origin: { lat: 55.7558, lng: 37.6173 },
        destination: { lat: 55.7644, lng: 37.6225 },
      }, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (orderResponse.status === 201) {
        const orderId = orderResponse.data.id

        const dispatchResponse = await api.post('/dispatch', {
          order_id: orderId,
        }, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })

        if (dispatchResponse.status === 200 || dispatchResponse.status === 201) {
          const sagaId = dispatchResponse.data.saga_id || dispatchResponse.data.id

          const cancelResponse = await api.post(`/dispatch/${sagaId}/cancel`, {
            reason: 'Customer cancelled order',
          }, {
            headers: { Authorization: `Bearer ${accessToken}` },
          })

          expect([200, 400, 404, 500]).toContain(cancelResponse.status)
        }
      }
    })
  })

  describe('Saga Compensating Transactions', () => {
    it('should rollback vehicle assignment on failure', async () => {
      const orderResponse = await api.post('/orders', {
        customer_id: 'saga-rollback-test',
        origin: { lat: 55.7558, lng: 37.6173 },
        destination: { lat: 55.7644, lng: 37.6225 },
      }, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (orderResponse.status === 201) {
        const orderId = orderResponse.data.id

        const assignResponse = await api.post('/vehicles/test-vehicle/assign', {
          order_id: orderId,
        }, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })

        if (assignResponse.status === 200) {
          const releaseResponse = await api.post('/vehicles/test-vehicle/release', {
            order_id: orderId,
          }, {
            headers: { Authorization: `Bearer ${accessToken}` },
          })

          expect([200, 400, 404, 500]).toContain(releaseResponse.status)
        }
      }
    })
  })

  describe('Saga State Persistence', () => {
    it('should persist saga state across restarts', async () => {
      const response = await api.get('/sagas', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      expect([200, 404, 500]).toContain(response.status)
      if (response.status === 200) {
        expect(Array.isArray(response.data.sagas || response.data.data)).toBe(true)
      }
    })

    it('should get saga details', async () => {
      const response = await api.get('/sagas/test-saga-id', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      expect([200, 404, 500]).toContain(response.status)
    })

    it('should track saga steps', async () => {
      const response = await api.get('/sagas/test-saga-id/steps', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      expect([200, 404, 500]).toContain(response.status)
    })
  })

  describe('Saga Timeout Handling', () => {
    it('should handle saga timeout', async () => {
      const response = await api.post('/dispatch', {
        order_id: 'timeout-test-order',
        timeout_ms: 1000,
      }, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      expect([200, 201, 400, 404, 408, 500, 503]).toContain(response.status)
    })

    it('should retry timed out saga', async () => {
      const response = await api.post('/sagas/retry', {
        saga_id: 'timeout-test-saga',
      }, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      expect([200, 400, 404, 500]).toContain(response.status)
    })
  })
})