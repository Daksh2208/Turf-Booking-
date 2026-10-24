import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AuthContext } from '../../features/auth/context/AuthContext'
import { UserSettingsPage } from './UserSettingsPage'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('UserSettingsPage Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const renderPage = (authValue) => {
    return render(
      <AuthContext.Provider value={authValue}>
        <MemoryRouter initialEntries={['/settings']}>
          <Routes>
            <Route path="/settings" element={<UserSettingsPage />} />
            <Route path="/" element={<div>Home Page</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    )
  }

  it('renders user details and the Sign Out button inside the Settings page', () => {
    const mockLogout = vi.fn().mockResolvedValue()
    renderPage({
      user: { id: 'u1', name: 'Daksh User', email: 'daksh@example.com', role: 'customer' },
      isAuthenticated: true,
      isAdmin: false,
      logout: mockLogout,
    })

    expect(screen.getByRole('heading', { level: 1, name: /Account Settings/i })).toBeInTheDocument()
    expect(screen.getAllByText('Daksh User')[0]).toBeInTheDocument()
    expect(screen.getAllByText('daksh@example.com')[0]).toBeInTheDocument()
    expect(screen.getAllByText(/customer/i)[0]).toBeInTheDocument()

    // Sign Out button must be present inside the Settings page
    const signOutBtn = screen.getByRole('button', { name: /Sign Out/i })
    expect(signOutBtn).toBeInTheDocument()

    // Admin Console link should NOT be shown for customer
    expect(screen.queryByText(/Administrator Management/i)).not.toBeInTheDocument()
  })

  it('renders administrator management card when logged in as admin', () => {
    renderPage({
      user: { id: 'a1', name: 'Admin Boss', email: 'admin@turfbooking.com', role: 'admin' },
      isAuthenticated: true,
      isAdmin: true,
      logout: vi.fn(),
    })

    expect(screen.getByText('Administrator Management')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Open Admin Console/i })).toBeInTheDocument()
  })

  it('calls logout when the Sign Out button inside Settings is clicked', async () => {
    const mockLogout = vi.fn().mockResolvedValue()
    renderPage({
      user: { id: 'u1', name: 'Daksh User', email: 'daksh@example.com', role: 'customer' },
      isAuthenticated: true,
      isAdmin: false,
      logout: mockLogout,
    })

    const signOutBtn = screen.getByRole('button', { name: /Sign Out/i })
    fireEvent.click(signOutBtn)

    await waitFor(() => {
      expect(mockLogout).toHaveBeenCalledTimes(1)
      expect(mockNavigate).toHaveBeenCalledWith('/', { replace: true })
    })
  })
})
