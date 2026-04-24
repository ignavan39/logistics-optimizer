import { cn } from '@/lib/utils'

interface BadgeProps {
  label: string
  color?: 'lavender' | 'sky' | 'mint' | 'success' | 'warning' | 'error' | 'muted'
  className?: string
}

const colorMap = {
  lavender: 'bg-accent-lavender/20 text-accent-lavender',
  sky: 'bg-accent-sky/20 text-accent-sky',
  mint: 'bg-accent-mint/20 text-accent-mint',
  success: 'bg-status-success/20 text-status-success',
  warning: 'bg-status-warning/20 text-status-warning',
  error: 'bg-status-error/20 text-status-error',
  muted: 'bg-surface-hover text-text-muted',
}

export function Badge({ label, color = 'lavender', className }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-medium', colorMap[color], className)}>
      {label}
    </span>
  )
}