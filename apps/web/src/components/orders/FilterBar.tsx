import { Search, Filter, X, Calendar } from 'lucide-react'
import { useState } from 'react'
import type { OrderStatusInfo } from '@/types'

interface FilterBarProps {
  search: string
  onSearchChange: (value: string) => void
  statusFilter: number[]
  onStatusChange: (statuses: number[]) => void
  dateFilter: string
  onDateChange: (date: string) => void
  onCreateClick: () => void
  statuses?: OrderStatusInfo[]
}

const DATE_OPTIONS = [
  { value: 'today', label: 'Сегодня' },
  { value: 'week', label: 'За неделю' },
  { value: 'month', label: 'За месяц' },
  { value: 'all', label: 'Все время' },
]

export function FilterBar({
  search,
  onSearchChange,
  statusFilter,
  onStatusChange,
  dateFilter,
  onDateChange,
  onCreateClick,
  statuses = [],
}: FilterBarProps) {
  const [showFilters, setShowFilters] = useState(false)

  const statusOptions = statuses.length > 0 
    ? statuses.map(s => ({ value: s.value, label: s.label }))
    : [
        { value: 1, label: 'Создан' },
        { value: 2, label: 'Назначен' },
        { value: 3, label: 'Загружен' },
        { value: 4, label: 'В пути' },
        { value: 5, label: 'Доставлен' },
        { value: 6, label: 'Проблема' },
        { value: 7, label: 'Отменен' },
      ]

  const toggleStatus = (status: number) => {
    if (statusFilter.includes(status)) {
      onStatusChange(statusFilter.filter(s => s !== status))
    } else {
      onStatusChange([...statusFilter, status])
    }
  }

  const clearFilters = () => {
    onSearchChange('')
    onStatusChange([])
    onDateChange('all')
  }

  const hasFilters = search || statusFilter.length > 0 || dateFilter !== 'all'

  return (
    <div className="bg-surface rounded-xl border border-border p-4 mb-4">
      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Поиск по ID, адресу, грузу..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-lavender"
          />
        </div>

        {/* Filter toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
            showFilters || hasFilters
              ? 'bg-accent-lavender/10 border-accent-lavender text-accent-lavender'
              : 'border-border text-text-secondary hover:bg-surface-hover'
          }`}
        >
          <Filter className="w-4 h-4" />
          Фильтры
          {hasFilters && (
            <span className="w-5 h-5 bg-accent-lavender text-background text-xs rounded-full flex items-center justify-center">
              {(statusFilter.length || 0) + (search ? 1 : 0)}
            </span>
          )}
        </button>

        {/* Create button */}
        <button
          onClick={onCreateClick}
          className="flex items-center gap-2 px-4 py-2 bg-accent-lavender text-background rounded-lg font-medium hover:opacity-90 transition-opacity"
        >
          <Calendar className="w-4 h-4" />
          Создать
        </button>
      </div>

      {/* Expanded filters */}
      {showFilters && (
        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-border">
          {/* Status filter */}
          <div>
            <label className="block text-sm text-text-muted mb-2">Статус</label>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => toggleStatus(option.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    statusFilter.includes(option.value)
                      ? 'bg-accent-lavender text-background'
                      : 'bg-background border border-border text-text-secondary hover:border-accent-lavender'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Date filter */}
          <div>
            <label className="block text-sm text-text-muted mb-2">Период</label>
            <div className="flex flex-wrap gap-2">
              {DATE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => onDateChange(option.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    dateFilter === option.value
                      ? 'bg-accent-lavender text-background'
                      : 'bg-background border border-border text-text-secondary hover:border-accent-lavender'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Clear filters */}
          {hasFilters && (
            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-status-error hover:bg-status-error/10 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
                Очистить
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}