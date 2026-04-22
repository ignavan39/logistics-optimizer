import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetchWithAuth as apiFetch } from '@/lib/auth'
import { Users, Shield, Key, Plus, Loader2, Trash2, X, Mail, Lock, User } from 'lucide-react'

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
  description?: string
  rolePermissions?: Array<{ permission: Permission }>
  userCount?: number
}

interface Permission {
  id: string
  name: string
  description?: string
  resource?: string
}

type Tab = 'users' | 'roles' | 'permissions'

interface UserFormData {
  email: string
  password: string
  firstName: string
  lastName: string
}

function UserModal({
  user,
  onClose,
  onSave,
}: {
  user?: User
  onClose: () => void
  onSave: (data: UserFormData) => void
}) {
  const [formData, setFormData] = useState<UserFormData>({
    email: user?.email || '',
    password: '',
    firstName: '',
    lastName: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      onSave(formData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-surface rounded-xl border border-border w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-text-primary">
            {user ? 'Редактировать пользователя' : 'Добавить пользователя'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-surface-hover rounded">
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-status-error/10 border border-status-error rounded-lg text-status-error text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm text-text-secondary mb-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-lavender"
                placeholder="user@example.com"
                required
                disabled={!!user}
              />
            </div>
          </div>

          {!user && (
            <div>
              <label className="block text-sm text-text-secondary mb-1">Пароль</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-lavender"
                  placeholder="••••••••"
                  required={!user}
                  minLength={8}
                />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1">Имя</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-lavender"
                  placeholder="Иван"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">Фамилия</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-lavender"
                placeholder="Петров"
                required
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 border border-border rounded-lg text-text-secondary hover:bg-surface-hover transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 bg-accent-lavender text-background rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function UsersTab() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | undefined>()

  const { data, isLoading } = useQuery<{ users: { id: string; email: string; first_name?: string; last_name?: string; is_active: boolean; is_verified: boolean }[] }>({
    queryKey: ['admin-users'],
    queryFn: () => apiFetch('/auth/admin/users'),
    retry: 1,
  })

  const deleteMutation = useMutation({
    mutationFn: (userId: string) =>
      apiFetch(`/auth/admin/users/${userId}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
    onError: (err) => console.error('Delete error:', err),
  })

  const createMutation = useMutation({
    mutationFn: (data: UserFormData) =>
      apiFetch('/auth/admin/users', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onError: (error) => {
      console.error('Create user error:', error)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setModalOpen(false)
    },
  })

  const handleSave = (formData: UserFormData) => {
    if (editingUser) {
      // TODO: edit mutation
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleRowClick = (user: User) => {
    setEditingUser(user)
    setModalOpen(true)
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    setEditingUser(undefined)
  }

  if (isLoading) return <Loader2 className="w-6 h-6 animate-spin text-accent-lavender" />

  const users = data?.users?.map(u => ({
    userId: u.id,
    email: u.email,
    type: u.is_active ? 'active' : 'inactive',
    roles: [],
    permissions: [],
  })) || []

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-3 py-2 bg-accent-lavender text-background rounded-lg text-sm font-medium hover:opacity-90"
        >
          <Plus className="w-4 h-4" />
          Добавить пользователя
        </button>
      </div>

      {modalOpen && (
        <UserModal user={editingUser} onClose={handleCloseModal} onSave={handleSave} />
      )}

      {!users ? (
        <div className="text-text-secondary">Загрузка...</div>
      ) : users.length === 0 ? (
        <div className="text-text-secondary">Нет пользователей</div>
      ) : (
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
              {users.filter(u => u?.userId).map((user) => (
                <tr
                  key={user.userId}
                  className="border-b border-border hover:bg-surface-hover cursor-pointer"
                  onClick={() => handleRowClick(user)}
                >
                  <td className="p-4 text-text-primary">{user.email}</td>
                  <td className="p-4 text-text-secondary">{user.type || '-'}</td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      {(user.roles || []).map((role, i) => (
                        <span key={`${user.userId}-role-${i}`} className="px-2 py-0.5 bg-accent-lilac/20 text-accent-lilac text-xs rounded">
                          {role}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {(user.permissions || []).slice(0, 3).map((p, i) => (
                        <span key={`${user.userId}-perm-${i}`} className="px-2 py-0.5 bg-accent-sky/20 text-accent-sky text-xs rounded">
                          {p}
                        </span>
                      ))}
                      {(user.permissions?.length || 0) > 3 && (
                        <span className="text-text-muted text-xs">+{(user.permissions?.length || 0) - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteMutation.mutate(user.userId)
                      }}
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
      )}
    </div>
  )
}

function RolesTab() {
  const { data, isLoading } = useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: () => apiFetch('/roles'),
  })

  if (isLoading) return <Loader2 className="w-6 h-6 animate-spin text-accent-lavender" />

  const roles = data

  if (!roles) {
    return <div className="text-text-secondary">Нет данных о ролях</div>
  }

  if (roles.length === 0) {
    return <div className="text-text-secondary">Нет ролей</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button className="flex items-center gap-2 px-3 py-2 bg-accent-lavender text-background rounded-lg text-sm font-medium hover:opacity-90">
          <Plus className="w-4 h-4" />
          Создать роль
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {roles.map((role) => {
          const rolePerms = role.rolePermissions?.map(rp => rp.permission?.name).filter(Boolean) || []
          return (
            <div key={role.id} className="bg-surface rounded-xl border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-text-primary">{role.name}</h3>
                <span className="text-text-muted text-sm">{role.userCount || 0} чел.</span>
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
    </div>
  )
}

function PermissionsTab() {
  const { data, isLoading } = useQuery<{ id: string; name: string; description?: string }[]>({
    queryKey: ['permissions'],
    queryFn: () => apiFetch('/permissions'),
  })

  if (isLoading) return <Loader2 className="w-6 h-6 animate-spin text-accent-lavender" />

  const perms = data || []

  if (perms.length === 0) {
    return <div className="text-text-secondary">Нет прав</div>
  }

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
          {perms.map((perm) => (
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
{tabs.map(({ id, label, icon: Icon }, i) => (
                <button
                  key={id || i}
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