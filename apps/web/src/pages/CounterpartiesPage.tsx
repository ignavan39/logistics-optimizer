import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Building2, Edit, Plus, FileText, FilePlus } from 'lucide-react'
import { Button, PageLoader, Badge, Modal, Input } from '@/components/ui'
import { counterpartiesApi, contractsApi } from '@/lib/api.clients'
import { COUNTERPARTY_TYPE_LABELS, COUNTERPARTY_STATUS_LABELS, CONTRACT_STATUS_LABELS } from '@/types'
import type { ContractTariff, Counterparty, CreateCounterpartyDto, CreateContractDto, CreateContractTariffDto } from '@/types/counterparty'

interface CounterpartyFormData {
  name: string
  type: 'CLIENT' | 'CARRIER' | 'BOTH'
  inn: string
  kpp: string
  contactEmail: string
  contactPhone: string
}

function getEmptyForm(): CounterpartyFormData {
  return { name: '', type: 'CLIENT', inn: '', kpp: '', contactEmail: '', contactPhone: '' }
}

function getFormFromCounterparty(cp: Counterparty): CounterpartyFormData {
  return {
    name: cp.name,
    type: cp.type,
    inn: cp.inn || '',
    kpp: cp.kpp || '',
    contactEmail: cp.contactEmail || '',
    contactPhone: cp.contactPhone || '',
  }
}

