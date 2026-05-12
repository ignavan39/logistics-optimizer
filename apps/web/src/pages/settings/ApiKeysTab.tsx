import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { Button, Input, Modal } from '@/components/ui'
import { apiGet, apiPost } from '@/lib/api'

interface ApiKey {
  id: string
  name: string
  key: string
  createdAtUnix: number
  expiresAtUnix?: number
}

export function ApiKeysTab() {
  const queryClient = useQueryClient()
  const [showCreateKey, setShowCreateKey] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')

  const { data: apiKeys } = useQuery<ApiKey[]>({
    queryKey: ['api-keys'],
    queryFn: () => apiGet('/auth/api-keys') as Promise<ApiKey[]>,
  })

  const createApiKeyMutation = useMutation({
    mutationFn: (name: string) =>
      apiPost<ApiKey>('/auth/api-keys', { name, type: 'permanent' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] })
      setShowCreateKey(false)
      setNewKeyName('')
    },
  })

  const deleteApiKeyMutation = useMutation({
    mutationFn: (id: string) =>
      apiPost(`/auth/api-keys/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['api-keys'] }),
  })

  const handleCreateKey = () => {
    if (!newKeyName.trim()) return
    createApiKeyMutation.mutate(newKeyName)
  }

  return (
    <div className="max-w-2xl">
      <div className="border border-border rounded-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-text-primary">API ключи</h3>
          <Button size="sm" onClick={() => setShowCreateKey(true)}>
            <Plus className="w-4 h-4 mr-1" />Создать ключ
          </Button>
        </div>

        <p className="text-sm text-text-muted">
          API ключи используются для доступа к системе без логина и пароля.
        </p>

        {!Array.isArray(apiKeys) || apiKeys.length === 0 ? (
          <p className="text-text-muted text-center py-4">Нет API ключей</p>
        ) : (
          <div className="space-y-2">
            {apiKeys.map(key => (
              <div key={key.id} className="flex items-center justify-between p-3 bg-surface-hover rounded-lg">
                <div>
                  <p className="font-medium text-text-primary">{key.name}</p>
                  <p className="text-sm text-text-muted font-mono">
                    ****{key.key.slice(-8)}
                  </p>
                  <p className="text-xs text-text-muted">
                    Создан: {new Date(key.createdAtUnix * 1000).toLocaleDateString('ru-RU')}
                  </p>
                </div>
                <button
                  onClick={() => deleteApiKeyMutation.mutate(key.id)}
                  className="p-2 text-status-error hover:bg-status-error/10 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={showCreateKey}
        onClose={() => { setShowCreateKey(false); setNewKeyName(''); }}
        title="Создать API ключ"
      >
        <div className="space-y-4">
          <Input
            label="Название"
            value={newKeyName}
            onChange={e => setNewKeyName(e.target.value)}
            placeholder="Мой API ключ"
          />
          <p className="text-sm text-text-muted">
            Укажите название для идентификации ключа.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setShowCreateKey(false); setNewKeyName(''); }}>
              Отмена
            </Button>
            <Button onClick={handleCreateKey} disabled={!newKeyName.trim() || createApiKeyMutation.isPending}>
              {createApiKeyMutation.isPending ? 'Создание...' : 'Создать'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
