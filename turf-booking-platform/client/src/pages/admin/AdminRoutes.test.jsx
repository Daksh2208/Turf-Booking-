import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthContext } from '../../features/auth/context/AuthContext'
import { ProtectedRoute } from '../../components/common/ProtectedRoute'
import { AdminLayout } from '../../layouts/AdminLayout'
import { SportsPage } from './SportsPage'
import adminInventoryService from '../../services/admin/inventory.service'

vi.mock('../../services/admin/inventory.service', () => ({
  adminInventoryService: {
    getSports: vi.fn().mockResolvedValue({
      sports: [
        {
          _id: 's1',
          name: 'Box Cricket',
          slug: 'box-cricket',
          description: 'Enclosed cricket',
          isActive: true,
        },
      ],
      pagination: { page: 1, totalPages: 1 },
    }),
    createSport: vi.fn(),
    updateSport: vi.fn(),
    toggleSportStatus: vi.fn(),
  },
  default: {
    getSports: vi.fn().mockResolvedValue({
      sports: [
        {
          _id: 's1',
          name: 'Box Cricket',
          slug: 'box-cricket',
          description: 'Enclosed cricket',
          isActive: true,
        },
      ],
      pagination: { page: 1, totalPages: 1 },
    }),
    createSport: vi.fn(),
    updateSport: vi.fn(),
    toggleSportStatus: vi.fn(),
  },
}))

describe('Admin Route Guards & Layout Integration', () => {
  let queryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })
  })

  const renderWithAuth = (authValue, initialPath = '/admin/sports') => {
    return render(
      <QueryClientProvider client={queryClient}>
        <AuthContext.Provider value={authValue}>
          <MemoryRouter initialEntries={[initialPath]}>
            <Routes>
              <Route path="/login" element={<div>Login Page View</div>} />
              <Route path="/" element={<div>Home Landing View</div>} />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requireAdmin={true}>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="sports" element={<SportsPage />} />
              </Route>
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>
      </QueryClientProvider>
    )
  }

  it('redirects unauthenticated users to /login', () => {
    renderWithAuth({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      isAdmin: false,
      login: vi.fn(),
      logout: vi.fn(),
    })

    expect(screen.getByText('Login Page View')).toBeInTheDocument()
    expect(screen.queryByText(/Sports Inventory/i)).not.toBeInTheDocument()
  })

  it('redirects authenticated customers away from admin routes', () => {
    renderWithAuth({
      user: { id: 'u1', name: 'John Customer', email: 'cust@example.com', role: 'customer' },
      isLoading: false,
      isAuthenticated: true,
      isAdmin: false,
      login: vi.fn(),
      logout: vi.fn(),
    })

    expect(screen.getByText('Home Landing View')).toBeInTheDocument()
    expect(screen.queryByText(/Sports Inventory/i)).not.toBeInTheDocument()
  })

  it('allows verified administrators and renders the admin layout and sports table', async () => {
    renderWithAuth({
      user: { id: 'admin1', name: 'Super Admin', email: 'admin@turf.com', role: 'admin' },
      isLoading: false,
      isAuthenticated: true,
      isAdmin: true,
      login: vi.fn(),
      logout: vi.fn(),
    })

    // Verify Admin Header / Sidebar is present
    expect(screen.getByText('Super Admin')).toBeInTheDocument()
    expect(screen.getAllByText('TURF')[0]).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Turf Arenas/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Add-Ons/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Homepage Banners/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Business Settings/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /^Home$/i })).toBeInTheDocument()

    // Verify SportsPage content loaded from service
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1, name: /Sports Inventory/i })).toBeInTheDocument()
      expect(screen.getByText('Box Cricket')).toBeInTheDocument()
      expect(screen.getByText('box-cricket')).toBeInTheDocument()
    })
  })
})
