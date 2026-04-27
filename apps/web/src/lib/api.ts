import { getAuthHeader } from './auth'

const API_BASE = '/api'

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }))
    throw new Error(error.message || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function apiGet<T>(endpoint: string, params?: Record<string, string | number>): Promise<T> {
  const url = new URL(`${API_BASE}${endpoint}`, window.location.origin)
  if (params) {
    Object.entries(params).forEach(([key, value]) => { url.searchParams.append(key, String(value)); })
  }
  const res = await fetch(url.toString(), {
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
  })
  return handleResponse<T>(res)
}

export async function apiPost<T>(endpoint: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: body ? JSON.stringify(body) : undefined,
  })
  return handleResponse<T>(res)
}

export async function apiPatch<T>(endpoint: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: body ? JSON.stringify(body) : undefined,
  })
  return handleResponse<T>(res)
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function apiDelete<T>(endpoint: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
    body: body ? JSON.stringify(body) : undefined,
  })
  return handleResponse<T>(res)
}

export async function apiDownload(endpoint: string, filename: string): Promise<void> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { ...getAuthHeader() },
  })
  if (!res.ok) throw new Error(`Download failed: ${res.status}`)
  const blob = await res.blob()
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  window.URL.revokeObjectURL(url)
}

export { getAuthHeader }