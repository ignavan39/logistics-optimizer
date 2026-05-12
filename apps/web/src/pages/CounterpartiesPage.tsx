import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Building2, FileText, FilePlus, Trash2 } from 'lucide-react'
import { Button, PageLoader, Badge, Modal } from '@/components/ui'
import { counterpartiesApi, contractsApi } from '@/lib/api.clients'
import { COUNTERPARTY_TYPE_LABELS, CONTRACT_STATUS_LABELS } from '@/lib/status'
import { CounterpartiesTable } from '@/components/counterparties/CounterpartiesTable'
import { CreateCounterpartyModal } from '@/components/counterparties/CounterpartyModals'
import { CreateContractModal, TariffsModal } from '@/components/counterparties/ContractModals'

export function CounterpartiesPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showContract, setShowContract] = useState<string | null>(null)
  const [showTariff, setShowTariff] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'details' | 'contracts'>('details')
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['counterparties'],
    queryFn: () => counterpartiesApi.list(),
    retry: 1,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => counterpartiesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['counterparties'] })
      setSelectedId(null)
    },
  })

  const deleteContractMutation = useMutation({
    mutationFn: (id: string) => contractsApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['contracts'] }),
  })

  const { data: contractsList } = useQuery({
    queryKey: ['contracts'],
    queryFn: () => contractsApi.list(),
  })

  const selected = data?.find(c => c.id === selectedId)
  const counterpartyContracts = contractsList?.filter(ct => ct.counterpartyId === selectedId) ?? []

  if (isLoading) return <PageLoader />
  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-text-muted">
          <Building2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Сервис недоступен</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Контрагенты</h1>
        <Button onClick={() => setShowCreate(true)}>
          <FilePlus className="w-4 h-4 mr-2" />Добавить
        </Button>
      </div>

      <CounterpartiesTable
        counterparties={data ?? []}
        onSelect={(cp) => { setSelectedId(cp.id); setActiveTab('details'); }}
        onShowContracts={(cpId) => { setSelectedId(cpId); setActiveTab('contracts'); }}
        onDelete={(id) => deleteMutation.mutate(id)}
      />

      <CreateCounterpartyModal isOpen={showCreate} onClose={() => setShowCreate(false)} />

      <Modal
        isOpen={!!selectedId && !!selected}
        onClose={() => setSelectedId(null)}
        title={selected?.name}
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex gap-4 mb-4 border-b border-border">
            <button
              onClick={() => setActiveTab('details')}
              className={`pb-2 px-1 ${activeTab === 'details' ? 'border-b-2 border-accent-lavender text-primary' : 'text-text-muted'}`}
            >
              Реквизиты
            </button>
            <button
              onClick={() => setActiveTab('contracts')}
              className={`pb-2 px-1 ${activeTab === 'contracts' ? 'border-b-2 border-accent-lavender text-primary' : 'text-text-muted'}`}
            >
              Контракты
            </button>
          </div>

          {activeTab === 'details' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-text-muted">Тип</div>
                  <div>{COUNTERPARTY_TYPE_LABELS[selected?.type ?? '']}</div>
                </div>
                <div>
                  <div className="text-sm text-text-muted">Статус</div>
                  <Badge label={selected?.status === 'ACTIVE' ? 'Активен' : 'Неактивен'} color={selected?.status === 'ACTIVE' ? 'success' : 'muted'} />
                </div>
                <div>
                  <div className="text-sm text-text-muted">ИНН</div>
                  <div className="font-mono">{selected?.inn || '-'}</div>
                </div>
                <div>
                  <div className="text-sm text-text-muted">КПП</div>
                  <div className="font-mono">{selected?.kpp || '-'}</div>
                </div>
              </div>
              {selected?.contactEmail && (
                <div>
                  <div className="text-sm text-text-muted">Email</div>
                  <div>{selected.contactEmail}</div>
                </div>
              )}
              {selected?.contactPhone && (
                <div>
                  <div className="text-sm text-text-muted">Телефон</div>
                  <div>{selected.contactPhone}</div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={() => setShowContract(selectedId)}>
                  <FilePlus className="w-4 h-4 mr-2" />Добавить контракт
                </Button>
              </div>
              {counterpartyContracts.length === 0 ? (
                <p className="text-text-muted text-center py-4">Нет контрактов</p>
              ) : (
                <div className="space-y-2">
                  {counterpartyContracts.map(contract => (
                    <div key={contract.id} className="p-3 bg-surface-hover rounded-lg flex justify-between items-center">
                      <div>
                        <div className="font-medium">{contract.number}</div>
                        <div className="text-sm text-text-muted">
                          {contract.validFromUnix ? new Date(contract.validFromUnix * 1000).toLocaleDateString('ru-RU') : '—'} — {contract.validToUnix ? new Date(contract.validToUnix * 1000).toLocaleDateString('ru-RU') : 'бессрочно'}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Badge label={CONTRACT_STATUS_LABELS[contract.status] ?? contract.status} color={contract.status === 'ACTIVE' ? 'success' : 'muted'} />
                        <button onClick={() => { setShowTariff(contract.id); }} className="p-1 hover:bg-surface rounded" title="Тарифы">
                          <FileText className="w-4 h-4 text-text-muted" />
                        </button>
                        <button onClick={() => { if (confirm('Удалить контракт?')) deleteContractMutation.mutate(contract.id) }} className="p-1 hover:bg-status-error/10 rounded" title="Удалить">
                          <Trash2 className="w-4 h-4 text-status-error" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      <CreateContractModal counterpartyId={selectedId} isOpen={!!showContract} onClose={() => setShowContract(null)} />
      <TariffsModal contractId={showTariff} isOpen={!!showTariff} onClose={() => setShowTariff(null)} />
    </div>
  )
}
