import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { apiFetch } from './utils'

interface User {
  userId: string
  email: string
  type: string
  permissions: string[]
}

interface AuthState {
  user: User | null
  token: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
  checkAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        const res = await apiFetch<{ accessToken: string; refreshToken: string; user: User }>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        })
        set({
          token: res.accessToken,
          refreshToken: res.refreshToken,
          user: res.user,
          isAuthenticated: true,
        })
      },

      logout: async () => {
        const { token } = get()
        if (token) {
          try {
            await apiFetch('/auth/logout', {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
            })
          } catch {}
        }
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
        })
      },

      refresh: async () => {
        const { refreshToken } = get()
        if (!refreshToken) return
        try {
          const res = await apiFetch<{ accessToken: string; refreshToken: string; user: User }>('/auth/refresh', {
            method: 'POST',
            body: JSON.stringify({ refreshToken }),
          })
          set({
            token: res.accessToken,
            refreshToken: res.refreshToken,
            user: res.user,
            isAuthenticated: true,
          })
        } catch {
          set({ user: null, token: null, refreshToken: null, isAuthenticated: false })
        }
      },

      checkAuth: async () => {
        const { token } = get()
        if (!token) return
        try {
          const res = await apiFetch<{ userId: string; email: string; type: string; permissions: string[] }>('/auth/me', {
            headers: { Authorization: `Bearer ${token}` },
          })
          set({ user: res, isAuthenticated: true })
        } catch {
          await get().refresh()
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

export async function apiFetchWithAuth<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const headers = getAuthHeader()
  const res = await fetch(`/api${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
      ...options?.headers,
    },
  })

  if (res.status === 401) {
    const { refresh } = useAuthStore.getState()
    await refresh()
    const newHeaders = getAuthHeader()
    const retryRes = await fetch(`/api${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...newHeaders,
        ...options?.headers,
      },
    })
    if (!retryRes.ok) {
      const error = await retryRes.json().catch(() => ({ message: 'Request failed' }))
      throw new Error(error.message || `HTTP ${retryRes.status}`)
    }
    return retryRes.json()
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }))
    throw new Error(error.message || `HTTP ${res.status}`)
  }
  return res.json()
}

export { apiFetch } from './utils'

export function getAuthHeader(): Record<string, string> {
  const token = useAuthStore.getState().token
  return token ? { Authorization: `Bearer ${token}` } : {}
}