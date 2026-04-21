import { describe, beforeAll, afterAll, it, expect } from '@jest/globals'
import axios, { AxiosError } from 'axios'

const API_URL = process.env.API_URL || 'http://localhost:3000'

describe('API Gateway E2E', () => {
  let api: ReturnType<typeof axios.create>
  let testUser = {
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

    it('should reject without token', async () => {
      const response = await api.get('/auth/me')

      expect(response.status).toBe(401)
    })

    it('should reject with invalid token', async () => {
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
})