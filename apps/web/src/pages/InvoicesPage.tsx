import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FileText, Download, Clock, Loader2 } from 'lucide-react'
import { Button, PageLoader, Badge, Modal } from '@/components/ui'
import { invoicesApi } from '@/lib/api.clients'
import { apiGet } from '@/lib/api'
import type { InvoiceStatus, InvoiceStatusUpdate } from '@/types/invoice'
import { INVOICE_STATUS_LABELS, INVOICE_STATUS_COLORS } from '@/types'

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(amount)
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString('ru-RU')
}

export function InvoicesPage() {
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | ''>('')
  const [showStatus, setShowStatus] = useState<string | null>(null)
  const [downloadingPdf, setDownloadingPdf] = useState<string | null>(null)
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: ['invoices', page, statusFilter],
    queryFn: async () => {
      const result = await invoicesApi.list({ page, limit: 20, status: statusFilter ? String(statusFilter) : undefined })
      return result
    },
    retry: 1,
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: InvoiceStatusUpdate }) => 
      invoicesApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      setShowStatus(null)
    },
  })

  const downloadPdf = async (invoiceId: string) => {
    setDownloadingPdf(invoiceId)
    try {
      const pollPdf = async (): Promise<string> => {
        const result = await apiGet<{ url?: string; status?: string }>(`/invoices/${invoiceId}/pdf`)
        if (result.url) {
          return result.url
        }
        if (result.status === 'error') {
          throw new Error('PDF generation failed')
        }
        await new Promise(resolve => setTimeout(resolve, 2000))
        return pollPdf()
      }
      const pdfUrl = await pollPdf()
      window.open(pdfUrl, '_blank')
    } catch (err) {
      console.error('PDF download error:', err)
      alert('Ошибка при генерации PDF')
    } finally {
      setDownloadingPdf(null)
    }
  }

  const filteredData = data?.items ?? []
  const totalPages = data ? Math.ceil(data.total / 20) : 0
  const selected = data?.items?.find(i => i.id === selectedId)

  if (isLoading) return <PageLoader />
  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-text-muted">
          <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Сервис недоступен</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Счета</h1>
      </div>

      <div className="mb-4">
        <select 
          value={statusFilter} 
          onChange={e => { setStatusFilter(e.target.value as InvoiceStatus | ''); }}
          className="p-2 bg-surface border border-border rounded-lg text-text-primary"
        >
          <option value="">Все статусы</option>
          <option value="0">Черновик</option>
          <option value="1">Отправлен</option>
          <option value="2">Оплачен</option>
          <option value="3">Просрочен</option>
          <option value="4">Отменен</option>
        </select>
      </div>

      {!data?.items?.length ? (
        <div className="text-center py-12 text-text-muted">
          <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Нет счетов</p>
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-surface-hover">
              <tr>
                <th className="text-left p-3 text-sm font-medium text-text-muted">Номер</th>
                <th className="text-left p-3 text-sm font-medium text-text-muted">Контрагент</th>
                <th className="text-left p-3 text-sm font-medium text-text-muted">Сумма</th>
                <th className="text-left p-3 text-sm font-medium text-text-muted">НДС</th>
                <th className="text-left p-3 text-sm font-medium text-text-muted">Статус</th>
                <th className="text-left p-3 text-sm font-medium text-text-muted">Срок</th>
                <th className="text-left p-3 text-sm font-medium text-text-muted">Действия</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map(inv => (
                <tr key={inv.id} className="border-t border-border hover:bg-surface-hover/50">
                  <td className="p-3 font-mono">{inv.number}</td>
                  <td className="p-3">
                    {inv.counterpartyId ? (
                      <Link 
                        to={`/counterparties/${inv.counterpartyId}`} 
                        className="text-accent-lavender hover:underline"
                      >
                        {inv.counterpartyName || inv.counterpartyId.slice(0, 8)}
                      </Link>
                    ) : '-'}
                  </td>
                  <td className="p-3 font-medium">{formatCurrency(inv.amount)}</td>
                  <td className="p-3 text-text-muted">{inv.vatRate}% ({formatCurrency(inv.vatAmount)})</td>
                  <td className="p-3">
                    <Badge 
                      label={INVOICE_STATUS_LABELS[inv.status]} 
                      color={INVOICE_STATUS_COLORS[inv.status]} 
                    />
                  </td>
                  <td className="p-3 text-text-muted">
                    {inv.dueDateUnix ? formatDate(inv.dueDateUnix) : '-'}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => { setSelectedId(inv.id); }} 
                        className="p-1 hover:bg-surface rounded"
                        title="Просмотр"
                      >
                        <FileText className="w-4 h-4 text-text-muted" />
                      </button>
                      <button 
                        onClick={() => downloadPdf(inv.id)}
                        className="p-1 hover:bg-surface rounded"
                        title="Скачать PDF"
                        disabled={downloadingPdf === inv.id}
                      >
                        {downloadingPdf === inv.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-accent-lavender" />
                        ) : (
                          <Download className="w-4 h-4 text-text-muted" />
                        )}
                      </button>
                      <button 
                        onClick={() => { setShowStatus(inv.id); }} 
                        className="p-1 hover:bg-surface rounded"
                        title="Изменить статус"
                      >
                        <Clock className="w-4 h-4 text-text-muted" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-text-muted">Страница {page} из {totalPages}</div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => { setPage(p => p - 1); }}>Назад</Button>
            <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => { setPage(p => p + 1); }}>Вперёд</Button>
          </div>
        </div>
      )}

      <Modal isOpen={!!selectedId && !!selected} onClose={() => { setSelectedId(null); }} title={`Счёт ${selected?.number}`} size="lg">
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-text-muted">Контрагент</div>
                <div>{selected.counterpartyName || '-'}</div>
              </div>
              <div>
                <div className="text-sm text-text-muted">Статус</div>
                <Badge label={INVOICE_STATUS_LABELS[selected.status]} color={INVOICE_STATUS_COLORS[selected.status]} />
              </div>
              <div>
                <div className="text-sm text-text-muted">Сумма</div>
                <div className="font-medium text-lg">{formatCurrency(selected.amount)}</div>
              </div>
              <div>
                <div className="text-sm text-text-muted">НДС</div>
                <div>{selected.vatRate}% ({formatCurrency(selected.vatAmount)})</div>
              </div>
              {selected.dueDateUnix && (
                <div>
                  <div className="text-sm text-text-muted">Срок оплаты</div>
                  <div>{formatDate(selected.dueDateUnix)}</div>
                </div>
              )}
              {selected.paidAtUnix && (
                <div>
                  <div className="text-sm text-text-muted">Оплачен</div>
                  <div>{formatDate(selected.paidAtUnix)}</div>
                </div>
              )}
              <div>
                <div className="text-sm text-text-muted">Создан</div>
                <div>{formatDate(selected.createdAtUnix)}</div>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button 
                onClick={() => downloadPdf(selected.id)}
                disabled={downloadingPdf === selected.id}
              >
                <Download className="w-4 h-4 mr-2" />
                {downloadingPdf === selected.id ? 'Загрузка...' : 'Скачать PDF'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={!!showStatus} onClose={() => { setShowStatus(null); }} title="Изменить статус">
        <div className="space-y-4">
          <p className="text-text-muted">Выберите новый статус:</p>
          <div className="flex gap-2">
            <Button 
              onClick={() => { updateStatusMutation.mutate({ id: showStatus!, status: { status: 2 } }); }}
              disabled={updateStatusMutation.isPending}
            >
              Оплачен
            </Button>
            <Button 
              variant="secondary"
              onClick={() => { updateStatusMutation.mutate({ id: showStatus!, status: { status: 4 } }); }}
              disabled={updateStatusMutation.isPending}
            >
              Отменён
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}