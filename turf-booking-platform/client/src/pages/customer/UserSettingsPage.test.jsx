import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AuthContext } from '../../features/auth/context/AuthContext'
import { UserSettingsPage } from './UserSettingsPage'
import authService from '../../services/auth.service'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

vi.mock('../../services/auth.service', () => ({
  default: {
    updateProfile: vi.fn().mockResolvedValue({ message: 'Profile updated successfully.' }),
    changePassword: vi.fn().mockResolvedValue({ message: 'Password changed successfully.' }),
  },
}))

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

  it('renders user details and the Sign Out button inside the Settings page (favourites removed)', () => {
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

    const signOutBtn = screen.getByRole('button', { name: /Sign Out/i })
    expect(signOutBtn).toBeInTheDocument()
    expect(screen.queryByText(/Administrator Management/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Saved Favourites/i)).not.toBeInTheDocument()
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

  it('validates new password with progressive sequential requirements', () => {
    renderPage({
      user: { id: 'u1', name: 'Daksh User', email: 'daksh@example.com', role: 'customer' },
      isAuthenticated: true,
      isAdmin: false,
      logout: vi.fn(),
    })

    const newPwdInput = screen.getByPlaceholderText(/Min 8 chars, letter, number, special char/i)

    // 1-7 chars: length error
    fireEvent.change(newPwdInput, { target: { value: 'short' } })
    expect(screen.getByText(/Password must be at least 8 characters/i)).toBeInTheDocument()

    // 8+ chars but no letter
    fireEvent.change(newPwdInput, { target: { value: '12345678!' } })
    expect(screen.getByText(/Password must contain at least one letter/i)).toBeInTheDocument()

    // 8+ chars, letter, but no number
    fireEvent.change(newPwdInput, { target: { value: 'Abcdefgh!' } })
    expect(screen.getByText(/Password must contain at least one number/i)).toBeInTheDocument()

    // 8+ chars, letter, number, but no special character
    fireEvent.change(newPwdInput, { target: { value: 'Abcdefgh1' } })
    expect(screen.getByText(/Password must contain at least one special character/i)).toBeInTheDocument()

    // Fully valid password meets criteria
    fireEvent.change(newPwdInput, { target: { value: 'SecurePass123!' } })
    expect(screen.getByText(/Strong password/i)).toBeInTheDocument()
  })

  it('validates that new password cannot be identical to current password', () => {
    renderPage({
      user: { id: 'u1', name: 'Daksh User', email: 'daksh@example.com', role: 'customer' },
      isAuthenticated: true,
      isAdmin: false,
      logout: vi.fn(),
    })

    const currentPwdInput = screen.getByPlaceholderText(/Enter your current password/i)
    const newPwdInput = screen.getByPlaceholderText(/Min 8 chars, letter, number, special char/i)

    fireEvent.change(currentPwdInput, { target: { value: 'MyOldPassword123!' } })
    fireEvent.change(newPwdInput, { target: { value: 'MyOldPassword123!' } })

    expect(screen.getByText(/New password cannot be the same as current password/i)).toBeInTheDocument()
  })

  it('validates confirm password matches new password in real-time', () => {
    renderPage({
      user: { id: 'u1', name: 'Daksh User', email: 'daksh@example.com', role: 'customer' },
      isAuthenticated: true,
      isAdmin: false,
      logout: vi.fn(),
    })

    const newPwdInput = screen.getByPlaceholderText(/Min 8 chars, letter, number, special char/i)
    const confirmPwdInput = screen.getByPlaceholderText(/Re-enter new password/i)

    fireEvent.change(newPwdInput, { target: { value: 'SecretPassword99!' } })
    fireEvent.change(confirmPwdInput, { target: { value: 'SecretPassword88!' } })

    expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument()

    fireEvent.change(confirmPwdInput, { target: { value: 'SecretPassword99!' } })
    expect(screen.getByText(/Passwords match/i)).toBeInTheDocument()
  })

  it('submits change password successfully and auto-dismisses message after 3 seconds', async () => {
    vi.useFakeTimers()
    try {
      authService.changePassword.mockResolvedValueOnce({
        success: true,
        message: 'Password changed successfully.',
      })

      renderPage({
        user: { id: 'u1', name: 'Daksh User', email: 'daksh@example.com', role: 'customer' },
        isAuthenticated: true,
        isAdmin: false,
        logout: vi.fn(),
      })

      const currentPwdInput = screen.getByPlaceholderText(/Enter your current password/i)
      const newPwdInput = screen.getByPlaceholderText(/Min 8 chars, letter, number, special char/i)
      const confirmPwdInput = screen.getByPlaceholderText(/Re-enter new password/i)
      const submitBtn = screen.getByRole('button', { name: /Update Password/i })

      fireEvent.change(currentPwdInput, { target: { value: 'CurrentPass123!' } })
      fireEvent.change(newPwdInput, { target: { value: 'NewSecurePass999!' } })
      fireEvent.change(confirmPwdInput, { target: { value: 'NewSecurePass999!' } })

      await act(async () => {
        fireEvent.click(submitBtn)
      })

      expect(authService.changePassword).toHaveBeenCalledWith({
        currentPassword: 'CurrentPass123!',
        newPassword: 'NewSecurePass999!',
      })
      expect(screen.getByText(/Password changed successfully/i)).toBeInTheDocument()
      expect(currentPwdInput.value).toBe('')
      expect(newPwdInput.value).toBe('')
      expect(confirmPwdInput.value).toBe('')

      // Advance 3 seconds
      act(() => {
        vi.advanceTimersByTime(3000)
      })

      expect(screen.queryByText(/Password changed successfully/i)).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('displays backend error message if current password is wrong', async () => {
    authService.changePassword.mockRejectedValueOnce({
      response: {
        data: {
          error: {
            message: 'Current password does not match.',
          },
        },
      },
    })

    renderPage({
      user: { id: 'u1', name: 'Daksh User', email: 'daksh@example.com', role: 'customer' },
      isAuthenticated: true,
      isAdmin: false,
      logout: vi.fn(),
    })

    const currentPwdInput = screen.getByPlaceholderText(/Enter your current password/i)
    const newPwdInput = screen.getByPlaceholderText(/Min 8 chars, letter, number, special char/i)
    const confirmPwdInput = screen.getByPlaceholderText(/Re-enter new password/i)
    const submitBtn = screen.getByRole('button', { name: /Update Password/i })

    fireEvent.change(currentPwdInput, { target: { value: 'WrongOldPass123!' } })
    fireEvent.change(newPwdInput, { target: { value: 'BrandNewPass999!' } })
    fireEvent.change(confirmPwdInput, { target: { value: 'BrandNewPass999!' } })

    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText(/Current password does not match/i)).toBeInTheDocument()
    })
  })
})
