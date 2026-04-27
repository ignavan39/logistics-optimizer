import { CheckCircle, XCircle, Info, X } from 'lucide-react'
import { useToastStore, type ToastType } from '@/lib/toast'
import { cn } from '@/lib/utils'

const iconMap: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
}

const colorMap: Record<ToastType, string> = {
  success: 'bg-status-success/10 text-status-success border-status-success/30',
  error: 'bg-status-error/10 text-status-error border-status-error/30',
  info: 'bg-accent-lavender/10 text-accent-lavender border-accent-lavender/30',
}

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => {
        const Icon = iconMap[toast.type]
        return (
          <div
            key={toast.id}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg min-w-64 max-w-96',
              colorMap[toast.type]
            )}
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            <div className="flex-1 text-sm">{toast.message}</div>
            <button
              onClick={() => { removeToast(toast.id); }}
              className="p-1 hover:bg-black/10 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}