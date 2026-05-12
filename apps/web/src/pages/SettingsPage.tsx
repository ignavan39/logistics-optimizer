import { useState } from 'react'
import { PageLoader } from '@/components/ui'
import { useAuthStore } from '@/lib/auth'
import { CompanySettingsTab } from './settings/CompanySettingsTab'
import { SecuritySettingsTab } from './settings/SecuritySettingsTab'
import { ApiKeysTab } from './settings/ApiKeysTab'
import { UsersTab } from './settings/UsersTab'
import { RolesTab } from './settings/RolesTab'
import { PermissionsTab } from './settings/PermissionsTab'
import { AuditTab } from './settings/AuditTab'

type SettingsTab = 'company' | 'security' | 'api-keys' | 'users' | 'roles' | 'permissions' | 'audit'

export function SettingsPage() {
  const user = useAuthStore((s) => s.user)
  const hasPermission = user?.permissions?.length || user?.type === 'admin'
  const [activeTab, setActiveTab] = useState<SettingsTab>('company')
  const [isLoading] = useState(false)

  if (isLoading) return <PageLoader />

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: 'company', label: 'Компания' },
    { id: 'security', label: 'Безопасность' },
    { id: 'api-keys', label: 'API ключи' },
    ...(hasPermission ? [
      { id: 'users' as const, label: 'Пользователи' },
      { id: 'roles' as const, label: 'Роли' },
      { id: 'permissions' as const, label: 'Права' },
      { id: 'audit' as const, label: 'Аудит' },
    ] : []),
  ]

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Настройки</h1>
      </div>

      <div className="flex gap-2 mb-6 border-b border-border">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 -mb-px border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-accent-lavender text-accent-lavender'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'company' && <CompanySettingsTab />}
      {activeTab === 'security' && <SecuritySettingsTab />}
      {activeTab === 'api-keys' && <ApiKeysTab />}
      {activeTab === 'users' && <UsersTab />}
      {activeTab === 'roles' && <RolesTab />}
      {activeTab === 'permissions' && <PermissionsTab />}
      {activeTab === 'audit' && <AuditTab />}
    </div>
  )
}
