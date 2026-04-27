import { type InputHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, type = 'text', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm text-text-secondary mb-1">{label}</label>
        )}
        <input
          ref={ref}
          type={type}
          className={cn(
            'w-full px-4 py-2 bg-background border border-border rounded-lg',
            'text-text-primary placeholder-text-muted',
            'focus:outline-none focus:border-accent-lavender',
            'transition-colors duration-200',
            error && 'border-status-error focus:border-status-error',
            className
          )}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-status-error">{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'