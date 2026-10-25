import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './features/auth/context/AuthContext'
import { ProtectedRoute } from './components/common/ProtectedRoute'
import { ScrollToTop } from './components/common/ScrollToTop'
import { AdminLayout } from './layouts/AdminLayout'
import { CustomerLayout } from './layouts/CustomerLayout'

// Public & Customer Pages
import { HomePage } from './pages/customer/HomePage'
import { TurfListingPage } from './pages/customer/TurfListingPage'
import { TurfDetailPage } from './pages/customer/TurfDetailPage'
import { CheckoutPage } from './pages/customer/CheckoutPage'
import { BookingSuccessPage } from './pages/customer/BookingSuccessPage'
import { PaymentSuccessPage } from './pages/customer/PaymentSuccessPage'
import { PaymentCancelledPage } from './pages/customer/PaymentCancelledPage'
import { MyBookingsPage } from './pages/customer/MyBookingsPage'
import { LoginPage } from './features/auth/pages/LoginPage'
import { RegisterPage } from './features/auth/pages/RegisterPage'
import { NotFoundPage } from './pages/public/NotFoundPage'
import { UserSettingsPage } from './pages/customer/UserSettingsPage'

// Admin Inventory & Operations Pages
import { DashboardPage } from './pages/admin/DashboardPage'
import { CalendarPage } from './pages/admin/CalendarPage'
import { CustomersPage } from './pages/admin/CustomersPage'
import { BookingsPage } from './pages/admin/BookingsPage'
import { BlockedSlotsPage } from './pages/admin/BlockedSlotsPage'
import { SportsPage } from './pages/admin/SportsPage'
import { TurfsPage } from './pages/admin/TurfsPage'
import { AddOnsPage } from './pages/admin/AddOnsPage'
import { CouponsPage } from './pages/admin/CouponsPage'
import { BannersPage } from './pages/admin/BannersPage'
import { SettingsPage } from './pages/admin/SettingsPage'
import { BookingReservationProvider } from './context/BookingReservationContext'

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BookingReservationProvider>
          <ScrollToTop />
          <Routes>
          {/* Customer Website Routes wrapped in CustomerLayout */}
          <Route element={<CustomerLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route
              path="/turfs"
              element={
                <ProtectedRoute redirectTo="/register">
                  <TurfListingPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/turfs/:slug"
              element={
                <ProtectedRoute redirectTo="/register">
                  <TurfDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/checkout"
              element={
                <ProtectedRoute requireCustomer={true} redirectTo="/register">
                  <CheckoutPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/bookings/success/:id"
              element={
                <ProtectedRoute requireCustomer={true} redirectTo="/register">
                  <BookingSuccessPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/bookings/payment-success"
              element={
                <ProtectedRoute requireCustomer={true} redirectTo="/login">
                  <PaymentSuccessPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/bookings/payment-cancelled"
              element={
                <ProtectedRoute requireCustomer={true} redirectTo="/login">
                  <PaymentCancelledPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payment-success"
              element={
                <ProtectedRoute requireCustomer={true} redirectTo="/login">
                  <PaymentSuccessPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/payment-cancelled"
              element={
                <ProtectedRoute requireCustomer={true} redirectTo="/login">
                  <PaymentCancelledPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-bookings"
              element={
                <ProtectedRoute requireCustomer={true} redirectTo="/login">
                  <MyBookingsPage />
                </ProtectedRoute>
              }
            />
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
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="customers" element={<CustomersPage />} />
            <Route path="bookings" element={<BookingsPage />} />
            <Route path="blocked-slots" element={<BlockedSlotsPage />} />
            <Route path="turfs" element={<TurfsPage />} />
            <Route path="sports" element={<SportsPage />} />
            <Route path="addons" element={<AddOnsPage />} />
            <Route path="coupons" element={<CouponsPage />} />
            <Route path="banners" element={<BannersPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>

          {/* Catch-all Not Found Route */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        </BookingReservationProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
