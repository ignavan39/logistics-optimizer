import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './lib/auth'
import { Layout } from './components/Layout'
import { LoginPage } from './pages/LoginPage'
import { OrdersPage } from './pages/OrdersPage'
import { VehiclesPage } from './pages/VehiclesPage'
import { TrackingPage } from './pages/TrackingPage'
import { AdminPage } from './pages/AdminPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/orders" replace />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="vehicles" element={<VehiclesPage />} />
        <Route path="tracking" element={<TrackingPage />} />
        <Route path="admin" element={<AdminPage />} />
      </Route>
    </Routes>
  )
}