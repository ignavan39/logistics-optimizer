import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button, Modal, Input } from '@/components/ui'
import { vehiclesApi } from '@/lib/api.clients'
import { VEHICLE_TYPE_LABELS } from '@/types/vehicle'
import type { VehicleType } from '@/types/vehicle'

interface CreateVehicleModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CreateVehicleModal({ isOpen, onClose }: CreateVehicleModalProps) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState({
    type: 1 as VehicleType,
    licensePlate: '',
    model: '',
    capacityKg: 1000,
    capacityM3: 2,
  })

  const createMutation = useMutation({
    mutationFn: () => vehiclesApi.create(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] })
      onClose()
      setForm({ type: 1 as VehicleType, licensePlate: '', model: '', capacityKg: 1000, capacityM3: 2 })
    },
  })

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Добавить машину">
      <form
        onSubmit={(e) => { e.preventDefault(); createMutation.mutate() }}
        className="space-y-4"
      >
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">Тип ТС</label>
          <select
            className="w-full px-3 py-2 bg-surface-hover border border-border rounded-lg text-text-primary"
            value={form.type}
            onChange={e => setForm(f => ({ ...f, type: Number(e.target.value) as VehicleType }))}
            required
          >
            {Object.entries(VEHICLE_TYPE_LABELS).map(([key, label]) => (
              <option key={key} value={Number(key)}>{label}</option>
            ))}
          </select>
        </div>

        <Input
          label="Номерной знак"
          value={form.licensePlate}
          onChange={e => setForm(f => ({ ...f, licensePlate: e.target.value }))}
          placeholder="А123БВ77"
          required
        />

        <Input
          label="Модель (опционально)"
          value={form.model}
          onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
          placeholder="Volvo FH16"
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Грузоподъемность (кг)"
            type="number"
            value={form.capacityKg}
            onChange={e => setForm(f => ({ ...f, capacityKg: Number(e.target.value) }))}
            required
          />
          <Input
            label="Объем (м³)"
            type="number"
            value={form.capacityM3}
            onChange={e => setForm(f => ({ ...f, capacityM3: Number(e.target.value) }))}
            required
          />
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button type="submit" disabled={createMutation.isPending || !form.licensePlate}>
            {createMutation.isPending ? 'Создание...' : 'Создать'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
