import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Save, Lock, Key, Plus, Trash2 } from 'lucide-react'
import { Button, PageLoader, Input, Badge, Modal } from '@/components/ui'
import { settingsApi } from '@/lib/api.clients'
import { useAuthStore } from '@/lib/auth'
import { apiGet, apiPost } from '@/lib/api'

type SettingsTab = 'company' | 'security' | 'api-keys'

interface ApiKey {
  id: string
  name: string
  key: string
  createdAtUnix: number
  expiresAtUnix?: number
}

export function SettingsPage() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const hasPermission = user?.permissions?.includes('settings.manage') || user?.type === 'admin'
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

  const tabs = [
    { id: 'company' as SettingsTab, label: 'Компания' },
    { id: 'security' as SettingsTab, label: 'Безопасность' },
    { id: 'api-keys' as SettingsTab, label: 'API ключи' },
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
            className={`px-4 py-2 -mb-px border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-accent-lavender text-accent-lavender'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
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
    </div>
  )
}