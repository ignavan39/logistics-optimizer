import { useState } from 'react'
import { Building2, Edit, FileText, Trash2 } from 'lucide-react'
import { Badge, Input } from '@/components/ui'
import { COUNTERPARTY_TYPE_LABELS, COUNTERPARTY_STATUS_LABELS } from '@/lib/status'
import type { Counterparty } from '@/types/counterparty'

interface CounterpartiesTableProps {
  counterparties: Counterparty[]
  onSelect: (cp: Counterparty) => void
  onShowContracts: (cpId: string) => void
  onDelete: (cpId: string) => void
}

export function CounterpartiesTable({ counterparties, onSelect, onShowContracts, onDelete }: CounterpartiesTableProps) {
  const [search, setSearch] = useState('')

  const filtered = counterparties.filter(c => {
    if (!search) return true
    const lower = search.toLowerCase()
    return c.name.toLowerCase().includes(lower) || c.inn?.toLowerCase().includes(lower)
  })

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <Input
          placeholder="Поиск..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {filtered.length === 0 ? (
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
              {filtered.map(cp => (
                <tr key={cp.id} className="border-t border-border hover:bg-surface-hover/50">
                  <td className="p-3">
                    <button onClick={() => onSelect(cp)} className="text-primary hover:underline">
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
                      <button onClick={() => onSelect(cp)} className="p-1 hover:bg-surface rounded">
                        <Edit className="w-4 h-4 text-text-muted" />
                      </button>
                      <button onClick={() => onShowContracts(cp.id)} className="p-1 hover:bg-surface rounded">
                        <FileText className="w-4 h-4 text-text-muted" />
                      </button>
                      <button onClick={() => { if (confirm('Удалить контрагента?')) onDelete(cp.id) }} className="p-1 hover:bg-status-error/10 rounded">
                        <Trash2 className="w-4 h-4 text-status-error" />
                      </button>
                    </div>
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
