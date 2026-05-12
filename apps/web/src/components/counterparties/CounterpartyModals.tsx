import { Button, Input, Modal } from '@/components/ui'
import { counterpartiesApi } from '@/lib/api.clients'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { CreateCounterpartyDto } from '@/types/counterparty'

interface CreateCounterpartyModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CreateCounterpartyModal({ isOpen, onClose }: CreateCounterpartyModalProps) {
  const queryClient = useQueryClient()
  const createMutation = useMutation({
    mutationFn: (dto: CreateCounterpartyDto) => counterpartiesApi.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['counterparties'] })
      onClose()
    },
  })

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Новый контрагент">
      <form onSubmit={handleSubmit} className="space-y-4">
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
          <Button type="button" variant="secondary" onClick={onClose}>Отмена</Button>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Создание...' : 'Создать'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
