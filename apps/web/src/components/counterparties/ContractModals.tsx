import { useState } from 'react'
import { Edit, FilePlus, Trash2 } from 'lucide-react'
import { Button, Input, Modal } from '@/components/ui'
import { contractsApi } from '@/lib/api.clients'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import type { ContractTariff, CreateContractDto, CreateContractTariffDto } from '@/types/counterparty'

interface CreateContractModalProps {
  counterpartyId: string | null
  isOpen: boolean
  onClose: () => void
}

export function CreateContractModal({ counterpartyId, isOpen, onClose }: CreateContractModalProps) {
  const queryClient = useQueryClient()
  const createMutation = useMutation({
    mutationFn: (dto: CreateContractDto) => contractsApi.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contracts'] })
      onClose()
    },
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!counterpartyId) return
    const formData = new FormData(e.currentTarget)
    createMutation.mutate({
      counterpartyId,
      number: formData.get('number') as string,
      validFrom: formData.get('validFrom') ? new Date(formData.get('validFrom') as string).getTime() : undefined,
      validTo: formData.get('validTo') ? new Date(formData.get('validTo') as string).getTime() : undefined,
      totalLimitRub: formData.get('totalLimitRub') ? Number(formData.get('totalLimitRub')) : undefined,
      paymentTermsDays: formData.get('paymentTermsDays') ? Number(formData.get('paymentTermsDays')) : undefined,
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Новый контракт">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input name="number" label="Номер" required />
        <Input name="validFrom" label="Действует с" type="date" />
        <Input name="validTo" label="Действует по" type="date" />
        <Input name="totalLimitRub" label="Лимит (₽)" type="number" />
        <Input name="paymentTermsDays" label="Срок оплаты (дней)" type="number" />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Отмена</Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Создание...' : 'Создать'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

interface TariffFormData {
  zoneFrom: string
  zoneTo: string
  pricePerKm: number
  minPrice: number
  pricePerKg: number
  minWeight: number
}

interface TariffsModalProps {
  contractId: string | null
  isOpen: boolean
  onClose: () => void
}

export function TariffsModal({ contractId, isOpen, onClose }: TariffsModalProps) {
  const queryClient = useQueryClient()
  const [editingTariffId, setEditingTariffId] = useState<string | null>(null)
  const [editTariffForm, setEditTariffForm] = useState<TariffFormData>({
    zoneFrom: '',
    zoneTo: '',
    pricePerKm: 0,
    minPrice: 0,
    pricePerKg: 0,
    minWeight: 0,
  })

  const { data: tariffs } = useQuery({
    queryKey: ['tariffs', contractId],
    queryFn: () => contractsApi.getTariffs(contractId!),
    enabled: !!contractId && isOpen,
  })

  const createTariffMutation = useMutation({
    mutationFn: (dto: Omit<CreateContractTariffDto, 'contractId'>) =>
      contractsApi.createTariff(contractId!, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tariffs'] })
      setEditingTariffId(null)
    },
  })

  const updateTariffMutation = useMutation({
    mutationFn: ({ tariffId, dto }: { tariffId: string; dto: TariffFormData }) =>
      contractsApi.updateTariff(contractId!, tariffId, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tariffs'] })
      setEditingTariffId(null)
    },
  })

  const deleteTariffMutation = useMutation({
    mutationFn: (tariffId: string) =>
      contractsApi.deleteTariff(contractId!, tariffId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tariffs'] })
    },
  })

  const cancelEdit = () => {
    setEditingTariffId(null)
    setEditTariffForm({ zoneFrom: '', zoneTo: '', pricePerKm: 0, minPrice: 0, pricePerKg: 0, minWeight: 0 })
  }

  return (
    <Modal isOpen={isOpen} onClose={() => { onClose(); cancelEdit(); }} title="Тарифы контракта" size="lg">
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button onClick={() => { setEditingTariffId('create-tariff'); cancelEdit(); }}>
            <FilePlus className="w-4 h-4 mr-2" />Добавить тариф
          </Button>
        </div>

        {editingTariffId === 'create-tariff' ? (
          <TariffFormInline
            form={editTariffForm}
            onChange={setEditTariffForm}
            onSubmit={() => createTariffMutation.mutate(editTariffForm)}
            onCancel={cancelEdit}
            isPending={createTariffMutation.isPending}
          />
        ) : null}

        <div className="space-y-3">
          {tariffs?.length === 0 && <p className="text-text-muted">Нет тарифов</p>}
          {tariffs?.map((tariff: ContractTariff) => (
            <div key={tariff.id}>
              {editingTariffId === tariff.id ? (
                <TariffFormInline
                  form={editTariffForm}
                  onChange={setEditTariffForm}
                  onSubmit={() => updateTariffMutation.mutate({ tariffId: tariff.id, dto: editTariffForm })}
                  onCancel={cancelEdit}
                  isPending={updateTariffMutation.isPending}
                />
              ) : (
                <div className="p-3 bg-surface-hover rounded-lg flex justify-between items-start">
                  <div>
                    <div className="font-medium">{tariff.zoneFrom} → {tariff.zoneTo}</div>
                    <div className="text-sm text-text-muted space-y-1 mt-1">
                      <div>Цена за км: {tariff.pricePerKm} ₽</div>
                      <div>Цена за кг: {tariff.pricePerKg} ₽</div>
                      <div>Мин. сумма: {tariff.minPrice} ₽</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => {
                      setEditingTariffId(tariff.id)
                      setEditTariffForm({
                        zoneFrom: tariff.zoneFrom,
                        zoneTo: tariff.zoneTo,
                        pricePerKm: tariff.pricePerKm,
                        minPrice: tariff.minPrice,
                        pricePerKg: tariff.pricePerKg,
                        minWeight: tariff.minWeight || 0,
                      })
                    }} className="p-1 hover:bg-surface rounded">
                      <Edit className="w-4 h-4 text-text-muted" />
                    </button>
                    <button onClick={() => { if (confirm('Удалить тариф?')) deleteTariffMutation.mutate(tariff.id) }} className="p-1 hover:bg-status-error/10 rounded">
                      <Trash2 className="w-4 h-4 text-status-error" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Modal>
  )
}

interface TariffFormInlineProps {
  form: TariffFormData
  onChange: (form: TariffFormData) => void
  onSubmit: () => void
  onCancel: () => void
  isPending: boolean
}

function TariffFormInline({ form, onChange, onSubmit, onCancel, isPending }: TariffFormInlineProps) {
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }} className="p-4 bg-surface rounded-lg space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input label="Зона от" value={form.zoneFrom} onChange={e => onChange({ ...form, zoneFrom: e.target.value })} required />
        <Input label="Зона до" value={form.zoneTo} onChange={e => onChange({ ...form, zoneTo: e.target.value })} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Цена за км" type="number" value={form.pricePerKm} onChange={e => onChange({ ...form, pricePerKm: Number(e.target.value) })} required />
        <Input label="Цена за кг" type="number" value={form.pricePerKg} onChange={e => onChange({ ...form, pricePerKg: Number(e.target.value) })} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Мин. сумма" type="number" value={form.minPrice} onChange={e => onChange({ ...form, minPrice: Number(e.target.value) })} required />
        <Input label="Мин. вес" type="number" value={form.minWeight} onChange={e => onChange({ ...form, minWeight: Number(e.target.value) })} />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Отмена</Button>
        <Button type="submit" disabled={isPending}>{isPending ? 'Сохранение...' : 'Сохранить'}</Button>
      </div>
    </form>
  )
}