export function CounterpartiesPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showContract, setShowContract] = useState<string | null>(null)
  const [showTariff, setShowTariff] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<CounterpartyFormData>(getEmptyForm())
  const [activeTab, setActiveTab] = useState<'details' | 'contracts'>('details')
  const [search, setSearch] = useState('')
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['counterparties'],
    queryFn: () => counterpartiesApi.list(),
    retry: 1,
  })

  const createMutation = useMutation({
    mutationFn: (dto: CreateCounterpartyDto) => counterpartiesApi.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['counterparties'] })
      setShowCreate(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: Partial<CreateCounterpartyDto> }) => 
      counterpartiesApi.update(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['counterparties'] })
      setEditingId(null)
    },
  })

  const createContractMutation = useMutation({
    mutationFn: (dto: CreateContractDto) => contractsApi.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] })
      setShowContract(null)
    },
  })

  const createTariffMutation = useMutation({
    mutationFn: ({ contractId, dto }: { contractId: string; dto: Omit<CreateContractTariffDto, 'contractId'> }) => 
      contractsApi.createTariff(contractId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tariffs'] })
      setShowTariff(null)
    },
  })

  const { data: contractsList } = useQuery({
    queryKey: ['contracts'],
    queryFn: () => contractsApi.list(),
  })

  const { data: tariffs } = useQuery({
    queryKey: ['tariffs', showTariff],
    queryFn: () => contractsApi.getTariffs(showTariff!),
    enabled: !!showTariff,
  })

  const filteredData = data?.filter(c => {
    if (!search) return true
    const lower = search.toLowerCase()
    return c.name.toLowerCase().includes(lower) || c.inn?.toLowerCase().includes(lower)
  }) ?? []

  const selected = data?.find(c => c.id === selectedId)
  const counterpartyContracts = contractsList?.filter(ct => ct.counterpartyId === selectedId) ?? []

  const handleCreateSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    createMutation.mutate({
      name: formData.get('name') as string,
      type: formData.get('type') as 'CLIENT' | 'CARRIER' | 'BOTH',
      inn: formData.get('inn') as string || undefined,
      kpp: formData.get('kpp') as string || undefined,
      contactEmail: formData.get('contactEmail') as string || undefined,
      contactPhone: formData.get('contactPhone') as string || undefined,
    })
  }

  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editingId) return
    const formData = new FormData(e.currentTarget)
    updateMutation.mutate({
      id: editingId,
      dto: {
        name: formData.get('name') as string,
        type: formData.get('type') as 'CLIENT' | 'CARRIER' | 'BOTH',
        inn: formData.get('inn') as string || undefined,
        kpp: formData.get('kpp') as string || undefined,
        contactEmail: formData.get('contactEmail') as string || undefined,
        contactPhone: formData.get('contactPhone') as string || undefined,
      },
    })
  }

  const handleContractSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selectedId) return
    const formData = new FormData(e.currentTarget)
    const validFrom = formData.get('validFrom') ? new Date(formData.get('validFrom') as string).getTime() : undefined
    const validTo = formData.get('validTo') ? new Date(formData.get('validTo') as string).getTime() : undefined
    createContractMutation.mutate({
      counterpartyId: selectedId,
      number: formData.get('number') as string,
      validFrom,
      validTo,
      totalLimitRub: formData.get('totalLimitRub') ? Number(formData.get('totalLimitRub')) : undefined,
      paymentTermsDays: formData.get('paymentTermsDays') ? Number(formData.get('paymentTermsDays')) : undefined,
    })
  }

  const handleTariffSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!showTariff) return
    const formData = new FormData(e.currentTarget)
    createTariffMutation.mutate({
      contractId: showTariff,
      dto: {
        zone: formData.get('zone') as string,
        pricePerKm: Number(formData.get('pricePerKm')),
        pricePerKg: Number(formData.get('pricePerKg')),
        minPrice: Number(formData.get('minPrice')),
      },
    })
  }

  const startEdit = (cp: Counterparty) => {
    setEditingId(cp.id)
    setEditForm(getFormFromCounterparty(cp))
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm(getEmptyForm())
  }

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

  const renderDetailsTab = () => {
    if (editingId === selected?.id) {
      return (
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <Input name="name" label="Название" defaultValue={editForm.name} required />
          <div>
            <label className="block text-sm text-text-muted mb-1">Тип</label>
            <select name="type" defaultValue={editForm.type} className="w-full p-2 bg-surface border border-border rounded-lg text-text-primary">
              <option value="CLIENT">Клиент</option>
              <option value="CARRIER">Перевозчик</option>
              <option value="BOTH">Клиент/Перевозчик</option>
            </select>
          </div>
          <Input name="inn" label="ИНН" defaultValue={editForm.inn} />
          <Input name="kpp" label="КПП" defaultValue={editForm.kpp} />
          <Input name="contactEmail" label="Email" type="email" defaultValue={editForm.contactEmail} />
          <Input name="contactPhone" label="Телефон" defaultValue={editForm.contactPhone} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={cancelEdit}>Отмена</Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </div>
        </form>
      )
    }

    if (!selected) return null

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-text-muted">Тип</div>
            <div>{COUNTERPARTY_TYPE_LABELS[selected.type]}</div>
          </div>
          <div>
            <div className="text-sm text-text-muted">Статус</div>
            <Badge label={COUNTERPARTY_STATUS_LABELS[selected.status]} color={selected.status === 'ACTIVE' ? 'success' : 'muted'} />
          </div>
          <div>
            <div className="text-sm text-text-muted">ИНН</div>
            <div className="font-mono">{selected.inn || '-'}</div>
          </div>
          <div>
            <div className="text-sm text-text-muted">КПП</div>
            <div className="font-mono">{selected.kpp || '-'}</div>
          </div>
        </div>
        {selected.contactEmail && (
          <div>
            <div className="text-sm text-text-muted">Email</div>
            <div>{selected.contactEmail}</div>
          </div>
        )}
        {selected.contactPhone && (
          <div>
            <div className="text-sm text-text-muted">Телефон</div>
            <div>{selected.contactPhone}</div>
          </div>
        )}
        <div className="flex justify-end">
          <Button onClick={() => startEdit(selected)}>
            <Edit className="w-4 h-4 mr-2" />Редактировать
          </Button>
        </div>
      </div>
    )
  }

  const renderContractsTab = () => {
    if (!selected) return null

    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button onClick={() => setShowContract(selected.id)}>
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
                  <Badge label={CONTRACT_STATUS_LABELS[contract.status]} color={contract.status === 'ACTIVE' ? 'success' : 'muted'} />
                  <button onClick={() => setShowTariff(contract.id)} className="p-1 hover:bg-surface rounded" title="Тарифы">
                    <FileText className="w-4 h-4 text-text-muted" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Контрагенты</h1>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-2" />Добавить
        </Button>
      </div>

      <div className="mb-4">
        <Input placeholder="Поиск..." value={search} onChange={e => setSearch(e.target.value)} className="max-w-sm" />
      </div>

      {!data?.length ? (
        <div className="text-center py-12 text-text-muted">
          <Building2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Нет контрагентов</p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-surface-hover">
              <tr>
                <th className="text-left p-3 text-sm font-medium text-text-muted">Название</th>
                <th className="text-left p-3 text-sm font-medium text-text-muted">Тип</th>
                <th className="text-left p-3 text-sm font-medium text-text-muted">ИНН</th>
                <th className="text-left p-3 text-sm font-medium text-text-muted">Статус</th>
                <th className="text-left p-3 text-sm font-medium text-text-muted">Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map(cp => (
                <tr key={cp.id} className="border-t border-border hover:bg-surface-hover/50">
                  <td className="p-3">
                    <button onClick={() => { setSelectedId(cp.id); setActiveTab('details') }} className="text-primary hover:underline">
                      {cp.name}
                    </button>
                  </td>
                  <td className="p-3 text-text-secondary">{COUNTERPARTY_TYPE_LABELS[cp.type]}</td>
                  <td className="p-3 text-text-secondary font-mono">{cp.inn || '-'}</td>
                  <td className="p-3">
                    <Badge label={COUNTERPARTY_STATUS_LABELS[cp.status]} color={cp.status === 'ACTIVE' ? 'success' : 'muted'} />
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button onClick={() => { setSelectedId(cp.id); setActiveTab('details') }} className="p-1 hover:bg-surface rounded">
                        <Edit className="w-4 h-4 text-text-muted" />
                      </button>
                      <button onClick={() => { setSelectedId(cp.id); setActiveTab('contracts') }} className="p-1 hover:bg-surface rounded">
                        <FileText className="w-4 h-4 text-text-muted" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Новый контрагент">
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <Input name="name" label="Название" required />
          <div>
            <label className="block text-sm text-text-muted mb-1">Тип</label>
            <select name="type" className="w-full p-2 bg-surface border border-border rounded-lg text-text-primary">
              <option value="CLIENT">Клиент</option>
              <option value="CARRIER">Перевозчик</option>
              <option value="BOTH">Клиент/Перевозчик</option>
            </select>
          </div>
          <Input name="inn" label="ИНН" />
          <Input name="kpp" label="КПП" />
          <Input name="contactEmail" label="Email" type="email" />
          <Input name="contactPhone" label="Телефон" />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>Отмена</Button>
            <Button type="submit" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Создание...' : 'Создать'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Details/Contracts Modal */}
      <Modal isOpen={!!selectedId && !!selected} onClose={() => setSelectedId(null)} title={selected?.name} size="lg">
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

          {activeTab === 'details' ? renderDetailsTab() : renderContractsTab()}
        </div>
      </Modal>

      {/* Create Contract Modal */}
      <Modal isOpen={!!showContract} onClose={() => setShowContract(null)} title="Новый контракт">
        <form onSubmit={handleContractSubmit} className="space-y-4">
          <Input name="number" label="Номер" required />
          <Input name="validFrom" label="Действует с" type="date" />
          <Input name="validTo" label="Действует по" type="date" />
          <Input name="totalLimitRub" label="Лимит (₽)" type="number" />
          <Input name="paymentTermsDays" label="Срок оплаты (дней)" type="number" />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowContract(null)}>Отмена</Button>
            <Button type="submit" disabled={createContractMutation.isPending}>
              {createContractMutation.isPending ? 'Создание...' : 'Создать'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Tariffs Modal */}
      <Modal isOpen={!!showTariff} onClose={() => setShowTariff(null)} title="Тарифы контракта" size="lg">
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowTariff(showTariff)}>
              <FilePlus className="w-4 h-4 mr-2" />Добавить тариф
            </Button>
          </div>
          <div className="space-y-3">
            {tariffs?.length === 0 && <p className="text-text-muted">Нет тарифов</p>}
            {tariffs?.map((tariff: ContractTariff) => (
              <div key={tariff.id} className="p-3 bg-surface-hover rounded-lg">
                <div className="font-medium">{tariff.zone}</div>
                <div className="text-sm text-text-muted space-y-1">
                  <div>Цена за км: {tariff.pricePerKm} ₽</div>
                  <div>Цена за кг: {tariff.pricePerKg} ₽</div>
                  <div>Мин. сумма: {tariff.minPrice} ₽</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* Create Tariff Modal */}
      <Modal isOpen={showTariff === 'create-tariff'} onClose={() => setShowTariff(null)} title="Новый тариф">
        <form onSubmit={handleTariffSubmit} className="space-y-4">
          <Input name="zone" label="Зона" required />
          <Input name="pricePerKm" label="Цена за км" type="number" required />
          <Input name="pricePerKg" label="Цена за кг" type="number" required />
          <Input name="minPrice" label="Мин. сумма" type="number" required />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" onClick={() => setShowTariff(null)}>Отмена</Button>
            <Button type="submit" disabled={createTariffMutation.isPending}>
              {createTariffMutation.isPending ? 'Создание...' : 'Создать'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}