import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Button, Input } from '@/components/ui'
import { apiPost } from '@/lib/api'
import { useAuthStore } from '@/lib/auth'

export function SecuritySettingsTab() {
  const logout = useAuthStore((s) => s.logout)
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState(false)

  const changePasswordMutation = useMutation({
    mutationFn: (dto: { currentPassword: string; newPassword: string }) =>
      apiPost('/auth/change-password', dto),
    onSuccess: () => {
      setPasswordSuccess(true)
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setTimeout(() => setPasswordSuccess(false), 3000)
    },
    onError: (err: Error) => {
      setPasswordError(err.message)
    },
  })

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Пароли не совпадают')
      return
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordError('Пароль должен быть не менее 6 символов')
      return
    }
    changePasswordMutation.mutate({
      currentPassword: passwordForm.currentPassword,
      newPassword: passwordForm.newPassword,
    })
  }

  return (
    <div className="max-w-2xl">
      <div className="border border-border rounded-lg p-6 space-y-4">
        <h3 className="font-medium text-text-primary">Смена пароля</h3>

        {passwordSuccess && (
          <div className="p-3 bg-status-success/10 border border-status-success rounded-lg text-status-success text-sm">
            Пароль успешно изменён
          </div>
        )}

        {passwordError && (
          <div className="p-3 bg-status-error/10 border border-status-error rounded-lg text-status-error text-sm">
            {passwordError}
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <Input
            label="Текущий пароль"
            type="password"
            value={passwordForm.currentPassword}
            onChange={e => setPasswordForm(f => ({ ...f, currentPassword: e.target.value }))}
            required
          />
          <Input
            label="Новый пароль"
            type="password"
            value={passwordForm.newPassword}
            onChange={e => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))}
            required
          />
          <Input
            label="Подтвердите пароль"
            type="password"
            value={passwordForm.confirmPassword}
            onChange={e => setPasswordForm(f => ({ ...f, confirmPassword: e.target.value }))}
            required
          />
          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={changePasswordMutation.isPending}>
              {changePasswordMutation.isPending ? 'Сохранение...' : 'Изменить пароль'}
            </Button>
          </div>
        </form>

        <div className="pt-6 mt-6 border-t border-border">
          <h3 className="font-medium text-text-primary mb-4">Выход из системы</h3>
          <Button variant="secondary" onClick={() => logout()}>
            Выйти из всех сессий
          </Button>
        </div>
      </div>
    </div>
  )
}
