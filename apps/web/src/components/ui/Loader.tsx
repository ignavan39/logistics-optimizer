import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LoaderProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizeMap = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' }

export function Loader({ size = 'md', className }: LoaderProps) {
  return <Loader2 className={cn('animate-spin text-accent-lavender', sizeMap[size], className)} />
}

export function PageLoader() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader size="lg" />
    </div>
  )
}