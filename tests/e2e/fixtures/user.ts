import axios, { type AxiosInstance } from 'axios'

export const testUser = {
  email: 'e2e-test@logistics.local',
  password: 'TestPassword123!',
  firstName: 'E2E',
  lastName: 'Test',
}

let accessToken: string
let api: AxiosInstance

export async function setupTestUser(baseUrl: string = 'http://localhost:3000'): Promise<string> {
  api = axios.create({
    baseURL: baseUrl,
    timeout: 10000,
    validateStatus: () => true,
  })

  await api.post('/auth/register', testUser)

  const loginRes = await api.post('/auth/login', {
    email: testUser.email,
    password: testUser.password,
  })

  accessToken = loginRes.data.accessToken

  return accessToken
}

export function getApi(): AxiosInstance {
  if (!api) {
    throw new Error('setupTestUser must be called first')
  }
  return api
}

export function getAccessToken(): string {
  return accessToken
}

export function clearTestUser() {
  accessToken = ''
}