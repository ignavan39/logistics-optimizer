export { apiGet, apiPost, apiPatch, apiDelete, apiDownload, ApiError } from './api'

import { apiGet, apiPost, apiPatch, apiDelete, apiDownload } from './api'
import type { CreateVehicleDto, VehicleStatus } from '@/types/vehicle'

export const counterpartiesApi = {
  list: () => apiGet<any[]>('/counterparties'),
  get: (id: string) => apiGet<any>(`/counterparties/${id}`),
  create: (data: any) => apiPost<any>('/counterparties', data),
  update: (id: string, data: any) => apiPatch<any>(`/counterparties/${id}`, data),
  delete: (id: string) => apiDelete<any>(`/counterparties/${id}`),
}

export const contractsApi = {
  list: (counterpartyId?: string) => apiGet<any[]>(counterpartyId ? `/contracts?counterpartyId=${counterpartyId}` : '/contracts'),
  get: (id: string) => apiGet<any>(`/contracts/${id}`),
  create: (data: any) => apiPost<any>('/contracts', data),
  update: (id: string, data: any) => apiPatch<any>(`/contracts/${id}`, data),
  delete: (id: string) => apiDelete<any>(`/contracts/${id}`),
  createTariff: (contractId: string, data: any) => apiPost<any>(`/contracts/${contractId}/tariffs`, data),
  getTariffs: (contractId: string) => apiGet<any[]>(`/contracts/${contractId}/tariffs`),
  updateTariff: (contractId: string, tariffId: string, data: any) => apiPatch<any>(`/contracts/${contractId}/tariffs/${tariffId}`, data),
  deleteTariff: (contractId: string, tariffId: string) => apiDelete<any>(`/contracts/${contractId}/tariffs/${tariffId}`),
  tariffs: (contractId: string) => apiGet<any[]>(`/contracts/${contractId}/tariffs`),
}

export const invoicesApi = {
  list: (params?: { page?: number; limit?: number; status?: string }) => {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.limit) searchParams.set('limit', String(params.limit))
    if (params?.status) searchParams.set('status', params.status)
    const query = searchParams.toString()
    return apiGet<{ items: any[]; total: number }>(query ? `/invoices?${query}` : '/invoices')
  },
  get: (id: string) => apiGet<any>(`/invoices/${id}`),
  pdf: (id: string) => apiDownload(`/invoices/${id}/pdf`, `invoice-${id}.pdf`),
  updateStatus: (id: string, data: any) => apiPatch<any>(`/invoices/${id}`, data),
}

export const settingsApi = {
  getCompany: () => apiGet<any>('/settings/company'),
  updateCompany: (data: any) => apiPatch<any>('/settings/company', data),
}

export const vehiclesApi = {
  list: (params?: { page?: number; limit?: number; status?: string; type?: string }) => {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.limit) searchParams.set('limit', String(params.limit))
    if (params?.status) searchParams.set('status', params.status)
    if (params?.type) searchParams.set('type', params.type)
    const query = searchParams.toString()
    return apiGet<any[]>(query ? `/vehicles?${query}` : '/vehicles')
  },
  get: (id: string) => apiGet<any>(`/vehicles/${id}`),
  create: (data: CreateVehicleDto) => apiPost<any>('/vehicles', data),
  update: (id: string, data: Partial<CreateVehicleDto>) => apiPatch<any>(`/vehicles/${id}`, data),
  updateStatus: (id: string, status: VehicleStatus) => apiPatch<any>(`/vehicles/${id}/status`, { status }),
  assign: (id: string, orderId: string) => apiPost<any>(`/vehicles/${id}/assign`, { orderId }),
  release: (id: string) => apiPost<any>(`/vehicles/${id}/release`, {}),
}