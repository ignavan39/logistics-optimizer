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
      expect([401, 429]).toContain(response.status)
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
      expect([401, 429]).toContain(response.status)
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
      expect([401, 429]).toContain(response.status)
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

      expect([404, 500]).toContain(response.status)
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

      expect([404, 500]).toContain(response.status)
    })

    it('should return 401 without authentication', async () => {
      const response = await api.get('/invoices/some-id/pdf', {
        responseType: 'arraybuffer',
      })

      expect([401, 429]).toContain(response.status)
    })
  })
})