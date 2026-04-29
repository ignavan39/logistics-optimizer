import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { apiPost } from '@/lib/api'
import { Truck, Loader2, Mail, Lock, User, UserPlus } from 'lucide-react'
import { RegisterDto } from '@/types'

export function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState<RegisterDto>({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await apiPost('/auth/register', form)
      navigate('/login')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка регистрации')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-accent-lavender/10 rounded-2xl mb-4">
            <Truck className="w-8 h-8 text-accent-lavender" />
          </div>
          <h1 className="text-2xl font-semibold text-text-primary">Logistics Optimizer</h1>
          <p className="text-text-secondary mt-1">Регистрация</p>
        </div>

        <div className="bg-surface rounded-xl border border-border p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-status-error/10 border border-status-error rounded-lg text-status-error text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm text-text-secondary mb-1">Имя</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  value={form.firstName}
                  onChange={(e) => { setForm({ ...form, firstName: e.target.value }); }}
                  className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-lavender"
                  placeholder="Иван"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-text-secondary mb-1">Фамилия</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="text"
                  value={form.lastName}
                  onChange={(e) => { setForm({ ...form, lastName: e.target.value }); }}
                  className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-lavender"
                  placeholder="Петров"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-text-secondary mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => { setForm({ ...form, email: e.target.value }); }}
                  className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-lavender"
                  placeholder="user@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-text-secondary mb-1">Пароль</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => { setForm({ ...form, password: e.target.value }); }}
                  className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg text-text-primary placeholder-text-muted focus:outline-none focus:border-accent-lavender"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2 bg-accent-lavender text-background rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Зарегистрироваться
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-text-muted text-sm mt-4">
          Уже есть аккаунт?{' '}
          <Link to="/login" className="text-accent-lavender hover:underline">
            Войти
          </Link>
        </p>
      </div>
    </div>
  )
}
