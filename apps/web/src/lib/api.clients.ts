export { apiGet, apiPost, apiPatch, apiDelete, apiDownload, ApiError } from './api'

import { apiGet, apiPost, apiPatch, apiDelete, apiDownload } from './api'
import type { CreateVehicleDto, VehicleStatus } from '@/types/vehicle'
import type { Counterparty, CreateCounterpartyDto } from '@/types/counterparty'
import type { CreateContractDto, CreateContractTariffDto } from '@/types/counterparty'
import type { Invoice, InvoiceStatusUpdate } from '@/types/invoice'
import type { CompanySettings, UpdateCompanySettingsDto } from '@/types/settings'

const OSRM_API = '/osrm'

export interface OsrmRouteResponse {
  distance: number
  duration: number
  geometry: { coordinates: [number, number][] }
}

export const osrmApi = {
  route: async (originLng: number, originLat: number, destLng: number, destLat: number): Promise<OsrmRouteResponse> => {
    const url = `${OSRM_API}/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson`
    const res = await fetch(url)
    const data = await res.json()
    if (!data.routes?.length) {
      throw new Error(data.message || 'No route found')
    }
    return {
      distance: data.routes[0].distance,
      duration: data.routes[0].duration,
      geometry: data.routes[0].geometry,
    }
  },
}

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
  totalLimitRub?: number
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
  orderId?: string;
  number: string;
  amount?: number;
  amountRub?: number;
  vatRate?: number;
  vatAmount?: number;
  status: number | string;
  dueDate?: string;
  paidAt?: string;
  counterpartyId?: string;
  counterpartyName?: string;
  contractId?: string;
  description?: string;
  createdAt?: string;
  version?: number;
}

const parseDate = (dateStr: string): number | undefined => {
  if (!dateStr) return undefined;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? undefined : Math.floor(d.getTime() / 1000);
}

const mapInvoice = (inv: InvoiceResponse): Invoice => {
  const statusVal = typeof inv.status === 'number' ? inv.status : parseInt(String(inv.status), 10) || 0;
  return {
    id: inv.id,
    orderId: inv.orderId,
    number: inv.number,
    counterpartyId: inv.counterpartyId,
    counterpartyName: inv.counterpartyName,
    amount: Number(inv.amount ?? inv.amountRub) || 0,
    vatRate: Number(inv.vatRate) || 0,
    vatAmount: Number(inv.vatAmount) || 0,
    status: statusVal as Invoice['status'],
    dueDateUnix: parseDate(inv.dueDate),
    paidAtUnix: parseDate(inv.paidAt) || undefined,
    createdAtUnix: parseDate(inv.createdAt) || Math.floor(Date.now() / 1000),
  };
}

export const invoicesApi = {
  list: (params?: { page?: number; limit?: number; status?: string; counterpartyId?: string }) => {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.limit) searchParams.set('limit', String(params.limit))
    if (params?.status) searchParams.set('status', params.status)
    if (params?.counterpartyId) searchParams.set('counterpartyId', params.counterpartyId)
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