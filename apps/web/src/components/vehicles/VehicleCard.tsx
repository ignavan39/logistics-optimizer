import { Truck } from 'lucide-react'
import { Badge } from '@/components/ui'
import { VEHICLE_TYPE_LABELS, VEHICLE_STATUS_LABELS } from '@/types/vehicle'
import { VEHICLE_STATUS_COLORS } from '@/lib/status'
import type { Vehicle } from '@/types'

interface VehicleCardProps {
  vehicle: Vehicle
  onClick: () => void
}

export function VehicleCard({ vehicle, onClick }: VehicleCardProps) {
  return (
    <button
      onClick={onClick}
      className="bg-surface rounded-xl border border-border p-4 hover:bg-surface-hover text-left"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-accent-lavender/10 flex items-center justify-center">
            <Truck className="w-5 h-5 text-accent-lavender" />
          </div>
          <div>
            <p className="font-medium text-text-primary">{vehicle.id.slice(0, 8)}</p>
            <p className="text-sm text-text-secondary">{VEHICLE_TYPE_LABELS[vehicle.type]}</p>
          </div>
        </div>
        <Badge
          label={VEHICLE_STATUS_LABELS[vehicle.status]}
          color={VEHICLE_STATUS_COLORS[vehicle.status]}
        />
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-text-muted">Грузоподъёмность</p>
          <p className="text-text-primary">{vehicle.capacityKg} кг</p>
        </div>
        <div>
          <p className="text-text-muted">Объём</p>
          <p className="text-text-primary">{vehicle.capacityM3} м³</p>
        </div>
      </div>
    </button>
  )
}
