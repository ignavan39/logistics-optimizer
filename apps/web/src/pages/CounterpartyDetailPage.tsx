import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Building2, FileText, Receipt, Edit, Loader2 } from 'lucide-react'
import { Button, PageLoader, Badge } from '@/components/ui'
import { counterpartiesApi, contractsApi, invoicesApi } from '@/lib/api.clients'
import type { Counterparty } from '@/types/counterparty'
import { COUNTERPARTY_TYPE_LABELS, COUNTERPARTY_STATUS_LABELS, CONTRACT_STATUS_LABELS } from '@/types'

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(amount)
}

function formatDate(timestamp?: number): string {
  if (!timestamp) return '-'
  return new Date(timestamp * 1000).toLocaleDateString('ru-RU')
}

export function CounterpartyDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [activeTab, setActiveTab] = useState<'details' | 'contracts' | 'invoices'>('details')

  const { data: counterparty, isLoading: loadingCounterparty, error: errorCounterparty } = useQuery({
    queryKey: ['counterparty', id],
    queryFn: () => counterpartiesApi.get(id!),
    enabled: !!id,
  })

  const { data: allContracts, isLoading: loadingContracts } = useQuery({
    queryKey: ['contracts'],
    queryFn: () => contractsApi.list(),
  })

  const contracts = allContracts?.filter(c => c.counterpartyId === id) || []

  const { data: invoicesData, isLoading: loadingInvoices } = useQuery({
    queryKey: ['invoices', 'counterparty', id],
    queryFn: () => invoicesApi.list({ counterpartyId: id }),
    enabled: !!id,
  })

  if (loadingCounterparty) return <PageLoader />
  if (errorCounterparty || !counterparty) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-text-muted">
          <Building2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Контрагент не найден</p>
          <Link to="/counterparties">
            <Button variant="secondary" className="mt-4">Вернуться к списку</Button>
          </Link>
        </div>
      </div>
    )
  }

  const tabs = [
    { key: 'details', label: 'Реквизиты', icon: Building2 },
    { key: 'contracts', label: 'Договоры', icon: FileText },
    { key: 'invoices', label: 'Счета', icon: Receipt },
  ] as const

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <Link to="/counterparties">
          <Button variant="secondary" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад
          </Button>
        </Link>
        <h1 className="text-2xl font-semibold text-text-primary">{counterparty.name}</h1>
        <Badge 
          label={COUNTERPARTY_TYPE_LABELS[counterparty.type]} 
          color={counterparty.type === 'CLIENT' ? 'lavender' : counterparty.type === 'CARRIER' ? 'warning' : 'success'}
        />
      </div>

      <div className="border-b border-border mb-6">
        <nav className="flex gap-1">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === key
                  ? 'border-accent-lavender text-text-primary'
                  : 'border-transparent text-text-muted hover:text-text-primary'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'details' && (
        <div className="bg-surface border border-border rounded-lg p-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="text-sm text-text-muted mb-1">Название</div>
              <div className="text-lg font-medium">{counterparty.name}</div>
            </div>
            <div>
              <div className="text-sm text-text-muted mb-1">Статус</div>
              <Badge 
                label={COUNTERPARTY_STATUS_LABELS[counterparty.status]} 
                color={counterparty.status === 'ACTIVE' ? 'success' : 'muted'}
              />
            </div>
            <div>
              <div className="text-sm text-text-muted mb-1">Тип</div>
              <div>{COUNTERPARTY_TYPE_LABELS[counterparty.type]}</div>
            </div>
            <div>
              <div className="text-sm text-text-muted mb-1">ИНН</div>
              <div className="font-mono">{counterparty.inn || '-'}</div>
            </div>
            <div>
              <div className="text-sm text-text-muted mb-1">КПП</div>
              <div className="font-mono">{counterparty.kpp || '-'}</div>
            </div>
            <div>
              <div className="text-sm text-text-muted mb-1">ОГРН</div>
              <div className="font-mono">{counterparty.ogrn || '-'}</div>
            </div>
            <div>
              <div className="text-sm text-text-muted mb-1">Email</div>
              <div>{counterparty.contactEmail || '-'}</div>
            </div>
            <div>
              <div className="text-sm text-text-muted mb-1">Телефон</div>
              <div>{counterparty.contactPhone || '-'}</div>
            </div>
            <div className="col-span-2">
              <div className="text-sm text-text-muted mb-1">Адрес</div>
              <div>{counterparty.address ? (typeof counterparty.address === 'object' ? (counterparty.address as any).full || (counterparty.address as any).city || '-' : counterparty.address) : '-'}</div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'contracts' && (
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          {loadingContracts ? (
            <div className="p-8 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-text-muted" />
            </div>
          ) : !contracts?.length ? (
            <div className="p-8 text-center text-text-muted">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Нет договоров</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-surface-hover">
                <tr>
                  <th className="text-left p-3 text-sm font-medium text-text-muted">Номер</th>
                  <th className="text-left p-3 text-sm font-medium text-text-muted">Дата начала</th>
                  <th className="text-left p-3 text-sm font-medium text-text-muted">Дата окончания</th>
                  <th className="text-left p-3 text-sm font-medium text-text-muted">Лимит</th>
                  <th className="text-left p-3 text-sm font-medium text-text-muted">Статус</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((contract) => (
                  <tr key={contract.id} className="border-t border-border">
                    <td className="p-3 font-mono">{contract.number || '-'}</td>
                    <td className="p-3">{formatDate(contract.validFromUnix)}</td>
                    <td className="p-3">{formatDate(contract.validToUnix)}</td>
                    <td className="p-3">{contract.totalLimitRub ? formatCurrency(contract.totalLimitRub) : '-'}</td>
                    <td className="p-3">
                      <Badge 
                        label={CONTRACT_STATUS_LABELS[contract.status as keyof typeof CONTRACT_STATUS_LABELS] || contract.status}
                        color={contract.status === 'ACTIVE' ? 'success' : 'muted'}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeTab === 'invoices' && (
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          {loadingInvoices ? (
            <div className="p-8 text-center">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-text-muted" />
            </div>
          ) : !invoicesData?.items?.length ? (
            <div className="p-8 text-center text-text-muted">
              <Receipt className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Нет счетов</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-surface-hover">
                <tr>
                  <th className="text-left p-3 text-sm font-medium text-text-muted">Номер</th>
                  <th className="text-left p-3 text-sm font-medium text-text-muted">Сумма</th>
                  <th className="text-left p-3 text-sm font-medium text-text-muted">НДС</th>
                  <th className="text-left p-3 text-sm font-medium text-text-muted">Статус</th>
                  <th className="text-left p-3 text-sm font-medium text-text-muted">Срок</th>
                </tr>
              </thead>
              <tbody>
                {invoicesData.items.map((inv) => (
                  <tr key={inv.id} className="border-t border-border">
                    <td className="p-3 font-mono">{inv.number}</td>
                    <td className="p-3 font-medium">{formatCurrency(inv.amount)}</td>
                    <td className="p-3 text-text-muted">{inv.vatRate}%</td>
                    <td className="p-3">
                      <Badge 
                        label={['Черновик', 'Отправлен', 'Оплачен', 'Просрочен', 'Отменен'][inv.status] || 'Неизвестно'}
                        color={['muted', 'lavender', 'success', 'warning', 'error'][inv.status] as 'muted' | 'lavender' | 'success' | 'warning' | 'error'}
                      />
                    </td>
                    <td className="p-3 text-text-muted">{inv.dueDateUnix ? formatDate(inv.dueDateUnix) : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}