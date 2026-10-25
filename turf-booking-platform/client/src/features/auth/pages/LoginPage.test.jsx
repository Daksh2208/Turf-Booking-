import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { LoginPage } from './LoginPage'
import { AuthContext } from '../context/AuthContext'

describe('LoginPage Component', () => {
  const mockLogin = vi.fn().mockResolvedValue({ id: 'u1', name: 'John Doe', email: 'you@example.com' })
  const mockLogout = vi.fn()
  const mockRegister = vi.fn()
  const mockRefreshUser = vi.fn()

  const renderLogin = (contextOverrides = {}) => {
    const authValue = {
      user: null,
      isLoading: false,
      isAuthenticated: false,
      isAdmin: false,
      login: mockLogin,
      logout: mockLogout,
      register: mockRegister,
      refreshUser: mockRefreshUser,
      ...contextOverrides,
    }

    return render(
      <AuthContext.Provider value={authValue}>
        <MemoryRouter>
          <LoginPage />
        </MemoryRouter>
      </AuthContext.Provider>
    )
  }

  it('renders login form elements with accessible labels', () => {
    renderLogin()

    expect(screen.getByRole('heading', { level: 1, name: /Welcome Back/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Sign In to Account/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Create Account/i })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /Back to Home/i }).length).toBeGreaterThanOrEqual(1)
  })

  it('displays validation errors on invalid submission', async () => {
    renderLogin()

    const submitBtn = screen.getByRole('button', { name: /Sign In to Account/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByText(/Email address is required/i)).toBeInTheDocument()
      expect(screen.getByText(/Password is required/i)).toBeInTheDocument()
    })
  })

  it('submits valid credentials through login handler', async () => {
    renderLogin()

    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: 'user@example.com' },
    })
    fireEvent.change(screen.getByLabelText(/^Password/i), {
      target: { value: 'Secret123' },
    })

    const submitBtn = screen.getByRole('button', { name: /Sign In to Account/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('user@example.com', 'Secret123')
    })
  })

  it('toggles password visibility when the show/hide button is clicked', async () => {
    renderLogin()

    const passwordInput = screen.getByLabelText(/^Password/i)
    const toggleButton = screen.getByRole('button', { name: /Show password/i })

    expect(passwordInput).toHaveAttribute('type', 'password')

    // Click to show password
    fireEvent.click(toggleButton)
    expect(passwordInput).toHaveAttribute('type', 'text')
    expect(screen.getByRole('button', { name: /Hide password/i })).toBeInTheDocument()

    // Click to hide password
    fireEvent.click(screen.getByRole('button', { name: /Hide password/i }))
    expect(passwordInput).toHaveAttribute('type', 'password')
  })

  it('shows password reset placeholder notice when clicked', () => {
    renderLogin()

    const forgotBtn = screen.getByRole('button', { name: /Forgot password\?/i })
    fireEvent.click(forgotBtn)

    expect(screen.getByText(/Password Reset Info/i)).toBeInTheDocument()
  })
})
