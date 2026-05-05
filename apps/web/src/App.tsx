import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './lib/auth'
import { Layout } from './components/Layout'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'
import { PageLoader } from './components/ui'

const DispatchPage = lazy(() => import('./pages/DispatchPage').then(m => ({ default: m.DispatchPage })))
const VehiclesPage = lazy(() => import('./pages/VehiclesPage').then(m => ({ default: m.VehiclesPage })))
const TrackingPage = lazy(() => import('./pages/TrackingPage').then(m => ({ default: m.TrackingPage })))
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })))
const InvoicesPage = lazy(() => import('./pages/InvoicesPage').then(m => ({ default: m.InvoicesPage })))

const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })))
const CounterpartiesPage = lazy(() => import('./pages/CounterpartiesPage').then(m => ({ default: m.CounterpartiesPage })))
const CounterpartyDetailPage = lazy(() => import('./pages/CounterpartyDetailPage').then(m => ({ default: m.CounterpartyDetailPage })))

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen"><PageLoader /></div>}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<DashboardPage />} />
          <Route path="dispatch" element={<DispatchPage />} />
          <Route path="vehicles" element={<VehiclesPage />} />
          <Route path="tracking" element={<TrackingPage />} />
          <Route path="invoices" element={<InvoicesPage />} />
          <Route path="counterparties" element={<CounterpartiesPage />} />
          <Route path="counterparties/:id" element={<CounterpartyDetailPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}