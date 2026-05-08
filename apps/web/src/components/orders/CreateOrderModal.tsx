import { useState } from 'react'
import { X, AlertCircle, RotateCcw } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { apiPost } from '@/lib/api'
import { useQueryClient } from '@tanstack/react-query'
import { PointSelectorMap, type Point } from '@/components/map/PointSelectorMap'
import type { CreateOrderDto, Order } from '@/types'

interface CreateOrderModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CreateOrderModal({ isOpen, onClose }: CreateOrderModalProps) {
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mapMode, setMapMode] = useState<'origin' | 'destination'>('origin')
  const [origin, setOrigin] = useState<Point | null>(null)
  const [destination, setDestination] = useState<Point | null>(null)

  const [form, setForm] = useState({
    cargoName: '',
    cargoQuantity: '1',
    priority: 'normal' as 'normal' | 'urgent',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!origin || !destination) {
      setError('Выберите откуда и куда на карте')
      return
    }

    setLoading(true)

    try {
      const dto: CreateOrderDto = {
        origin: {
          address: origin.address,
          lat: origin.lat,
          lng: origin.lng,
        },
        destination: {
          address: destination.address,
          lat: destination.lat,
          lng: destination.lng,
        },
        priority: form.priority as 'normal' | 'urgent',
        cargo: {
          name: form.cargoName,
          quantity: Number(form.cargoQuantity) || 1,
          weightKg: 0,
          volumeM3: 0,
          valueRub: 0,
        },
      }

      await apiPost<Order>('/orders', dto)
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      onClose()
      setForm({ cargoName: '', cargoQuantity: '1', priority: 'normal' })
      setOrigin(null)
      setDestination(null)
      setMapMode('origin')
    } catch (err: any) {
      setError(err.message || 'Ошибка создания заказа')
    } finally {
      setLoading(false)
    }
  }

  const handleOriginSelect = (point: Point) => {
    setOrigin(point)
    setMapMode('destination')
  }

  const handleDestinationSelect = (point: Point) => {
    setDestination(point)
    setMapMode('origin')
  }

  const handleClearAll = () => {
    setOrigin(null)
    setDestination(null)
    setMapMode('origin')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-surface rounded-xl border border-border w-full max-w-2xl max-h-[95vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-surface z-10">
          <h2 className="text-lg font-semibold text-text-primary">Создать заказ</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-surface-hover rounded-lg">
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-status-error/10 border border-status-error rounded-lg text-status-error text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-text-muted mb-2">Приоритет</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, priority: 'normal' })}
                  className={`flex-1 py-2 rounded-lg border text-sm transition-colors ${
                    form.priority === 'normal'
                      ? 'bg-accent-lavender/10 border-accent-lavender text-accent-lavender'
                      : 'border-border text-text-secondary hover:border-accent-lavender'
                  }`}
                >
                  Обычный
                </button>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, priority: 'urgent' })}
                  className={`flex-1 py-2 rounded-lg border text-sm transition-colors ${
                    form.priority === 'urgent'
                      ? 'bg-status-error/10 border-status-error text-status-error'
                      : 'border-border text-text-secondary hover:border-status-error'
                  }`}
                >
                  Срочный
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm text-text-muted mb-2">Груз</label>
              <div className="flex gap-2">
                <Input
                  placeholder="Название"
                  value={form.cargoName}
                  onChange={(e) => setForm({ ...form, cargoName: e.target.value })}
                  className="flex-1"
                />
                <Input
                  placeholder="Кол-во"
                  type="number"
                  value={form.cargoQuantity}
                  onChange={(e) => setForm({ ...form, cargoQuantity: e.target.value })}
                  className="w-20"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-text-primary">Маршрут</h3>
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Откуда
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  Куда
                </span>
              </div>
            </div>

            <PointSelectorMap
              origin={origin}
              destination={destination}
              onOriginSelect={handleOriginSelect}
              onDestinationSelect={handleDestinationSelect}
              mode={mapMode}
              onModeChange={setMapMode}
              onClear={handleClearAll}
            />
          </div>

          {(origin || destination) && (
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <button
                type="button"
                onClick={handleClearAll}
                className="flex items-center gap-1 px-2 py-1 hover:bg-surface-hover rounded"
              >
                <RotateCcw className="w-3 h-3" />
                Очистить точки
              </button>
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t border-border">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={loading || !origin || !destination}
              className="flex-1"
            >
              {loading ? 'Создание...' : 'Создать заказ'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}