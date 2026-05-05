import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Save, Lock, Key, Plus, Trash2, Users, Shield, FileText, X, Mail, User, Loader2 } from 'lucide-react'
import { Button, PageLoader, Input, Badge, Modal } from '@/components/ui'
import { settingsApi } from '@/lib/api.clients'
import { useAuthStore } from '@/lib/auth'
import { apiGet, apiPost } from '@/lib/api'
import { apiFetchWithAuth as apiFetch } from '@/lib/auth'
import { AuditLogsResponse } from '@/types'

type SettingsTab = 'company' | 'security' | 'api-keys' | 'users' | 'roles' | 'permissions' | 'audit'

interface ApiKey {
  id: string
  name: string
  key: string
  createdAtUnix: number
  expiresAtUnix?: number
}

interface AdminUser {
  id: string
  email: string
  first_name?: string
  last_name?: string
  is_active: boolean
  is_verified: boolean
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

interface UserFormData {
  email: string
  password: string
  firstName: string
  lastName: string
}

export function SettingsPage() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const hasPermission = user?.permissions?.length || user?.type === 'admin'
  const [activeTab, setActiveTab] = useState<SettingsTab>('company')

  // Company settings form
  const [form, setForm] = useState({
    companyName: '',
    companyInn: '',
    companyKpp: '',
    companyAddress: '',
    companyPhone: '',
    companyEmail: '',
    defaultPaymentTermsDays: 30,
    defaultVatRate: 20,
  })

