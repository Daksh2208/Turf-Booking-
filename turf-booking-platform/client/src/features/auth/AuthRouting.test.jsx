import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '../../hooks/useApi'
import { AuthContext } from './context/AuthContext'
import { ProtectedRoute } from '../../components/common/ProtectedRoute'
import { HomePage } from '../../pages/customer/HomePage'
import { CheckoutPage } from '../../pages/customer/CheckoutPage'
import { MyBookingsPage } from '../../pages/customer/MyBookingsPage'

vi.mock('../../services/customer/inventory.service', () => ({
  default: {
    getSports: vi.fn().mockResolvedValue([]),
    getBanners: vi.fn().mockResolvedValue([]),
    getTurfs: vi.fn().mockResolvedValue({ turfs: [] }),
    getTurfById: vi.fn().mockResolvedValue({ _id: 't1', name: 'Test Turf' }),
  },
}))

vi.mock('../../services/customer/booking.service', () => ({
  default: {
    getPricingQuote: vi.fn().mockResolvedValue({ finalTotal: 100000 }),
    getMyBookings: vi.fn().mockResolvedValue({ bookings: [], pagination: { total: 0 } }),
  },
}))

describe('Role-Aware Routing & Admin Booking Restriction Suite', () => {
  let queryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
  })

  const renderRoutes = (authValue, initialPath = '/') => {
    return render(
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={authValue}>
          <MemoryRouter initialEntries={[initialPath]}>
            <Routes>
              {/* Customer Website Routes */}
              <Route path="/" element={<HomePage />} />
              <Route
                path="/checkout"
                element={
                  <ProtectedRoute requireCustomer={true} redirectTo="/register">
                    <CheckoutPage />
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

              {/* Admin Portal Protected Routes */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requireAdmin={true}>
                    <div>Admin Layout Outlet</div>
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="dashboard" element={<div>Admin Dashboard Page</div>} />
              </Route>

              {/* Public Auth Routes */}
              <Route path="/login" element={<div>Login Page View</div>} />
              <Route path="/register" element={<div>Register Page View</div>} />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>
      </QueryClientProvider>
    )
  }

  it('1. A valid admin session restored on startup routes to /admin instead of customer homepage', async () => {
    renderRoutes({
      user: { _id: 'admin_1', name: 'Super Admin', email: 'admin@turf.com', role: 'admin' },
      isLoading: false,
      isAuthenticated: true,
      isAdmin: true,
      login: vi.fn(),
      logout: vi.fn(),
    }, '/')

    // Should NOT show customer homepage
    expect(screen.queryByText(/Sports Turf Booking/i)).not.toBeInTheDocument()
    // Should redirect to admin
    expect(screen.getByText('Admin Layout Outlet')).toBeInTheDocument()
  })

  it('2. A valid customer session restored on startup routes to the customer area', async () => {
    renderRoutes({
      user: { _id: 'cust_1', name: 'John Customer', email: 'john@example.com', role: 'customer' },
      isLoading: false,
      isAuthenticated: true,
      isAdmin: false,
      login: vi.fn(),
      logout: vi.fn(),
    }, '/')

    expect(screen.getByRole('heading', { level: 1, name: /Sports Turf Booking/i })).toBeInTheDocument()
    expect(screen.queryByText('Admin Layout Outlet')).not.toBeInTheDocument()
  })

  it('3. Refreshing an admin dashboard page keeps admin on the dashboard and does not send them to customer homepage', async () => {
    renderRoutes({
      user: { _id: 'admin_1', name: 'Super Admin', email: 'admin@turf.com', role: 'admin' },
      isLoading: false,
      isAuthenticated: true,
      isAdmin: true,
      login: vi.fn(),
      logout: vi.fn(),
    }, '/admin/dashboard')

    expect(screen.getByText('Admin Layout Outlet')).toBeInTheDocument()
    expect(screen.queryByText(/Sports Turf Booking/i)).not.toBeInTheDocument()
  })

  it('4. An unauthenticated user cannot access admin pages and is redirected to /login', async () => {
    renderRoutes({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      isAdmin: false,
      login: vi.fn(),
      logout: vi.fn(),
    }, '/admin')

    expect(screen.getByText('Login Page View')).toBeInTheDocument()
    expect(screen.queryByText('Admin Layout Outlet')).not.toBeInTheDocument()
  })

  it('5. A customer cannot access admin pages and is redirected to customer area', async () => {
    renderRoutes({
      user: { _id: 'cust_1', name: 'Customer User', email: 'cust@example.com', role: 'customer' },
      isLoading: false,
      isAuthenticated: true,
      isAdmin: false,
      login: vi.fn(),
      logout: vi.fn(),
    }, '/admin')

    expect(screen.getByRole('heading', { level: 1, name: /Sports Turf Booking/i })).toBeInTheDocument()
    expect(screen.queryByText('Admin Layout Outlet')).not.toBeInTheDocument()
  })

  it('6. An admin cannot access customer booking and checkout routes and is redirected to /admin', async () => {
    renderRoutes({
      user: { _id: 'admin_1', name: 'Super Admin', email: 'admin@turf.com', role: 'admin' },
      isLoading: false,
      isAuthenticated: true,
      isAdmin: true,
      login: vi.fn(),
      logout: vi.fn(),
    }, '/checkout')

    // Admin should be blocked from checkout and redirected to admin
    expect(screen.getByText('Admin Layout Outlet')).toBeInTheDocument()
    expect(screen.queryByText(/Review Booking & Checkout/i)).not.toBeInTheDocument()
  })

  it('7. An admin cannot access customer my-bookings route and is redirected to /admin', async () => {
    renderRoutes({
      user: { _id: 'admin_1', name: 'Super Admin', email: 'admin@turf.com', role: 'admin' },
      isLoading: false,
      isAuthenticated: true,
      isAdmin: true,
      login: vi.fn(),
      logout: vi.fn(),
    }, '/my-bookings')

    expect(screen.getByText('Admin Layout Outlet')).toBeInTheDocument()
    expect(screen.queryByText(/My Bookings/i)).not.toBeInTheDocument()
  })

  it('8. Authentication loading displays session verification spinner without flashing incorrect pages', async () => {
    renderRoutes({
      user: null,
      isLoading: true,
      isAuthenticated: false,
      isAdmin: false,
      login: vi.fn(),
      logout: vi.fn(),
    }, '/')

    expect(screen.getByText(/Verifying session.../i)).toBeInTheDocument()
    expect(screen.queryByText(/Sports Turf Booking/i)).not.toBeInTheDocument()
    expect(screen.queryByText('Admin Layout Outlet')).not.toBeInTheDocument()
  })
})
