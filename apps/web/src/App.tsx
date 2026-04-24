import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './lib/auth'
import { Layout } from './components/Layout'
import { LoginPage } from './pages/LoginPage'
import { PageLoader } from './components/ui'

const OrdersPage = lazy(() => import('./pages/OrdersPage').then(m => ({ default: m.OrdersPage })))
const DispatchPage = lazy(() => import('./pages/DispatchPage').then(m => ({ default: m.DispatchPage })))
const VehiclesPage = lazy(() => import('./pages/VehiclesPage').then(m => ({ default: m.VehiclesPage })))
const TrackingPage = lazy(() => import('./pages/TrackingPage').then(m => ({ default: m.TrackingPage })))
const AdminPage = lazy(() => import('./pages/AdminPage').then(m => ({ default: m.AdminPage })))

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
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/orders" replace />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="dispatch" element={<DispatchPage />} />
          <Route path="vehicles" element={<VehiclesPage />} />
          <Route path="tracking" element={<TrackingPage />} />
          <Route path="admin" element={<AdminPage />} />
        </Route>
      </Routes>
    </Suspense>
  )
}