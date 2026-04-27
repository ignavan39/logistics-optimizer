import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Save, Lock } from 'lucide-react'
import { Button, PageLoader, Input } from '@/components/ui'
import { settingsApi } from '@/lib/api.clients'
import { useAuthStore } from '@/lib/auth'

export function SettingsPage() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const hasPermission = user?.permissions?.includes('settings.manage') || user?.type === 'admin'

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

  const { data, isLoading } = useQuery({
    queryKey: ['settings', 'company'],
    queryFn: () => settingsApi.getCompany(),
    retry: 1,
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

  if (isLoading) return <PageLoader />

  if (!hasPermission) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-text-primary">Настройки компании</h1>
        </div>
        <div className="max-w-2xl">
          <div className="border border-border rounded-lg p-6">
            <div className="flex items-center gap-3 text-status-warning">
              <Lock className="w-5 h-5" />
              <div>
                <div className="font-medium">Доступ ограничен</div>
                <div className="text-sm text-text-muted">
                  У вас нет права на изменение настроек компании. Обратитесь к администратору.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Настройки компании</h1>
      </div>

      <div className="max-w-2xl">
        <div className="border border-border rounded-lg p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Название компании"
              value={form.companyName}
              onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))}
              placeholder="ООО «Логистика»"
            />
            <Input
              label="ИНН"
              value={form.companyInn}
              onChange={e => setForm(f => ({ ...f, companyInn: e.target.value }))}
              placeholder="1234567890"
            />
            <Input
              label="КПП"
              value={form.companyKpp}
              onChange={e => setForm(f => ({ ...f, companyKpp: e.target.value }))}
              placeholder="123456789"
            />
            <Input
              label="Телефон"
              value={form.companyPhone}
              onChange={e => setForm(f => ({ ...f, companyPhone: e.target.value }))}
              placeholder="+7 (495) 123-45-67"
            />
            <Input
              label="Email"
              type="email"
              value={form.companyEmail}
              onChange={e => setForm(f => ({ ...f, companyEmail: e.target.value }))}
              placeholder="info@company.ru"
            />
            <Input
              label="Адрес"
              value={form.companyAddress}
              onChange={e => setForm(f => ({ ...f, companyAddress: e.target.value }))}
              placeholder="г. Москва, ул. Примерная, 1"
            />
            <Input
              label="Срок оплаты (дней)"
              type="number"
              value={form.defaultPaymentTermsDays}
              onChange={e => setForm(f => ({ ...f, defaultPaymentTermsDays: parseInt(e.target.value) || 0 }))}
            />
            <Input
              label="НДС (%)"
              type="number"
              value={form.defaultVatRate}
              onChange={e => setForm(f => ({ ...f, defaultVatRate: parseInt(e.target.value) || 0 }))}
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button 
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending}
            >
              <Save className="w-4 h-4 mr-2" />
              {updateMutation.isPending ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}