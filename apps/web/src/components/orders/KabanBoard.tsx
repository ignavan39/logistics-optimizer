import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core'
import { useState } from 'react'
import { KabanColumn } from './KabanColumn'
import { Order, type OrderStatus, type OrderStatusInfo } from '@/types'

interface KabanBoardProps {
  orders: Order[]
  selectedId: string | null
  onOrderClick: (id: string) => void
  onStatusChange: (orderId: string, status: OrderStatus) => void
  statuses?: OrderStatusInfo[]
}

export function KabanBoard({
  orders,
  selectedId,
  onOrderClick,
  onStatusChange,
  statuses = [],
}: KabanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null)

  const defaultStatuses: number[] = [1, 2, 3, 4, 5, 6, 7]
  const statusValues = statuses.length ? statuses.map(s => s.value) : defaultStatuses

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const getOrdersByStatus = (status: OrderStatus) => {
    return orders.filter(o => o.status === status)
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragOver = (event: DragOverEvent) => {
    // Handle drag over for visual feedback
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = event

    if (!over) return

    const orderId = active.id as string
    const overId = over.id as string

    // Check if dropped on a column
    if (overId.startsWith('column-')) {
      const newStatus = Number(overId.replace('column-', '')) as OrderStatus
      if (!isNaN(newStatus) && newStatus >= 1 && newStatus <= 7) {
        onStatusChange(orderId, newStatus)
      }
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {statusValues.map((status) => (
<KabanColumn
            key={status}
            status={status}
            orders={getOrdersByStatus(status)}
            selectedId={selectedId}
            onOrderClick={onOrderClick}
            onStatusChange={onStatusChange}
            statuses={statuses}
          />
        ))}
      </div>
    </DndContext>
  )
}