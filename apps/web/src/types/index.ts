export interface CompanySettings {
  id: string
  name: string
  address?: string
  phone?: string
  email?: string
  director?: string
}

export * from './order'
export * from './vehicle'
export * from './dispatch'
export * from './invoice'
export * from './counterparty'