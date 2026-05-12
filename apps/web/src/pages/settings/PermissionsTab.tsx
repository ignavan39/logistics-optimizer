import { useQuery } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { apiFetchWithAuth as apiFetch } from '@/lib/auth'

interface Permission {
  id: string
  name: string
  description?: string
}

export function PermissionsTab() {
  const { data, isLoading } = useQuery<Permission[]>({
    queryKey: ['permissions'],
    queryFn: () => apiFetch('/permissions'),
  })

  if (isLoading) return <Loader2 className="w-6 h-6 animate-spin text-accent-lavender" />

  const perms = data ?? []

  return (
    <div className="bg-surface rounded-xl border border-border overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left p-4 text-text-secondary font-medium">Название</th>
            <th className="text-left p-4 text-text-secondary font-medium">Описание</th>
          </tr>
        </thead>
        <tbody>
          {perms.map(perm => (
            <tr key={perm.id} className="border-b border-border hover:bg-surface-hover">
              <td className="p-4 text-text-primary font-mono text-sm">{perm.name}</td>
              <td className="p-4 text-text-secondary">{perm.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
