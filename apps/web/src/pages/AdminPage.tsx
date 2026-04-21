import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch, getAuthHeader } from '@/lib/auth'
import { Users, Shield, Key, Plus, Loader2, Trash2 } from 'lucide-react'

interface User {
  userId: string
  email: string
  type: string
  roles: string[]
  permissions: string[]
}

interface Role {
  id: string
  name: string
  permissions: string[]
  userCount: number
}

interface Permission {
  id: string
  name: string
  description: string
}

type Tab = 'users' | 'roles' | 'permissions'

function UsersTab() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery<{ users: User[] }>({
    queryKey: ['admin-users'],
    queryFn: () => apiFetch('/admin/users', { headers: getAuthHeader() }),
  })

  const deleteMutation = useMutation({
    mutationFn: (userId: string) =>
      fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', ...getAuthHeader() },
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  })

  if (isLoading) return <Loader2 className="w-6 h-6 animate-spin text-accent-lavender" />

  return (
    <div className="bg-surface rounded-xl border border-border overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left p-4 text-text-secondary font-medium">Email</th>
            <th className="text-left p-4 text-text-secondary font-medium">Тип</th>
            <th className="text-left p-4 text-text-secondary font-medium">Роли</th>
            <th className="text-left p-4 text-text-secondary font-medium">Permissions</th>
            <th className="p-4"></th>
          </tr>
        </thead>
        <tbody>
          {data?.users.map((user) => (
            <tr key={user.userId} className="border-b border-border hover:bg-surface-hover">
              <td className="p-4 text-text-primary">{user.email}</td>
              <td className="p-4 text-text-secondary">{user.type}</td>
              <td className="p-4">
                <div className="flex flex-wrap gap-1">
                  {user.roles.map((role) => (
                    <span key={role} className="px-2 py-0.5 bg-accent-lilac/20 text-accent-lilac text-xs rounded">
                      {role}
                    </span>
                  ))}
                </div>
              </td>
              <td className="p-4">
                <div className="flex flex-wrap gap-1 max-w-xs">
                  {user.permissions.slice(0, 3).map((p) => (
                    <span key={p} className="px-2 py-0.5 bg-accent-mint/20 text-accent-mint text-xs rounded">
                      {p}
                    </span>
                  ))}
                  {user.permissions.length > 3 && (
                    <span className="text-text-muted text-xs">+{user.permissions.length - 3}</span>
                  )}
                </div>
              </td>
              <td className="p-4">
                <button
                  onClick={() => deleteMutation.mutate(user.userId)}
                  className="p-2 text-status-error hover:bg-status-error/10 rounded transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function RolesTab() {
  const { data, isLoading } = useQuery<{ roles: Role[] }>({
    queryKey: ['roles'],
    queryFn: () => apiFetch('/roles', { headers: getAuthHeader() }),
  })

  if (isLoading) return <Loader2 className="w-6 h-6 animate-spin text-accent-lavender" />

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button className="flex items-center gap-2 px-3 py-2 bg-accent-lavender text-background rounded-lg text-sm font-medium hover:opacity-90">
          <Plus className="w-4 h-4" />
          Создать роль
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {data?.roles.map((role) => (
          <div key={role.id} className="bg-surface rounded-xl border border-border p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-text-primary">{role.name}</h3>
              <span className="text-text-muted text-sm">{role.userCount} чел.</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {role.permissions.map((p) => (
                <span key={p} className="px-2 py-0.5 bg-accent-mint/20 text-accent-mint text-xs rounded">
                  {p}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PermissionsTab() {
  const { data, isLoading } = useQuery<{ permissions: Permission[] }>({
    queryKey: ['permissions'],
    queryFn: () => apiFetch('/permissions', { headers: getAuthHeader() }),
  })

  if (isLoading) return <Loader2 className="w-6 h-6 animate-spin text-accent-lavender" />

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
          {data?.permissions.map((perm) => (
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

export function AdminPage() {
  const [tab, setTab] = useState<Tab>('users')

  const tabs = [
    { id: 'users' as Tab, label: 'Пользователи', icon: Users },
    { id: 'roles' as Tab, label: 'Роли', icon: Shield },
    { id: 'permissions' as Tab, label: 'Права', icon: Key },
  ]

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-text-primary mb-6">Администрирование</h1>

      <div className="flex gap-2 mb-6 border-b border-border">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 -mb-px border-b-2 transition-colors ${
              tab === id
                ? 'border-accent-lavender text-accent-lavender'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'users' && <UsersTab />}
      {tab === 'roles' && <RolesTab />}
      {tab === 'permissions' && <PermissionsTab />}
    </div>
  )
}