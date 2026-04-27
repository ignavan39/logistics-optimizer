export interface Invoice {
  id: string
  number: string
  counterpartyId: string
  counterpartyName?: string
  amount: number
  status: InvoiceStatus
  createdAtUnix: number
}

export type InvoiceStatus = 0 | 1 | 2 | 3 | 4

export type InvoiceStatusUpdate = {
  status: InvoiceStatus
}

export type InvoiceStatusString = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled'

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = { 0: 'Черновик', 1: 'Отправлен', 2: 'Оплачен', 3: 'Просрочен', 4: 'Отменен' }
export const INVOICE_STATUS_COLORS: Record<InvoiceStatus, 'muted' | 'lavender' | 'success' | 'warning' | 'error'> = { 0: 'muted', 1: 'lavender', 2: 'success', 3: 'warning', 4: 'error' }