  // Password change form
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  // API keys form
  const [showCreateKey, setShowCreateKey] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['settings', 'company'],
    queryFn: () => settingsApi.getCompany(),
    retry: 1,
  })

  const { data: apiKeys } = useQuery({
    queryKey: ['api-keys'],
    queryFn: () => apiGet<any[]>('/auth/api-keys').catch(() => []),
    enabled: activeTab === 'api-keys',
  })

  useEffect(() => {
    if (data) {
      setForm({
        companyName: data.companyName || '',
        companyInn: data.companyInn || '',
        companyKpp: data.companyKpp || '',
        companyAddress: data.companyAddress || '',
        companyPhone: data.companyPhone || '',
        companyEmail: data.companyEmail || '',
        defaultPaymentTermsDays: data.defaultPaymentTermsDays || 30,
        defaultVatRate: data.defaultVatRate || 20,
      })
    }
  }, [data])

  const updateMutation = useMutation({
    mutationFn: () => settingsApi.updateCompany(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', 'company'] })
    },
  })

  const changePasswordMutation = useMutation({
    mutationFn: (dto: { currentPassword: string; newPassword: string }) =>
      apiPost('/auth/change-password', dto),
    onSuccess: () => {
      setPasswordSuccess(true)
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setTimeout(() => setPasswordSuccess(false), 3000)
    },
    onError: (err: Error) => {
      setPasswordError(err.message)
    },
  })

  const createApiKeyMutation = useMutation({
    mutationFn: (name: string) =>
      apiPost<ApiKey>('/auth/api-keys', { name, type: 'permanent' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
      setShowCreateKey(false)
      setNewKeyName('')
    },
  })

  const deleteApiKeyMutation = useMutation({
    mutationFn: (id: string) =>
      apiPost(`/auth/api-keys/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['api-keys'] }),
  })

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Пароли не совпадают')
      return
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordError('Пароль должен быть не менее 6 символов')
      return
    }
    changePasswordMutation.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    })
  }

  const handleCreateKey = () => {
    if (!newKeyName.trim()) return
    createApiKeyMutation.mutate(newKeyName)
  }

  if (isLoading) return <PageLoader />

  const tabs: { id: SettingsTab; label: string; icon?: React.ElementType }[] = [
    { id: 'company', label: 'Компания' },
    { id: 'security', label: 'Безопасность' },
    { id: 'api-keys', label: 'API ключи' },
    ...(hasPermission ? [
      { id: 'users', label: 'Пользователи', icon: Users },
      { id: 'roles', label: 'Роли', icon: Shield },
      { id: 'permissions', label: 'Права', icon: Key },
      { id: 'audit', label: 'Аудит', icon: FileText },
    ] as const : []),
  ]

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Настройки</h1>
      </div>

      <div className="flex gap-2 mb-6 border-b border-border">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 -mb-px border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-accent-lavender text-accent-lavender'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab.icon && <tab.icon className="w-4 h-4" />}
            {tab.label}
          </button>
        ))}
      </div>

       {/* Company Tab */}
       {activeTab === 'company' && (
         <div className="max-w-2xl">
           {!hasPermission && (
             <div className="border border-border rounded-lg p-4 mb-4">
               <div className="flex items-center gap-3 text-status-warning text-sm">
                 <Lock className="w-4 h-4" />
                 <span>У вас нет права на изменение настроек компании. Данные доступны только для чтения.</span>
               </div>
             </div>
           )}
           <div className="border border-border rounded-lg p-6 space-y-6">
             <div className="grid grid-cols-2 gap-4">
               <Input
                 label="Название компании"
                 value={form.companyName}
                 onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))}
                 placeholder="ООО «Логистика»"
                 disabled={!hasPermission}
               />
               <Input
                 label="ИНН"
                 value={form.companyInn}
                 onChange={e => setForm(f => ({ ...f, companyInn: e.target.value }))}
                 placeholder="1234567890"
                 disabled={!hasPermission}
               />
               <Input
                 label="КПП"
                 value={form.companyKpp}
                 onChange={e => setForm(f => ({ ...f, companyKpp: e.target.value }))}
                 placeholder="123456789"
                 disabled={!hasPermission}
               />
               <Input
                 label="Телефон"
                 value={form.companyPhone}
                 onChange={e => setForm(f => ({ ...f, companyPhone: e.target.value }))}
                 placeholder="+7 (495) 123-45-67"
                 disabled={!hasPermission}
               />
               <Input
                 label="Email"
                 type="email"
                 value={form.companyEmail}
                 onChange={e => setForm(f => ({ ...f, companyEmail: e.target.value }))}
                 placeholder="info@company.ru"
                 disabled={!hasPermission}
               />
               <Input
                 label="Адрес"
                 value={form.companyAddress}
                 onChange={e => setForm(f => ({ ...f, companyAddress: e.target.value }))}
                 placeholder="г. Москва, ул. Примерная, 1"
                 disabled={!hasPermission}
               />
               <Input
                 label="Срок оплаты (дней)"
                 type="number"
                 value={form.defaultPaymentTermsDays}
                 onChange={e => setForm(f => ({ ...f, defaultPaymentTermsDays: parseInt(e.target.value) || 0 }))}
                 disabled={!hasPermission}
               />
               <Input
                 label="НДС (%)"
                 type="number"
                 value={form.defaultVatRate}
                 onChange={e => setForm(f => ({ ...f, defaultVatRate: parseInt(e.target.value) || 0 }))}
                 disabled={!hasPermission}
               />
             </div>
             {hasPermission && (
               <div className="flex justify-end pt-2">
                 <Button
                   onClick={() => updateMutation.mutate()}
                   disabled={updateMutation.isPending}
                 >
                   <Save className="w-4 h-4 mr-2" />
                   {updateMutation.isPending ? 'Сохранение...' : 'Сохранить'}
                 </Button>
               </div>
             )}
           </div>
         </div>
       )}

      {/* Security Tab - Password */}
      {activeTab === 'security' && (
        <div className="max-w-2xl">
          <div className="border border-border rounded-lg p-6 space-y-4">
            <h3 className="font-medium text-text-primary">Смена пароля</h3>
            
            {passwordSuccess && (
              <div className="p-3 bg-status-success/10 border border-status-success rounded-lg text-status-success text-sm">
                Пароль успешно изменён
              </div>
            )}

            {passwordError && (
              <div className="p-3 bg-status-error/10 border border-status-error rounded-lg text-status-error text-sm">
                {passwordError}
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <Input
                label="Текущий пароль"
                type="password"
                value={passwordForm.currentPassword}
                onChange={e => setPasswordForm(f => ({ ...f, currentPassword: e.target.value }))}
                required
              />
              <Input
                label="Новый пароль"
                type="password"
                value={passwordForm.newPassword}
                onChange={e => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))}
                required
              />
              <Input
                label="Подтвердите пароль"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={e => setPasswordForm(f => ({ ...f, confirmPassword: e.target.value }))}
                required
              />
              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={changePasswordMutation.isPending}>
                  {changePasswordMutation.isPending ? 'Сохранение...' : 'Изменить пароль'}
                </Button>
              </div>
            </form>

            <div className="pt-6 mt-6 border-t border-border">
              <h3 className="font-medium text-text-primary mb-4">Выход из системы</h3>
              <Button variant="secondary" onClick={() => logout()}>
                Выйти из всех сессий
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* API Keys Tab */}
      {activeTab === 'api-keys' && (
        <div className="max-w-2xl">
          <div className="border border-border rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-text-primary">API ключи</h3>
              <Button size="sm" onClick={() => setShowCreateKey(true)}>
                <Plus className="w-4 h-4 mr-1" />Создать ключ
              </Button>
            </div>

            <p className="text-sm text-text-muted">
              API ключи используются для доступа к системе без логина и пароля.
            </p>

            {!Array.isArray(apiKeys) || apiKeys.length === 0 ? (
              <p className="text-text-muted text-center py-4">Нет API ключей</p>
            ) : (
              <div className="space-y-2">
                {apiKeys.map(key => (
                  <div key={key.id} className="flex items-center justify-between p-3 bg-surface-hover rounded-lg">
                    <div>
                      <p className="font-medium text-text-primary">{key.name}</p>
                      <p className="text-sm text-text-muted font-mono">
                        ****{key.key.slice(-8)}
                      </p>
                      <p className="text-xs text-text-muted">
                        Создан: {new Date(key.createdAtUnix * 1000).toLocaleDateString('ru-RU')}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteApiKeyMutation.mutate(key.id)}
                      className="p-2 text-status-error hover:bg-status-error/10 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create API Key Modal */}
      <Modal isOpen={showCreateKey} onClose={() => { setShowCreateKey(false); setNewKeyName(''); }} title="Создать API ключ">
        <div className="space-y-4">
          <Input
            label="Название"
            value={newKeyName}
            onChange={e => setNewKeyName(e.target.value)}
            placeholder="Мой API ключ"
          />
          <p className="text-sm text-text-muted">
            Укажите название для идентификации ключа.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setShowCreateKey(false); setNewKeyName(''); }}>
              Отмена
            </Button>
            <Button onClick={handleCreateKey} disabled={!newKeyName.trim() || createApiKeyMutation.isPending}>
              {createApiKeyMutation.isPending ? 'Создание...' : 'Создать'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Users Tab (Admin) */}
      {activeTab === 'users' && <AdminUsersTab />}

      {/* Roles Tab (Admin) */}
      {activeTab === 'roles' && <AdminRolesTab />}

      {/* Permissions Tab (Admin) */}
      {activeTab === 'permissions' && <AdminPermissionsTab />}

      {/* Audit Tab (Admin) */}
      {activeTab === 'audit' && <AdminAuditTab />}
    </div>
  )
}

function AdminUsersTab() {
  const queryClient = useQueryClient()
  const [modalOpen, setModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<AdminUser | undefined>()

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

  const handleSave = (formData: UserFormData) => {
    createMutation.mutate(formData)
  }

  if (isLoading) return <Loader2 className="w-6 h-6 animate-spin text-accent-lavender" />

  const users = data?.users || []

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-3 py-2 bg-accent-lavender text-background rounded-lg text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          Добавить
        </button>
      </div>

      {modalOpen && (
        <UserModal onClose={() => { setModalOpen(false); setEditingUser(undefined); }} onSave={handleSave} />
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

function UserModal({
  onClose,
  onSave,
}: {
  user?: AdminUser
  onClose: () => void
  onSave: (data: UserFormData) => void
}) {
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

function AdminRolesTab() {
  const { data, isLoading } = useQuery<Role[]>({
    queryKey: ['roles'],
    queryFn: () => apiFetch('/roles'),
  })

  if (isLoading) return <Loader2 className="w-6 h-6 animate-spin text-accent-lavender" />

  const roles = data || []

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button className="flex items-center gap-2 px-3 py-2 bg-accent-lavender text-background rounded-lg text-sm font-medium">
          <Plus className="w-4 h-4" />
          Создать роль
        </button>
      </div>
      {roles.length === 0 ? (
        <div className="text-text-muted">Нет ролей</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {roles.map(role => {
            const rolePerms = role.rolePermissions?.map(rp => rp.permission?.name).filter(Boolean) as string[] || []
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
      )}
    </div>
  )
}

function AdminPermissionsTab() {
  const { data, isLoading } = useQuery<{ id: string; name: string; description?: string }[]>({
    queryKey: ['permissions'],
    queryFn: () => apiFetch('/permissions'),
  })

  if (isLoading) return <Loader2 className="w-6 h-6 animate-spin text-accent-lavender" />

  const perms = data || []

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

function AdminAuditTab() {
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ userId: '', action: '', resource: '', from: '', to: '' })

  const { data, isLoading } = useQuery<AuditLogsResponse>({
    queryKey: ['audit-logs', page, filters],
    queryFn: () => {
      const params = new URLSearchParams()
      params.append('limit', '20')
      params.append('offset', String((page - 1) * 20))
      if (filters.userId) params.append('userId', filters.userId)
      if (filters.action) params.append('action', filters.action)
      if (filters.resource) params.append('resource', filters.resource)
      if (filters.from) params.append('from', filters.from)
      if (filters.to) params.append('to', filters.to)
      return apiFetch(`/admin/audit-logs?${params.toString()}`)
    },
  })

  const logs = data?.logs || []
  const totalPages = data ? Math.ceil(data.total / 20) : 0

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-5 gap-4">
        <input
          type="text"
          placeholder="User ID"
          value={filters.userId}
          onChange={e => setFilters({ ...filters, userId: e.target.value })}
          className="px-3 py-2 bg-surface border border-border rounded-lg text-text-primary"
        />
        <input
          type="text"
          placeholder="Действие"
          value={filters.action}
          onChange={e => setFilters({ ...filters, action: e.target.value })}
          className="px-3 py-2 bg-surface border border-border rounded-lg text-text-primary"
        />
        <input
          type="text"
          placeholder="Ресурс"
          value={filters.resource}
          onChange={e => setFilters({ ...filters, resource: e.target.value })}
          className="px-3 py-2 bg-surface border border-border rounded-lg text-text-primary"
        />
        <input
          type="date"
          value={filters.from}
          onChange={e => setFilters({ ...filters, from: e.target.value })}
          className="px-3 py-2 bg-surface border border-border rounded-lg text-text-primary"
        />
        <input
          type="date"
          value={filters.to}
          onChange={e => setFilters({ ...filters, to: e.target.value })}
          className="px-3 py-2 bg-surface border border-border rounded-lg text-text-primary"
        />
      </div>

      {isLoading ? (
        <Loader2 className="w-6 h-6 animate-spin text-accent-lavender" />
      ) : logs.length === 0 ? (
        <div className="text-text-muted text-center py-8">Нет записей</div>
      ) : (
        <div className="bg-surface rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-3 text-text-secondary font-medium text-sm">Время</th>
                <th className="text-left p-3 text-text-secondary font-medium text-sm">Пользователь</th>
                <th className="text-left p-3 text-text-secondary font-medium text-sm">Действие</th>
                <th className="text-left p-3 text-text-secondary font-medium text-sm">Ресурс</th>
                <th className="text-left p-3 text-text-secondary font-medium text-sm">ID</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} className="border-b border-border hover:bg-surface-hover">
                  <td className="p-3 text-text-primary text-sm">
                    {new Date(log.createdAt).toLocaleString('ru-RU')}
                  </td>
                  <td className="p-3 text-text-secondary text-sm">{log.userId?.slice(0, 8) || '-'}</td>
                  <td className="p-3 text-text-primary text-sm">{log.action}</td>
                  <td className="p-3 text-text-secondary text-sm">{log.resource}</td>
                  <td className="p-3 text-text-muted text-sm font-mono">{log.resourceId?.slice(0, 8) || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-text-muted">Страница {page} из {totalPages}</div>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => p - 1)} disabled={page <= 1} className="px-3 py-1 border border-border rounded text-sm disabled:opacity-50">
              Назад
            </button>
            <button onClick={() => setPage(p => p + 1)} disabled={page >= totalPages} className="px-3 py-1 border border-border rounded text-sm disabled:opacity-50">
              Вперёд
            </button>
          </div>
        </div>
      )}
    </div>
  )
}