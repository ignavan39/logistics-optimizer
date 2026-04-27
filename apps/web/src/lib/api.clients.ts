export { apiGet, apiPost, apiPatch, apiDelete, apiDownload, ApiError } from './api'

import { apiGet, apiPost, apiPatch, apiDelete, apiDownload } from './api'

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
  createTariff: (contractId: string, data: any) => apiPost<any>(`/contracts/${contractId}/tariffs`, data),
  getTariffs: (contractId: string) => apiGet<any[]>(`/contracts/${contractId}/tariffs`),
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