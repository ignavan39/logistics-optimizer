import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, X, Mail, Lock, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui'
import { apiFetchWithAuth as apiFetch } from '@/lib/auth'

interface AdminUser {
  id: string
  email: string
  first_name?: string
  last_name?: string
  is_active: boolean
  is_verified: boolean
}

interface UserFormData {
  email: string
  password: string
  firstName: string
  lastName: string
}

export function UsersTab() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)

  const { data, isLoading } = useQuery<{ users: AdminUser[] }>({
    queryKey: ['admin-users'],
    queryFn: () => apiFetch('/admin/users'),
    retry: 1,
  })

  const deleteMutation = useMutation({
    mutationFn: (userId: string) =>
      apiFetch(`/admin/users/${userId}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  })

  const createMutation = useMutation({
    mutationFn: (data: UserFormData) =>
      apiFetch('/admin/users', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] })
      setModalOpen(false)
    },
  })

  if (isLoading) return <Loader2 className="w-6 h-6 animate-spin text-accent-lavender" />

  const users = data?.users ?? []

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Добавить
        </Button>
      </div>

      {modalOpen && (
        <UserModal
          onClose={() => setModalOpen(false)}
          onSave={(formData) => createMutation.mutate(formData)}
        />
      )}

      {users.length === 0 ? (
        <div className="text-text-muted">Нет пользователей</div>
      ) : (
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-4 text-text-secondary font-medium">Email</th>
                <th className="text-left p-4 text-text-secondary font-medium">Имя</th>
                <th className="text-left p-4 text-text-secondary font-medium">Статус</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} className="border-b border-border hover:bg-surface-hover">
                  <td className="p-4 text-text-primary">{user.email}</td>
                  <td className="p-4 text-text-secondary">
                    {[user.first_name, user.last_name].filter(Boolean).join(' ') || '-'}
                  </td>
                  <td className="p-4">
                    <span className={`text-xs px-2 py-1 rounded ${user.is_active ? 'bg-status-success/20 text-status-success' : 'bg-status-error/20 text-status-error'}`}>
                      {user.is_active ? 'Активен' : 'Заблокирован'}
                    </span>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => deleteMutation.mutate(user.id)}
                      className="p-2 text-status-error hover:bg-status-error/10 rounded"
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

interface UserModalProps {
  onClose: () => void
  onSave: (data: UserFormData) => void
}

export function UserModal({ onClose, onSave }: UserModalProps) {
  const [formData, setFormData] = useState<UserFormData>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      onSave(formData)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-surface rounded-xl border border-border w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-text-primary">Добавить пользователя</h2>
          <button onClick={onClose} className="p-1 hover:bg-surface-hover rounded">
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-text-secondary mb-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-text-primary"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-1">Пароль</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                type="password"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-text-primary"
                required
                minLength={8}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-text-secondary mb-1">Имя</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text-primary"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-text-secondary mb-1">Фамилия</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text-primary"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2 border border-border rounded-lg text-text-secondary">
              Отмена
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-2 bg-accent-lavender text-background rounded-lg font-medium">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Сохранить'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
