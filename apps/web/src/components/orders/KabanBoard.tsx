import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  rectIntersection,
  DragOverlay,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { KabanColumn } from './KabanColumn'
import { OrderCardCompact } from './OrderCardCompact'
import { Order, type OrderStatus, type OrderStatusInfo } from '@/types'
import { VALID_TRANSITIONS } from '@/lib/order-transitions'

interface KabanBoardProps {
  orders: Order[]
  selectedId: string | null
  onOrderClick: (id: string) => void
  onStatusChange: (orderId: string, status: OrderStatus) => void
  onDragStart: (orderId: string | null) => void
  onDragEnd: () => void
  draggingOrderId: string | null
  statuses?: OrderStatusInfo[]
}

export function KabanBoard({
  orders,
  selectedId,
  onOrderClick,
  onStatusChange,
  onDragStart,
  onDragEnd,
  draggingOrderId,
  statuses = [],
}: KabanBoardProps) {
  const defaultStatuses: OrderStatus[] = ['pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'failed', 'cancelled']
  const statusValues = statuses.length ? statuses.map(s => s.value) : defaultStatuses

  const draggingOrder = draggingOrderId ? orders.find(o => o.id === draggingOrderId) : null
  const validNextStatuses = draggingOrder ? VALID_TRANSITIONS[draggingOrder.status as OrderStatus] : []

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const getOrdersByStatus = (status: OrderStatus) => {
    return orders.filter(o => o.status === status)
  }

  const handleDragStart = (event: DragStartEvent) => {
    onDragStart(event.active.id as string)
  }

  const handleDragOver = (_event: DragOverEvent) => {
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    onDragEnd()

    if (!over) return

    const orderId = active.id as string
    const overId = over.id as string

    let newStatus: OrderStatus | null = null

    if (String(overId).startsWith('column-')) {
      newStatus = String(overId).replace('column-', '') as OrderStatus
    } else {
      const targetOrder = orders.find(o => o.id === overId)
      if (targetOrder) {
        newStatus = targetOrder.status
      }
    }

    const validStatuses: OrderStatus[] = ['pending', 'assigned', 'picked_up', 'in_transit', 'delivered', 'failed', 'cancelled']
    if (newStatus && validStatuses.includes(newStatus)) {
      onStatusChange(orderId, newStatus)
    }
  }

  const activeOrder = draggingOrderId ? orders.find(o => o.id === draggingOrderId) : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4">
        {statusValues.map((status) => {
          const isDropDisabled = draggingOrderId && !validNextStatuses.includes(status)
          return (
            <KabanColumn
              key={status}
              status={status}
              orders={getOrdersByStatus(status)}
              selectedId={selectedId}
              onOrderClick={onOrderClick}
              onStatusChange={onStatusChange}
              statuses={statuses}
              isDropDisabled={isDropDisabled}
            />
          )
        })}
      </div>
      <DragOverlay>
        {activeOrder ? (
          <OrderCardCompact
            order={activeOrder}
            isSelected={false}
            onClick={() => {}}
            onStatusChange={() => {}}
            statuses={statuses}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}