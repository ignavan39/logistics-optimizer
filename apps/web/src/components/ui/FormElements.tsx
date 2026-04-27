import { type ReactNode, forwardRef } from 'react'
import { cn } from '@/lib/utils'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm text-text-muted mb-1">{label}</label>
        )}
        <select
          ref={ref}
          className={cn(
            'w-full p-2 bg-surface border border-border rounded-lg text-text-primary',
            'focus:outline-none focus:ring-2 focus:ring-accent-lavender/50',
            error && 'border-status-error',
            className
          )}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-sm text-status-error mt-1">{error}</p>}
      </div>
    )
  }
)

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm text-text-muted mb-1">{label}</label>
        )}
        <textarea
          ref={ref}
          className={cn(
            'w-full p-2 bg-surface border border-border rounded-lg text-text-primary',
            'focus:outline-none focus:ring-2 focus:ring-accent-lavender/50',
            'resize-none',
            error && 'border-status-error',
            className
          )}
          {...props}
        />
        {error && <p className="text-sm text-status-error mt-1">{error}</p>}
      </div>
    )
  }
)

interface FormGroupProps {
  label?: string
  error?: string
  children: ReactNode
}

export function FormGroup({ label, error, children }: FormGroupProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm text-text-muted mb-1">{label}</label>
      )}
      {children}
      {error && <p className="text-sm text-status-error mt-1">{error}</p>}
    </div>
  )
}