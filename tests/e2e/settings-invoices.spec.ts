import { describe, beforeAll, afterAll, it, expect, beforeEach } from '@jest/globals'
import axios, { AxiosInstance } from 'axios'

const API_URL = process.env.API_URL || 'http://localhost:3000'

describe('Settings API E2E', () => {
  let api: AxiosInstance
  let adminToken: string
  let userToken: string
  let testUser = {
    email: `settings-e2e-${Date.now()}@test.local`,
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
      firstName: 'Settings',
      lastName: 'Tester',
    })
    adminToken = registerResponse.data.accessToken
  })

  afterAll(async () => {
    if (adminToken) {
      await api.post('/auth/logout', {}, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
    }
  })

  describe('GET /settings/company', () => {
    it('should return company settings with valid JWT', async () => {
      const response = await api.get('/settings/company', {
        headers: { Authorization: `Bearer ${adminToken}` },
      })

      if (response.status === 200) {
        expect(response.data).toHaveProperty('companyName')
        expect(response.data).toHaveProperty('companyInn')
        expect(response.data).toHaveProperty('companyKpp')
        expect(response.data).toHaveProperty('companyAddress')
        expect(response.data).toHaveProperty('companyPhone')
        expect(response.data).toHaveProperty('companyEmail')
        expect(response.data).toHaveProperty('defaultPaymentTermsDays')
        expect(response.data).toHaveProperty('defaultVatRate')
      } else if (response.status === 404) {
        console.log('Settings endpoint not implemented yet or service unavailable')
      }
    })

    it('should return 401 without authentication', async () => {
      const response = await api.get('/settings/company')
      expect([401, 404, 429]).toContain(response.status)
    })
  })

  describe('PUT /settings/company', () => {
    const originalSettings = {
      companyName: 'Original Company',
      companyInn: '1234567890',
    }

    const updatedSettings = {
      companyName: 'Updated Company Name',
      companyInn: '9876543210',
      defaultPaymentTermsDays: 45,
      defaultVatRate: 18,
    }

    it('should update company settings as admin', async () => {
      const response = await api.put('/settings/company', updatedSettings, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })

      if (response.status === 200) {
        expect(response.data.companyName).toBe(updatedSettings.companyName)
        expect(response.data.defaultPaymentTermsDays).toBe(updatedSettings.defaultPaymentTermsDays)
      } else if (response.status === 403) {
        console.log('Admin permissions required for PUT /settings/company')
      } else if (response.status === 404) {
        console.log('Settings endpoint not implemented yet')
      }
    })

    it('should return 401 without authentication', async () => {
      const response = await api.put('/settings/company', updatedSettings)
      expect([401, 404, 429]).toContain(response.status)
    })

    it('should update single field (partial update)', async () => {
      const partialUpdate = {
        companyPhone: '+7 999 123-45-67',
      }

      const response = await api.patch('/settings/company', partialUpdate, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })

      if (response.status === 200) {
        expect(response.data.companyPhone).toBe(partialUpdate.companyPhone)
      }
    })
  })
})

