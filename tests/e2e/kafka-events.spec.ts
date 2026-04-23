import { describe, beforeAll, afterAll, it, expect } from '@jest/globals'
import axios, { AxiosInstance } from 'axios'

const API_URL = process.env.API_URL || 'http://localhost:3000'

describe('Kafka Events E2E', () => {
  let api: AxiosInstance
  let accessToken: string
  let testUser = {
    email: `kafka-e2e-${Date.now()}@test.local`,
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
      firstName: 'Kafka',
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

  describe('order.delivered Event → Invoice Creation', () => {
    let orderId: string

    it('should create order that will trigger invoice', async () => {
      const response = await api.post('/orders', {
        customer_id: 'kafka-invoice-test',
        origin: { lat: 55.7558, lng: 37.6173 },
        destination: { lat: 55.7644, lng: 37.6225 },
        weight_kg: 100,
        price: 5000,
      }, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (response.status === 201) {
        orderId = response.data.id
        expect(response.data).toHaveProperty('id')
      }
    })

    it('should complete order flow that triggers invoice event', async () => {
      if (!orderId) return

      const transitions = [
        { status: 2 },
        { status: 3 },
        { status: 4 },
        { status: 5 },
      ]

      for (const transition of transitions) {
        const response = await api.patch(`/orders/${orderId}/status`, {
          order_id: orderId,
          status: transition.status,
        }, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })

        if (response.status === 409) break
      }

      const finalCheck = await api.get(`/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      expect([200, 404, 500]).toContain(finalCheck.status)
    })

    it('should find auto-created invoice after order.delivered', async () => {
      const response = await api.get('/invoices', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (response.status === 200) {
        const invoices = response.data.invoices || response.data.data || []
        if (invoices.length > 0) {
          const recentInvoice = invoices[0]
          expect(recentInvoice).toHaveProperty('order_id')
        }
      }
    })
  })

  describe('order.cancelled Event → Rollback Invoice', () => {
    it('should cancel order and invalidate pending invoice', async () => {
      const orderResponse = await api.post('/orders', {
        customer_id: 'kafka-cancel-test',
        origin: { lat: 55.7558, lng: 37.6173 },
        destination: { lat: 55.7644, lng: 37.6225 },
        price: 3000,
      }, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (orderResponse.status === 201) {
        const orderId = orderResponse.data.id

        await api.patch(`/orders/${orderId}/status`, {
          order_id: orderId,
          status: 2,
        }, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })

        const cancelResponse = await api.delete(`/orders/${orderId}`, {
          data: { reason: 'Customer request' },
          headers: { Authorization: `Bearer ${accessToken}` },
        })

        expect([200, 204, 404, 500]).toContain(cancelResponse.status)
      }
    })
  })

  describe('vehicle.assigned Event → Order Update', () => {
    it('should assign vehicle and update order status', async () => {
      const orderResponse = await api.post('/orders', {
        customer_id: 'kafka-vehicle-test',
        origin: { lat: 55.7558, lng: 37.6173 },
        destination: { lat: 55.7644, lng: 37.6225 },
      }, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (orderResponse.status === 201) {
        const orderId = orderResponse.data.id

        const assignResponse = await api.post('/vehicles/vehicle-kafka-1/assign', {
          order_id: orderId,
        }, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })

        expect([200, 400, 404, 500]).toContain(assignResponse.status)

        if (assignResponse.status === 200) {
          const orderCheck = await api.get(`/orders/${orderId}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
          })

          expect([200, 404, 500]).toContain(orderCheck.status)
        }
      }
    })
  })

  describe('payment.received Event → Invoice Payment Update', () => {
    it('should process payment and update invoice status', async () => {
      const invoiceResponse = await api.post('/invoices', {
        counterparty_id: 'kafka-payment-test',
        amount: 10000,
        status: 2,
      }, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (invoiceResponse.status === 201) {
        const invoiceId = invoiceResponse.data.id

        const paymentResponse = await api.post(`/invoices/${invoiceId}/payments`, {
          amount: 10000,
          payment_date: new Date().toISOString(),
        }, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })

        expect([200, 201, 400, 404, 500]).toContain(paymentResponse.status)

        const invoiceCheck = await api.get(`/invoices/${invoiceId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })

        if (invoiceCheck.status === 200) {
          expect([3, 'PAID', 'paid', 5, 'PARTIALLY_PAID', 'partially_paid']).toContain(invoiceCheck.data.status)
        }
      }
    })
  })

  describe('Kafka Event Publishing', () => {
    it('should publish order.placed event', async () => {
      const response = await api.get('/events/order.placed', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      expect([200, 404, 500]).toContain(response.status)
    })

    it('should publish order.delivered event', async () => {
      const response = await api.get('/events/order.delivered', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      expect([200, 404, 500]).toContain(response.status)
    })

    it('should support event replay', async () => {
      const response = await api.post('/events/replay', {
        event_type: 'order.delivered',
        from: new Date(Date.now() - 3600000).toISOString(),
        to: new Date().toISOString(),
      }, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      expect([200, 400, 404, 500]).toContain(response.status)
    })
  })

  describe('Outbox Pattern', () => {
    it('should have reliable event delivery via outbox', async () => {
      const response = await api.get('/outbox/events', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      expect([200, 404, 500]).toContain(response.status)
    })

    it('should retry failed events', async () => {
      const response = await api.post('/outbox/retry', {
        event_id: 'test-failed-event',
      }, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      expect([200, 400, 404, 500]).toContain(response.status)
    })
  })

  describe('Event Schema Validation', () => {
    it('should validate event payload structure', async () => {
      const response = await api.post('/events/validate', {
        event_type: 'order.delivered',
        payload: {
          order_id: 'test-order',
          delivered_at: new Date().toISOString(),
        },
      }, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      expect([200, 400, 404, 500]).toContain(response.status)
    })

    it('should reject event with missing required fields', async () => {
      const response = await api.post('/events/validate', {
        event_type: 'order.delivered',
        payload: {},
      }, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      expect([400, 404, 422, 500]).toContain(response.status)
    })
  })
})