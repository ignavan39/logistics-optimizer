import { type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  if (!isOpen) return null

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className={cn(
          'relative bg-surface border border-border rounded-xl p-6 w-full mx-4',
          sizeClasses[size]
        )}
        onClick={(e) => { e.stopPropagation(); }}
      >
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-text-primary">{title}</h2>
            <button onClick={onClose} className="p-1 hover:bg-surface-hover rounded transition-colors">
              <X className="w-5 h-5 text-text-muted" />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}