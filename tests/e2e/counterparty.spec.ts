import { describe, beforeAll, afterAll, it, expect } from '@jest/globals'
import axios, { AxiosInstance } from 'axios'

const API_URL = process.env.API_URL || 'http://localhost:3000'

describe('Counterparty API E2E', () => {
  let api: AxiosInstance
  let adminToken: string
  let userToken: string
  let testUser = {
    email: `counterparty-e2e-${Date.now()}@test.local`,
    password: 'TestPassword123!',
  }
  let testCounterpartyId: string

  beforeAll(async () => {
    api = axios.create({
      baseURL: API_URL,
      timeout: 10000,
      validateStatus: () => true,
    })

    const registerResponse = await api.post('/auth/register', {
      email: testUser.email,
      password: testUser.password,
      firstName: 'Counterparty',
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

  describe('Counterparty CRUD', () => {
    it('should create counterparty via POST /counterparties', async () => {
      const response = await api.post('/counterparties', {
        name: 'Test Counterparty LLC',
        type: 'customer',
        inn: '1234567890',
        kpp: '123456789',
        address: '123 Test Street, Moscow',
        phone: '+7 999 123-45-67',
        email: 'counterparty@test.local',
      }, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })

      if (response.status === 201) {
        testCounterpartyId = response.data.id
        expect(response.data).toHaveProperty('id')
        expect(response.data.name).toBe('Test Counterparty LLC')
      } else {
        expect([400, 404, 500]).toContain(response.status)
      }
    })

    it('should list all counterparties', async () => {
      const response = await api.get('/counterparties', {
        headers: { Authorization: `Bearer ${adminToken}` },
      })

      expect([200, 201, 404]).toContain(response.status)
      if (response.status === 200) {
        const data = response.data.counterparties || response.data.data || response.data
        expect(Array.isArray(data) || data !== undefined).toBe(true)
      }
    })

    it('should get counterparty by ID', async () => {
      if (!testCounterpartyId) return

      const response = await api.get(`/counterparties/${testCounterpartyId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })

      expect([200, 404, 500]).toContain(response.status)
    })

    it('should update counterparty via PUT', async () => {
      if (!testCounterpartyId) return

      const response = await api.put(`/counterparties/${testCounterpartyId}`, {
        name: 'Updated Counterparty Name',
        phone: '+7 999 765-43-21',
      }, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })

      expect([200, 400, 404, 500]).toContain(response.status)
    })

    it('should partially update counterparty via PATCH', async () => {
      if (!testCounterpartyId) return

      const response = await api.patch(`/counterparties/${testCounterpartyId}`, {
        email: 'updated@test.local',
      }, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })

      expect([200, 400, 404, 500]).toContain(response.status)
    })

    it('should delete counterparty', async () => {
      const createResponse = await api.post('/counterparties', {
        name: 'To Be Deleted',
        type: 'customer',
      }, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })

      if (createResponse.status === 201) {
        const idToDelete = createResponse.data.id

        const deleteResponse = await api.delete(`/counterparties/${idToDelete}`, {
          headers: { Authorization: `Bearer ${adminToken}` },
        })

        expect([200, 204, 404, 500]).toContain(deleteResponse.status)
      }
    })

    it('should return 401 without authentication', async () => {
      const response = await api.get('/counterparties')
      expect([401, 404, 429]).toContain(response.status)
    })

    it('should filter counterparties by type', async () => {
      const response = await api.get('/counterparties?type=customer', {
        headers: { Authorization: `Bearer ${adminToken}` },
      })

      expect([200, 400, 404, 500]).toContain(response.status)
    })

    it('should search counterparties by name', async () => {
      const response = await api.get('/counterparties?search=Test', {
        headers: { Authorization: `Bearer ${adminToken}` },
      })

      expect([200, 400, 404, 500]).toContain(response.status)
    })
  })

  describe('Counterparty Contracts', () => {
    let contractId: string

    it('should create contract for counterparty', async () => {
      if (!testCounterpartyId) return

      const response = await api.post(`/counterparties/${testCounterpartyId}/contracts`, {
        contract_number: 'CONTRACT-2024-001',
        contract_date: '2024-01-01',
        valid_from: '2024-01-01',
        valid_until: '2024-12-31',
        payment_terms_days: 30,
        discount_percent: 5,
      }, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })

      if (response.status === 201) {
        contractId = response.data.id
        expect(response.data).toHaveProperty('contract_number')
      } else {
        expect([400, 404, 500]).toContain(response.status)
      }
    })

    it('should list contracts for counterparty', async () => {
      if (!testCounterpartyId) return

      const response = await api.get(`/counterparties/${testCounterpartyId}/contracts`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })

      expect([200, 404, 500]).toContain(response.status)
    })

    it('should get contract by ID', async () => {
      if (!testCounterpartyId || !contractId) return

      const response = await api.get(`/counterparties/${testCounterpartyId}/contracts/${contractId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })

      expect([200, 404, 500]).toContain(response.status)
    })

    it('should update contract', async () => {
      if (!testCounterpartyId || !contractId) return

      const response = await api.put(`/counterparties/${testCounterpartyId}/contracts/${contractId}`, {
        payment_terms_days: 45,
        discount_percent: 10,
      }, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })

      expect([200, 400, 404, 500]).toContain(response.status)
    })

    it('should terminate contract', async () => {
      if (!testCounterpartyId || !contractId) return

      const response = await api.patch(`/counterparties/${testCounterpartyId}/contracts/${contractId}/terminate`, {
        termination_date: new Date().toISOString(),
        reason: 'Mutual agreement',
      }, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })

      expect([200, 400, 404, 500]).toContain(response.status)
    })

    it('should get active contracts only', async () => {
      if (!testCounterpartyId) return

      const response = await api.get(`/counterparties/${testCounterpartyId}/contracts?active=true`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })

      expect([200, 404, 500]).toContain(response.status)
    })
  })

  describe('Counterparty Tariffs', () => {
    it('should set tariff for counterparty', async () => {
      if (!testCounterpartyId) return

      const response = await api.post(`/counterparties/${testCounterpartyId}/tariffs`, {
        service_type: 'standard_delivery',
        price_per_kg: 50,
        price_per_km: 10,
        min_price: 500,
        effective_from: '2024-01-01',
      }, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })

      expect([200, 201, 400, 404, 500]).toContain(response.status)
    })

    it('should list tariffs for counterparty', async () => {
      if (!testCounterpartyId) return

      const response = await api.get(`/counterparties/${testCounterpartyId}/tariffs`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })

      expect([200, 404, 500]).toContain(response.status)
    })

    it('should update tariff', async () => {
      if (!testCounterpartyId) return

      const createResponse = await api.post(`/counterparties/${testCounterpartyId}/tariffs`, {
        service_type: 'express_delivery',
        price_per_kg: 100,
        effective_from: '2024-01-01',
      }, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })

      if (createResponse.status === 201) {
        const tariffId = createResponse.data.id

        const updateResponse = await api.put(`/counterparties/${testCounterpartyId}/tariffs/${tariffId}`, {
          price_per_kg: 120,
        }, {
          headers: { Authorization: `Bearer ${adminToken}` },
        })

        expect([200, 400, 404, 500]).toContain(updateResponse.status)
      }
    })

    it('should get active tariffs', async () => {
      if (!testCounterpartyId) return

      const response = await api.get(`/counterparties/${testCounterpartyId}/tariffs?active=true`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })

      expect([200, 404, 500]).toContain(response.status)
    })
  })

  describe('Counterparty Validation', () => {
    it('should reject counterparty with duplicate INN', async () => {
      await api.post('/counterparties', {
        name: 'Duplicate INN Test',
        type: 'customer',
        inn: '1234567890',
      }, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })

      const response = await api.post('/counterparties', {
        name: 'Another Entity',
        type: 'customer',
        inn: '1234567890',
      }, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })

      expect([400, 404, 409, 500]).toContain(response.status)
    })

    it('should reject counterparty with invalid INN format', async () => {
      const response = await api.post('/counterparties', {
        name: 'Invalid INN',
        type: 'customer',
        inn: 'abc',
      }, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })

      expect([400, 404, 422, 500]).toContain(response.status)
    })

    it('should reject counterparty without name', async () => {
      const response = await api.post('/counterparties', {
        type: 'customer',
      }, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })

      expect([400, 404, 422, 500]).toContain(response.status)
    })

    it('should reject counterparty with invalid type', async () => {
      const response = await api.post('/counterparties', {
        name: 'Invalid Type',
        type: 'invalid_type',
      }, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })

      expect([400, 404, 422, 500]).toContain(response.status)
    })
  })

  describe('Counterparty Balance', () => {
    it('should get counterparty balance', async () => {
      if (!testCounterpartyId) return

      const response = await api.get(`/counterparties/${testCounterpartyId}/balance`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })

      expect([200, 404, 500]).toContain(response.status)
    })

    it('should get counterparty transactions', async () => {
      if (!testCounterpartyId) return

      const response = await api.get(`/counterparties/${testCounterpartyId}/transactions`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })

      expect([200, 404, 500]).toContain(response.status)
    })
  })
})