import { useState } from 'react'
import { X, MapPin, Package, Clock, AlertCircle } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { apiPost } from '@/lib/api'
import { useQueryClient } from '@tanstack/react-query'
import type { CreateOrderDto, Order } from '@/types'

interface CreateOrderModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CreateOrderModal({ isOpen, onClose }: CreateOrderModalProps) {
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    originAddress: '',
    originLat: '',
    originLng: '',
    destinationAddress: '',
    destinationLat: '',
    destinationLng: '',
    cargoName: '',
    cargoQuantity: '1',
    priority: 'normal' as 'normal' | 'urgent',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const dto: CreateOrderDto = {
        origin: {
          address: form.originAddress,
          lat: Number(form.originLat) || 0,
          lng: Number(form.originLng) || 0,
        },
        destination: {
          address: form.destinationAddress,
          lat: Number(form.destinationLat) || 0,
          lng: Number(form.destinationLng) || 0,
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
      setForm({
        originAddress: '',
        originLat: '',
        originLng: '',
        destinationAddress: '',
        destinationLat: '',
        destinationLng: '',
        cargoName: '',
        cargoQuantity: '1',
        priority: 'normal',
      })
    } catch (err: any) {
      setError(err.message || 'Ошибка создания')
    } finally {
      setLoading(false)
    }
  }

  const swapAddresses = () => {
    setForm(prev => ({
      originAddress: prev.destinationAddress,
      originLat: prev.destinationLat,
      originLng: prev.destinationLng,
      destinationAddress: prev.originAddress,
      destinationLat: prev.originLat,
      destinationLng: prev.originLng,
      cargoName: prev.cargoName,
      cargoQuantity: prev.cargoQuantity,
      priority: prev.priority,
    }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-surface rounded-xl border border-border w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-text-primary">Создать заказ</h2>
          <button onClick={onClose} className="p-1 hover:bg-surface-hover rounded">
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-status-error/10 border border-status-error rounded-lg text-status-error text-sm">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          {/* Priority */}
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

          {/* Origin */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-accent-lavender" />
              <span className="text-sm font-medium text-text-primary">Откуда</span>
            </div>
            <Input
              label="Адрес"
              value={form.originAddress}
              onChange={(e) => setForm({ ...form, originAddress: e.target.value })}
              placeholder="Москва, ул. Примерная, 1"
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Широта"
                type="number"
                value={form.originLat}
                onChange={(e) => setForm({ ...form, originLat: e.target.value })}
                placeholder="55.7558"
              />
              <Input
                label="Долгота"
                type="number"
                value={form.originLng}
                onChange={(e) => setForm({ ...form, originLng: e.target.value })}
                placeholder="37.6173"
              />
            </div>
          </div>

          {/* Swap button */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={swapAddresses}
              className="p-2 hover:bg-surface-hover rounded-full transition-colors"
            >
              <Clock className="w-4 h-4 text-text-muted" />
            </button>
          </div>

          {/* Destination */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-status-success" />
              <span className="text-sm font-medium text-text-primary">Куда</span>
            </div>
            <Input
              label="Адрес"
              value={form.destinationAddress}
              onChange={(e) => setForm({ ...form, destinationAddress: e.target.value })}
              placeholder="Санкт-Петербург, Невский пр., 1"
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Широта"
                type="number"
                value={form.destinationLat}
                onChange={(e) => setForm({ ...form, destinationLat: e.target.value })}
                placeholder="59.9343"
              />
              <Input
                label="Долгота"
                type="number"
                value={form.destinationLng}
                onChange={(e) => setForm({ ...form, destinationLng: e.target.value })}
                placeholder="30.3351"
              />
            </div>
          </div>

          {/* Cargo */}
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-accent-sky" />
              <span className="text-sm font-medium text-text-primary">Груз</span>
            </div>
            <Input
              label="Название груза"
              value={form.cargoName}
              onChange={(e) => setForm({ ...form, cargoName: e.target.value })}
              placeholder="Коробки"
            />
            <Input
              label="Количество"
              type="number"
              value={form.cargoQuantity}
              onChange={(e) => setForm({ ...form, cargoQuantity: e.target.value })}
              placeholder="1"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
              Отмена
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Создание...' : 'Создать'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}