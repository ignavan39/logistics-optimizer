export interface DispatchSaga {
  id: string
  orderId: string
  status: SagaStatus
  currentStep?: string
  steps: SagaStep[]
  createdAtUnix: number
  error?: string
}

export type SagaStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'

export interface SagaStep {
  name: string
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED'
  startedAtUnix?: number
  error?: string
}

export const SAGA_STATUS_LABELS: Record<SagaStatus, string> = {
  PENDING: 'Ожидает',
  RUNNING: 'Выполняется',
  COMPLETED: 'Завершена',
  FAILED: 'Ошибка',
  CANCELLED: 'Отменена',
}

export const SAGA_STATUS_COLORS: Record<SagaStatus, 'lavender' | 'sky' | 'success' | 'error' | 'muted'> = {
  PENDING: 'lavender',
  RUNNING: 'sky',
  COMPLETED: 'success',
  FAILED: 'error',
  CANCELLED: 'muted',
}