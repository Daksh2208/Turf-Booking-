import React, { useEffect, lazy, Suspense } from 'react'
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useSearchParams,
  useNavigate,
  useLocation,
} from 'react-router-dom'
import { AuthProvider } from './features/auth/context/AuthContext'
import { ProtectedRoute } from './components/common/ProtectedRoute'
import { ScrollToTop } from './components/common/ScrollToTop'
import { PageFallback } from './components/common/PageFallback'
import { AdminLayout } from './layouts/AdminLayout'
import { CustomerLayout } from './layouts/CustomerLayout'
import { BookingReservationProvider } from './context/BookingReservationContext'

// Direct import for immediate above-the-fold landing page rendering
import { HomePage } from './pages/customer/HomePage'

// Lazy-loaded Public & Customer Pages (Code-splitting)
const TurfListingPage = lazy(() => import('./pages/customer/TurfListingPage'))
const TurfDetailPage = lazy(() => import('./pages/customer/TurfDetailPage'))
const CheckoutPage = lazy(() => import('./pages/customer/CheckoutPage'))
const BookingSuccessPage = lazy(() => import('./pages/customer/BookingSuccessPage'))
const PaymentSuccessPage = lazy(() => import('./pages/customer/PaymentSuccessPage'))
const PaymentCancelledPage = lazy(() => import('./pages/customer/PaymentCancelledPage'))
const MyBookingsPage = lazy(() => import('./pages/customer/MyBookingsPage'))
const FavoritesPage = lazy(() => import('./pages/customer/FavoritesPage'))
const LoginPage = lazy(() => import('./features/auth/pages/LoginPage'))
const RegisterPage = lazy(() => import('./features/auth/pages/RegisterPage'))
const NotFoundPage = lazy(() => import('./pages/public/NotFoundPage'))
const UserSettingsPage = lazy(() => import('./pages/customer/UserSettingsPage'))

// Lazy-loaded Admin Operations Pages (Separated from customer bundle)
const DashboardPage = lazy(() => import('./pages/admin/DashboardPage'))
const CalendarPage = lazy(() => import('./pages/admin/CalendarPage'))
const CustomersPage = lazy(() => import('./pages/admin/CustomersPage'))
const BookingsPage = lazy(() => import('./pages/admin/BookingsPage'))
const BlockedSlotsPage = lazy(() => import('./pages/admin/BlockedSlotsPage'))
const SportsPage = lazy(() => import('./pages/admin/SportsPage'))
const TurfsPage = lazy(() => import('./pages/admin/TurfsPage'))
const AddOnsPage = lazy(() => import('./pages/admin/AddOnsPage'))
const CouponsPage = lazy(() => import('./pages/admin/CouponsPage'))
const BannersPage = lazy(() => import('./pages/admin/BannersPage'))
const SettingsPage = lazy(() => import('./pages/admin/SettingsPage'))

// Handles external redirects from Stripe to root URL and routes cleanly to SPA page
function StripeReturnRedirector() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (
      location.pathname === '/' &&
      (searchParams.get('payment_success') === 'true' ||
        (searchParams.get('session_id') && searchParams.get('booking_id')))
    ) {
      navigate(`/bookings/payment-success${location.search}`, { replace: true })
    } else if (
      location.pathname === '/' &&
      searchParams.get('payment_cancelled') === 'true'
    ) {
      navigate(`/bookings/payment-cancelled${location.search}`, { replace: true })
    }
  }, [location, searchParams, navigate])

  return null
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BookingReservationProvider>
          <ScrollToTop />
          <StripeReturnRedirector />
          <Suspense fallback={<PageFallback />}>
            <Routes>
              {/* Customer Website Routes wrapped in CustomerLayout */}
              <Route element={<CustomerLayout />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/turfs" element={<TurfListingPage />} />
                <Route path="/turfs/:slug" element={<TurfDetailPage />} />
                <Route
                  path="/checkout"
                  element={
                    <ProtectedRoute requireCustomer={true} redirectTo="/login">
                      <CheckoutPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/bookings/success/:id"
                  element={
                    <ProtectedRoute requireCustomer={true} redirectTo="/login">
                      <BookingSuccessPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/bookings/payment-success"
                  element={<PaymentSuccessPage />}
                />
                <Route
                  path="/bookings/payment-cancelled"
                  element={<PaymentCancelledPage />}
                />
                <Route
                  path="/payment-success"
                  element={<PaymentSuccessPage />}
                />
                <Route
                  path="/payment-cancelled"
                  element={<PaymentCancelledPage />}
                />
                <Route
                  path="/my-bookings"
                  element={
                    <ProtectedRoute requireCustomer={true} redirectTo="/login">
                      <MyBookingsPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/favorites"
                  element={
                    <ProtectedRoute requireCustomer={true} redirectTo="/login">
                      <FavoritesPage />
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
          </Suspense>
        </BookingReservationProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
