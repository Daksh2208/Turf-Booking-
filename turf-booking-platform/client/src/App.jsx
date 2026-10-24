import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './features/auth/context/AuthContext'
import { ProtectedRoute } from './components/common/ProtectedRoute'
import { AdminLayout } from './layouts/AdminLayout'

import { CustomerLayout } from './layouts/CustomerLayout'

// Public & Customer Pages
import { HomePage } from './pages/customer/HomePage'
import { TurfListingPage } from './pages/customer/TurfListingPage'
import { TurfDetailPage } from './pages/customer/TurfDetailPage'
import { LoginPage } from './features/auth/pages/LoginPage'
import { RegisterPage } from './features/auth/pages/RegisterPage'
import { NotFoundPage } from './pages/public/NotFoundPage'
import { UserSettingsPage } from './pages/customer/UserSettingsPage'

// Admin Inventory & Operations Pages
import { DashboardPage } from './pages/admin/DashboardPage'
import { BookingsPage } from './pages/admin/BookingsPage'
import { BlockedSlotsPage } from './pages/admin/BlockedSlotsPage'
import { SportsPage } from './pages/admin/SportsPage'
import { TurfsPage } from './pages/admin/TurfsPage'
import { AddOnsPage } from './pages/admin/AddOnsPage'
import { BannersPage } from './pages/admin/BannersPage'
import { SettingsPage } from './pages/admin/SettingsPage'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 1000 * 60 * 2, // 2 minutes
    },
  },
})

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Customer Website Routes wrapped in CustomerLayout */}
            <Route element={<CustomerLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/turfs" element={<TurfListingPage />} />
              <Route path="/turfs/:slug" element={<TurfDetailPage />} />
            </Route>

            {/* Public Authentication Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Authenticated User Account Settings Route */}
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <UserSettingsPage />
                </ProtectedRoute>
              }
            />

            {/* Protected Admin Inventory Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requireAdmin={true}>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="bookings" element={<BookingsPage />} />
              <Route path="blocked-slots" element={<BlockedSlotsPage />} />
              <Route path="turfs" element={<TurfsPage />} />
              <Route path="sports" element={<SportsPage />} />
              <Route path="addons" element={<AddOnsPage />} />
              <Route path="banners" element={<BannersPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            {/* Catch-all Not Found Route */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
