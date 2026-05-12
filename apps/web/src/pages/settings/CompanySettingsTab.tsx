import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Save, Lock } from 'lucide-react'
import { Button, Input } from '@/components/ui'
import { settingsApi } from '@/lib/api.clients'
import { useAuthStore } from '@/lib/auth'

interface CompanyForm {
  companyName: string
  companyInn: string
  companyKpp: string
  companyAddress: string
  companyPhone: string
  companyEmail: string
  defaultPaymentTermsDays: number
  defaultVatRate: number
}

export function CompanySettingsTab() {
  const queryClient = useQueryClient()
  const hasPermission = useAuthStore((s) => s.user?.permissions?.length || s.user?.type === 'admin')

  const [form, setForm] = useState<CompanyForm>({
    companyName: '',
    companyInn: '',
    companyKpp: '',
    companyAddress: '',
    companyPhone: '',
    companyEmail: '',
    defaultPaymentTermsDays: 30,
    defaultVatRate: 20,
  })

  const { data } = useQuery({
    queryKey: ['settings', 'company'],
    queryFn: () => settingsApi.getCompany(),
    retry: 1,
  })

  useEffect(() => {
    if (data) {
      setForm({
        companyName: data?.companyName ?? '',
        companyInn: data?.companyInn ?? '',
        companyKpp: data?.companyKpp ?? '',
        companyAddress: data?.companyAddress ?? '',
        companyPhone: data?.companyPhone ?? '',
        companyEmail: data?.companyEmail ?? '',
        defaultPaymentTermsDays: data.defaultPaymentTermsDays || 30,
        defaultVatRate: data.defaultVatRate || 20,
      })
    }
  }, [data])

  const updateMutation = useMutation({
    mutationFn: () => settingsApi.updateCompany(form),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['settings', 'company'] }),
  })

  return (
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
            placeholder="г. Москва, ул. Тестовая, 1"
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
            <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
              <Save className="w-4 h-4 mr-2" />
              {updateMutation.isPending ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
