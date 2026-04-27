import { useState } from 'react'
import { Bell, X } from 'lucide-react'
import { useNotificationStore } from '@/stores/notification.store'

export function NotificationsBell() {
  const [isOpen, setIsOpen] = useState(false)
  const { notifications, unreadCount, markAllAsRead, removeNotification } = useNotificationStore()

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 hover:bg-surface-hover rounded-lg transition-colors"
      >
        <Bell className="w-5 h-5 text-text-secondary" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-status-error text-white text-xs rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-surface border border-border rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-border">
            <h3 className="font-medium text-text-primary">Уведомления</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-accent-lavender hover:underline"
              >
                Отметить все прочитанными
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="p-4 text-center text-text-muted text-sm">
                Нет уведомлений
              </p>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 border-b border-border last:border-0 ${
                    !notification.read ? 'bg-surface-hover' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary">
                        {notification.title}
                      </p>
                      {notification.message && (
                        <p className="text-xs text-text-muted mt-0.5">
                          {notification.message}
                        </p>
                      )}
                      <p className="text-xs text-text-muted mt-1">
                        {new Date(notification.timestamp).toLocaleTimeString('ru-RU')}
                      </p>
                    </div>
                    <button
                      onClick={() => removeNotification(notification.id)}
                      className="p-1 hover:bg-surface rounded"
                    >
                      <X className="w-3 h-3 text-text-muted" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}