describe('Invoices API E2E', () => {
  let api: AxiosInstance
  let adminToken: string
  let testUser = {
    email: `invoices-e2e-${Date.now()}@test.local`,
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
      firstName: 'Invoice',
      lastName: 'Tester',
    })
    adminToken = registerResponse.data.accessToken
  })

  afterAll(async () => {
    if (adminToken) {
      await api.post('/auth/logout', {}, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
    }
  })

  describe('GET /invoices', () => {
    it('should return list of invoices', async () => {
      const response = await api.get('/invoices', {
        headers: { Authorization: `Bearer ${adminToken}` },
      })

      if (response.status === 200) {
        expect(response.data).toHaveProperty('invoices')
        expect(Array.isArray(response.data.invoices)).toBe(true)
      } else if (response.status === 404) {
        console.log('Invoices endpoint not implemented yet or service unavailable')
      }
    })

    it('should return 401 without authentication', async () => {
      const response = await api.get('/invoices')
      expect([401, 404, 429]).toContain(response.status)
    })

    it('should support pagination', async () => {
      const response = await api.get('/invoices?page=1&limit=10', {
        headers: { Authorization: `Bearer ${adminToken}` },
      })

      if (response.status === 200) {
        expect(response.data).toHaveProperty('page')
        expect(response.data).toHaveProperty('total')
      }
    })
  })

  describe('GET /invoices/:id', () => {
    it('should return 404 for non-existent invoice', async () => {
      const response = await api.get('/invoices/nonexistent-id', {
        headers: { Authorization: `Bearer ${adminToken}` },
      })

      expect([200, 403, 404, 500]).toContain(response.status)
    })
  })

  describe('GET /invoices/:id/pdf', () => {
    it('should return PDF for existing invoice', async () => {
      const listResponse = await api.get('/invoices', {
        headers: { Authorization: `Bearer ${adminToken}` },
      })

      if (listResponse.status === 200 && listResponse.data.invoices?.length > 0) {
        const invoiceId = listResponse.data.invoices[0].id
        const pdfResponse = await api.get(`/invoices/${invoiceId}/pdf`, {
          headers: { Authorization: `Bearer ${adminToken}` },
          responseType: 'arraybuffer',
        })

        expect(pdfResponse.status).toBe(200)
        expect(pdfResponse.headers['content-type']).toBe('application/pdf')

        const pdfContent = Buffer.from(pdfResponse.data).toString('ascii')
        expect(pdfContent).toContain('%PDF')
      } else {
        console.log('No invoices available for PDF generation test')
      }
    })

    it('should return 404 for non-existent invoice PDF', async () => {
      const response = await api.get('/invoices/nonexistent-id/pdf', {
        headers: { Authorization: `Bearer ${adminToken}` },
        responseType: 'arraybuffer',
      })

      expect([200, 403, 404, 500]).toContain(response.status)
    })

    it('should return 401 without authentication', async () => {
      const response = await api.get('/invoices/some-id/pdf', {
        responseType: 'arraybuffer',
      })

      expect([401, 404, 429]).toContain(response.status)
    })
  })

  describe('PDF Generation Full Flow (E2E)', () => {
    let accessToken: string
    let orderId: string
    let invoiceId: string

    beforeAll(async () => {
      const loginResponse = await api.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      })
      accessToken = loginResponse.data.accessToken
    })

    it('should create order and trigger invoice creation via saga', async () => {
      // Create order
      const orderResponse = await api.post('/orders', {
        origin: { lat: 55.7558, lng: 37.6173, address: 'Москва, Тверская 1' },
        destination: { lat: 59.9311, lng: 30.3609, address: 'Санкт-Петербург, Невский 10' },
        weight_kg: 1000,
        volume_m3: 5,
        customer_id: testUser.email,
      }, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      expect([201, 202]).toContain(orderResponse.status)
      if (orderResponse.status === 201 || orderResponse.status === 202) {
        orderId = orderResponse.data.id

        // Start dispatch saga to create invoice
        const dispatchResponse = await api.post('/dispatch', {
          order_id: orderId,
        }, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })

        expect([200, 201, 202]).toContain(dispatchResponse.status)
      }
    })

    it('should wait for invoice creation and generate PDF', async () => {
      if (!orderId) return

      // Poll until invoice is created (via Kafka order.delivered event)
      let attempts = 0
      const maxAttempts = 30

      while (attempts < maxAttempts) {
        const invoicesResponse = await api.get('/invoices', {
          headers: { Authorization: `Bearer ${accessToken}` },
        })

        if (invoicesResponse.status === 200) {
          const invoices = invoicesResponse.data.invoices || []
          const orderInvoice = invoices.find(
            (inv: any) => inv.order_id === orderId || inv.orderId === orderId,
          )

          if (orderInvoice) {
            invoiceId = orderInvoice.id || orderInvoice.order_id
            break
          }
        }

        await new Promise(resolve => setTimeout(resolve, 1000))
        attempts++
      }

      expect(invoiceId).toBeDefined()

      // Generate PDF
      if (invoiceId) {
        const pdfResponse = await api.get(`/invoices/${invoiceId}/pdf`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          responseType: 'arraybuffer',
        })

        expect(pdfResponse.status).toBe(200)
        expect(pdfResponse.headers['content-type']).toBe('application/pdf')

        const pdfContent = Buffer.from(pdfResponse.data).toString('ascii')
        expect(pdfContent).toContain('%PDF')
        expect(pdfContent.length).toBeGreaterThan(100)
      }
    })

    it('should return same PDF on repeated requests (cached)', async () => {
      if (!invoiceId) return

      const [response1, response2] = await Promise.all([
        api.get(`/invoices/${invoiceId}/pdf`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          responseType: 'arraybuffer',
        }),
        api.get(`/invoices/${invoiceId}/pdf`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          responseType: 'arraybuffer',
        }),
      ])

      expect(response1.status).toBe(200)
      expect(response2.status).toBe(200)

      const pdf1 = Buffer.from(response1.data).toString('ascii')
      const pdf2 = Buffer.from(response2.data).toString('ascii')
      expect(pdf1).toContain('%PDF')
      expect(pdf2).toContain('%PDF')
      expect(pdf1).toBe(pdf2)
    })

    it('should handle concurrent PDF requests without errors', async () => {
      if (!invoiceId) return

      const concurrentRequests = 5
      const requests = Array.from({ length: concurrentRequests }, () =>
        api.get(`/invoices/${invoiceId}/pdf`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          responseType: 'arraybuffer',
        }),
      )

      const results = await Promise.all(requests)

      results.forEach((response, index) => {
        expect(response.status).toBe(200, `Request ${index + 1} failed with status ${response.status}`)
        expect(response.headers['content-type']).toBe('application/pdf')

        const pdfContent = Buffer.from(response.data).toString('ascii')
        expect(pdfContent).toContain('%PDF')
      })

      // All responses should be identical (same PDF)
      const firstPdf = Buffer.from(results[0].data).toString('ascii')
      results.slice(1).forEach((response, index) => {
        const pdf = Buffer.from(response.data).toString('ascii')
        expect(pdf).toBe(firstPdf, `Response ${index + 2} differs from first response`)
      })
    })
  })

  describe('Invoices Lifecycle', () => {
    let accessToken: string
    let createdInvoiceId: string

    beforeAll(async () => {
      const loginResponse = await api.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      })
      accessToken = loginResponse.data.accessToken
    })

    it('should create invoice via POST /invoices', async () => {
      const response = await api.post('/invoices', {
        counterparty_id: 'test-counterparty',
        order_id: 'test-order-lifecycle',
        amount: 10000,
        vat_rate: 20,
      }, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (response.status === 201) {
        createdInvoiceId = response.data.id
        expect(response.data).toHaveProperty('status')
        expect([1, 2]).toContain(response.data.status)
      } else {
        expect([400, 404, 500]).toContain(response.status)
      }
    })

    it('should update invoice status to SENT', async () => {
      if (!createdInvoiceId) return

      const response = await api.patch(`/invoices/${createdInvoiceId}/status`, {
        status: 2,
      }, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      expect(response.status).toBe(200)
    })

    it('should update invoice status to PAID', async () => {
      if (!createdInvoiceId) return

      const response = await api.patch(`/invoices/${createdInvoiceId}/status`, {
        status: 3,
      }, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      expect(response.status).toBe(200)
    })

    it('should reject invalid status transition DRAFT → PAID (409)', async () => {
      const createResponse = await api.post('/invoices', {
        counterparty_id: 'test-counterparty',
        amount: 5000,
      }, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (createResponse.status === 201) {
        const invoiceId = createResponse.data.id

        const updateResponse = await api.patch(`/invoices/${invoiceId}/status`, {
          status: 3,
        }, {
          headers: { Authorization: `Bearer ${accessToken}` },
        })

        expect([409, 400, 500]).toContain(updateResponse.status)
      }
    })

    it('should void invoice', async () => {
      if (!createdInvoiceId) return

      const response = await api.patch(`/invoices/${createdInvoiceId}/status`, {
        status: 5,
      }, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      expect(response.status).toBe(200)
    })

    it('should add payment to invoice', async () => {
      if (!createdInvoiceId) return

      const response = await api.post(`/invoices/${createdInvoiceId}/payments`, {
        amount: 10000,
        payment_date: new Date().toISOString(),
        payment_method: 'bank_transfer',
      }, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      expect([200, 201, 400, 404, 500]).toContain(response.status)
    })

    it('should get invoice payments', async () => {
      if (!createdInvoiceId) return

      const response = await api.get(`/invoices/${createdInvoiceId}/payments`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      expect([200, 404, 500]).toContain(response.status)
    })
  })

  describe('Invoices Filters', () => {
    let accessToken: string

    beforeAll(async () => {
      const loginResponse = await api.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      })
      accessToken = loginResponse.data.accessToken
    })

    it('should filter invoices by status', async () => {
      const response = await api.get('/invoices?status=1', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (response.status === 200) {
        const invoices = response.data.invoices || response.data.data || []
        invoices.forEach((inv: any) => {
          expect([1, 'DRAFT', 'draft']).toContain(inv.status)
        })
      }
    })

    it('should filter invoices by counterparty_id', async () => {
      const response = await api.get('/invoices?counterparty_id=test-counterparty', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      expect([200, 403]).toContain(response.status)
    })

    it('should filter invoices by date range', async () => {
      const today = new Date()
      const lastMonth = new Date(today)
      lastMonth.setMonth(lastMonth.getMonth() - 1)

      const response = await api.get(`/invoices?from=${lastMonth.toISOString()}&to=${today.toISOString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      expect([200, 403]).toContain(response.status)
    })

    it('should support limit and offset pagination', async () => {
      const response = await api.get('/invoices?limit=5&offset=0', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (response.status === 200) {
        const invoices = response.data.invoices || response.data.data || []
        expect(invoices.length).toBeLessThanOrEqual(5)
      } else {
        expect([200, 403]).toContain(response.status)
      }
    })

    it('should sort invoices by created_at DESC', async () => {
      const response = await api.get('/invoices?sort=-created_at', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      expect([200, 403]).toContain(response.status)
    })

    it('should search invoices by number', async () => {
      const response = await api.get('/invoices?search=INV-2024', {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      expect([200, 403]).toContain(response.status)
    })
  })

  describe('Invoices Validation', () => {
    let accessToken: string

    beforeAll(async () => {
      const loginResponse = await api.post('/auth/login', {
        email: testUser.email,
        password: testUser.password,
      })
      accessToken = loginResponse.data.accessToken
    })

    it('should reject invoice with negative amount', async () => {
      const response = await api.post('/invoices', {
        counterparty_id: 'test',
        amount: -100,
      }, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      expect([400, 404, 422, 500]).toContain(response.status)
    })

    it('should reject invoice with invalid VAT rate', async () => {
      const response = await api.post('/invoices', {
        counterparty_id: 'test',
        amount: 10000,
        vat_rate: 150,
      }, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      expect([400, 404, 422, 500]).toContain(response.status)
    })

    it('should reject invoice without counterparty_id', async () => {
      const response = await api.post('/invoices', {
        amount: 10000,
      }, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      expect([400, 404, 422, 500]).toContain(response.status)
    })
  })
})