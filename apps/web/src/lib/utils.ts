import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const API_BASE = '/api'

export async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Request failed' }))
    throw new Error(error.message || `HTTP ${res.status}`)
  }
  return res.json()
}

export const ORDER_STATUS = {
  0: { label: 'Создан', color: 'text-accent-lavender' },
  1: { label: 'В обработке', color: 'text-accent-sky' },
  2: { label: 'Назначен', color: 'text-accent-mint' },
  3: { label: 'В пути', color: 'text-status-warning' },
  4: { label: 'Доставлен', color: 'text-status-success' },
  5: { label: 'Отменен', color: 'text-status-error' },
} as const

export const VEHICLE_STATUS = {
  0: { label: 'Доступен', color: 'text-status-success' },
  1: { label: 'Занят', color: 'text-status-warning' },
  2: { label: 'Обслуживание', color: 'text-text-muted' },
} as const