import { useQuery } from '@tanstack/react-query'
import { Plus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui'
import { apiFetchWithAuth as apiFetch } from '@/lib/auth'

interface Role {
  id: string
  name: string
  description?: string
  rolePermissions?: Array<{ permission: { name: string } }>
  userCount?: number
}

export function RolesTab() {
  const { data, isLoading } = useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: () => apiFetch('/roles'),
  })

  if (isLoading) return <Loader2 className="w-6 h-6 animate-spin text-accent-lavender" />

  const roles = data ?? []

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Создать роль
        </Button>
      </div>
      {roles.length === 0 ? (
        <div className="text-text-muted">Нет ролей</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {roles.map(role => {
            const rolePerms = role.rolePermissions
              ?.map(rp => rp.permission?.name)
              .filter(Boolean) as string[] || []
            return (
              <div key={role.id} className="bg-surface rounded-xl border border-border p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-medium text-text-primary">{role.name}</h3>
                  <span className="text-text-muted text-sm">{role.userCount ?? 0} чел.</span>
                </div>
                {role.description && (
                  <p className="text-text-secondary text-sm mb-2">{role.description}</p>
                )}
                <div className="flex flex-wrap gap-1">
                  {rolePerms.map((p, i) => (
                    <span key={p + i} className="px-2 py-0.5 bg-accent-sky/20 text-accent-sky text-xs rounded">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
