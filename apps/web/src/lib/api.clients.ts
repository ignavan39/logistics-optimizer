export { apiGet, apiPost, apiPatch, apiDelete, apiDownload, ApiError } from './api'

import { apiGet, apiPost, apiPatch, apiDelete, apiDownload } from './api'
import type { CreateVehicleDto, VehicleStatus } from '@/types/vehicle'
import type { Counterparty, CreateCounterpartyDto } from '@/types/counterparty'
import type { CreateContractDto, CreateContractTariffDto } from '@/types/counterparty'
import type { Invoice, InvoiceStatusUpdate } from '@/types/invoice'
import type { CompanySettings, UpdateCompanySettingsDto } from '@/types/settings'

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
}

export const counterpartiesApi = {
  list: () => apiGet<Counterparty[]>('/counterparties'),
  get: (id: string) => apiGet<Counterparty>(`/counterparties/${id}`),
  create: (data: CreateCounterpartyDto) => apiPost<Counterparty>('/counterparties', data),
  update: (id: string, data: Partial<CreateCounterpartyDto>) => apiPatch<Counterparty>(`/counterparties/${id}`, data),
  delete: (id: string) => apiDelete<void>(`/counterparties/${id}`),
}

export interface Contract {
  id: string
  counterpartyId: string
  number: string
  status: string
  validFromUnix?: number
  validToUnix?: number
}

export const contractsApi = {
  list: (counterpartyId?: string) => apiGet<Contract[]>(counterpartyId ? `/contracts?counterpartyId=${counterpartyId}` : '/contracts'),
  get: (id: string) => apiGet<Contract>(`/contracts/${id}`),
  create: (data: CreateContractDto) => apiPost<Contract>('/contracts', data),
  update: (id: string, data: Partial<CreateContractDto>) => apiPatch<Contract>(`/contracts/${id}`, data),
  delete: (id: string) => apiDelete<void>(`/contracts/${id}`),
  createTariff: (contractId: string, data: CreateContractTariffDto) => apiPost<CreateContractTariffDto>(`/contracts/${contractId}/tariffs`, data),
  getTariffs: (contractId: string) => apiGet<CreateContractTariffDto[]>(`/contracts/${contractId}/tariffs`),
  updateTariff: (contractId: string, tariffId: string, data: Partial<CreateContractTariffDto>) => apiPatch<CreateContractTariffDto>(`/contracts/${contractId}/tariffs/${tariffId}`, data),
  deleteTariff: (contractId: string, tariffId: string) => apiDelete<void>(`/contracts/${contractId}/tariffs/${tariffId}`),
  tariffs: (contractId: string) => apiGet<CreateContractTariffDto[]>(`/contracts/${contractId}/tariffs`),
}

interface InvoiceResponse {
  id: string;
  order_id: string;
  number: string;
  amount: number;
  vat_rate: number;
  vat_amount: number;
  status: number;
  due_date: string;
  paid_at: string;
  counterparty_id: string;
  contract_id: string;
  description: string;
  created_at: string;
  version: number;
}

const mapInvoice = (inv: InvoiceResponse): Invoice => ({
  id: inv.id,
  orderId: inv.order_id,
  number: inv.number,
  counterpartyId: inv.counterparty_id,
  amount: inv.amount,
  vatRate: inv.vat_rate,
  vatAmount: inv.vat_amount,
  status: inv.status as Invoice['status'],
  dueDateUnix: inv.due_date ? Math.floor(Number(inv.due_date) / 1000) : undefined,
  paidAtUnix: inv.paid_at ? Math.floor(Number(inv.paid_at) / 1000) : undefined,
  createdAtUnix: inv.created_at ? Math.floor(Number(inv.created_at) / 1000) : 0,
})

export const invoicesApi = {
  list: (params?: { page?: number; limit?: number; status?: string }) => {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.limit) searchParams.set('limit', String(params.limit))
    if (params?.status) searchParams.set('status', params.status)
    const query = searchParams.toString()
    return apiGet<{ invoices: InvoiceResponse[]; total: number; page: number }>(query ? `/invoices?${query}` : '/invoices')
      .then(res => ({
        items: res.invoices.map(mapInvoice),
        total: res.total,
        page: res.page
      }))
  },
  get: (id: string) => apiGet<InvoiceResponse>(`/invoices/${id}`).then(mapInvoice),
  pdf: (id: string) => apiDownload(`/invoices/${id}/pdf`, `invoice-${id}.pdf`),
  updateStatus: (id: string, data: InvoiceStatusUpdate) => apiPatch<InvoiceResponse>(`/invoices/${id}`, data).then(mapInvoice),
}

export const settingsApi = {
  getCompany: () => apiGet<CompanySettings>('/settings/company'),
  updateCompany: (data: UpdateCompanySettingsDto) => apiPatch<CompanySettings>('/settings/company', data),
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