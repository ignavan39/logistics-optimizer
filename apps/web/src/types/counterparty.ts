export interface Counterparty {
  id: string
  name: string
  type: 'CLIENT' | 'CARRIER' | 'BOTH'
  status: 'ACTIVE' | 'INACTIVE'
  contactEmail?: string
  contactPhone?: string
}