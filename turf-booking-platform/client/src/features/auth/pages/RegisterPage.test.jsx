import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { RegisterPage } from './RegisterPage'
import { AuthContext } from '../context/AuthContext'

describe('RegisterPage Component', () => {
  const mockRegister = vi.fn().mockResolvedValue({ id: 'u1', name: 'Alex Morgan', email: 'alex@example.com' })
  const mockLogin = vi.fn()
  const mockLogout = vi.fn()
  const mockRefreshUser = vi.fn()

  const renderRegister = (contextOverrides = {}) => {
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
          <RegisterPage />
        </MemoryRouter>
      </AuthContext.Provider>
    )
  }

  it('renders all registration form inputs and controls', () => {
    renderRegister()

    expect(
      screen.getByRole('heading', { level: 1, name: /Create Your Account/i })
    ).toBeInTheDocument()
    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Password/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Confirm Password/i)).toBeInTheDocument()
    expect(
      screen.getByRole('checkbox', { name: /Terms of Service/i })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Create Account/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Sign In/i })).toBeInTheDocument()
  })

  it('validates password matching before submitting', async () => {
    renderRegister()

    fireEvent.change(screen.getByLabelText(/Full Name/i), {
      target: { value: 'Alex Morgan' },
    })
    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: 'alex@example.com' },
    })
    fireEvent.change(screen.getByLabelText(/^Password/i), {
      target: { value: 'Password123' },
    })
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), {
      target: { value: 'DifferentPassword' },
    })
    fireEvent.click(screen.getByRole('checkbox', { name: /Terms of Service/i }))

    fireEvent.click(screen.getByRole('button', { name: /Create Account/i }))

    await waitFor(() => {
      expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument()
    })
    expect(mockRegister).not.toHaveBeenCalled()
  })

  it('submits valid registration through register handler', async () => {
    renderRegister()

    fireEvent.change(screen.getByLabelText(/Full Name/i), {
      target: { value: 'Alex Morgan' },
    })
    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: 'alex@example.com' },
    })
    fireEvent.change(screen.getByLabelText(/^Password/i), {
      target: { value: 'Password123' },
    })
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), {
      target: { value: 'Password123' },
    })
    fireEvent.click(screen.getByRole('checkbox', { name: /Terms of Service/i }))

    fireEvent.click(screen.getByRole('button', { name: /Create Account/i }))

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        name: 'Alex Morgan',
        email: 'alex@example.com',
        password: 'Password123',
      })
    })
  })

  it('requires acceptance of Terms of Service', async () => {
    renderRegister()

    fireEvent.change(screen.getByLabelText(/Full Name/i), {
      target: { value: 'Alex Morgan' },
    })
    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: 'alex@example.com' },
    })
    fireEvent.change(screen.getByLabelText(/^Password/i), {
      target: { value: 'Password123' },
    })
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), {
      target: { value: 'Password123' },
    })
    // Leave terms unchecked

    fireEvent.click(screen.getByRole('button', { name: /Create Account/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/You must agree to the Terms of Service/i)
      ).toBeInTheDocument()
    })
  })
})
