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
    expect(
      screen.getAllByRole('link', { name: /Back to Home/i }).length
    ).toBeGreaterThanOrEqual(1)
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
      target: { value: 'Password@123' },
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
      target: { value: 'Password@123' },
    })
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), {
      target: { value: 'Password@123' },
    })
    fireEvent.click(screen.getByRole('checkbox', { name: /Terms of Service/i }))

    fireEvent.click(screen.getByRole('button', { name: /Create Account/i }))

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        name: 'Alex Morgan',
        email: 'alex@example.com',
        password: 'Password@123',
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
      target: { value: 'Password@123' },
    })
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), {
      target: { value: 'Password@123' },
    })
    // Leave terms unchecked

    fireEvent.click(screen.getByRole('button', { name: /Create Account/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/You must agree to the Terms of Service/i)
      ).toBeInTheDocument()
    })
  })

  it('instantly shows "Passwords do not match" as soon as the user types a mismatched confirm password', async () => {
    renderRegister()

    const passwordInput = screen.getByLabelText(/^Password/i)
    const confirmInput = screen.getByLabelText(/Confirm Password/i)

    // User types password
    fireEvent.change(passwordInput, { target: { value: 'Secret@123' } })

    // User starts typing in confirm password that does not match
    fireEvent.change(confirmInput, { target: { value: 'Secret@' } })

    // Error must appear immediately without clicking submit or blurring
    await waitFor(() => {
      expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument()
    })

    // Now complete the matching password
    fireEvent.change(confirmInput, { target: { value: 'Secret@123' } })

    // Error must disappear and success message "Passwords match" should appear
    await waitFor(() => {
      expect(screen.queryByText(/Passwords do not match/i)).not.toBeInTheDocument()
      expect(screen.getByText(/Passwords match/i)).toBeInTheDocument()
    })
  })

  it('immediately invalidates confirm password if original password is later modified', async () => {
    renderRegister()

    const passwordInput = screen.getByLabelText(/^Password/i)
    const confirmInput = screen.getByLabelText(/Confirm Password/i)

    // Initially match both
    fireEvent.change(passwordInput, { target: { value: 'OriginalPass@123' } })
    fireEvent.change(confirmInput, { target: { value: 'OriginalPass@123' } })

    await waitFor(() => {
      expect(screen.getByText(/Passwords match/i)).toBeInTheDocument()
    })

    // User goes back and edits original password
    fireEvent.change(passwordInput, { target: { value: 'ChangedPass@123' } })

    // confirmPassword should immediately show mismatch without manual interaction
    await waitFor(() => {
      expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument()
      expect(screen.queryByText(/Passwords match/i)).not.toBeInTheDocument()
    })
  })

  it('rejects whitespace-only name with immediate validation error', async () => {
    renderRegister()

    const nameInput = screen.getByLabelText(/Full Name/i)

    // Enter only whitespace
    fireEvent.change(nameInput, { target: { value: '    ' } })

    await waitFor(() => {
      expect(
        screen.getByText(/Name must contain at least 2 non-space characters/i)
      ).toBeInTheDocument()
    })

    // Enter a valid name
    fireEvent.change(nameInput, { target: { value: 'Alex Morgan' } })

    await waitFor(() => {
      expect(
        screen.queryByText(/Name must contain at least 2 non-space characters/i)
      ).not.toBeInTheDocument()
    })
  })

  it('clears registration server error alert immediately when user modifies input fields', async () => {
    mockRegister.mockRejectedValueOnce({
      response: { data: { message: 'An account with this email already exists' } },
    })

    renderRegister()

    fireEvent.change(screen.getByLabelText(/Full Name/i), {
      target: { value: 'Alex Morgan' },
    })
    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: 'existing@example.com' },
    })
    fireEvent.change(screen.getByLabelText(/^Password/i), {
      target: { value: 'Password@123' },
    })
    fireEvent.change(screen.getByLabelText(/Confirm Password/i), {
      target: { value: 'Password@123' },
    })
    fireEvent.click(screen.getByRole('checkbox', { name: /Terms of Service/i }))

    fireEvent.click(screen.getByRole('button', { name: /Create Account/i }))

    await waitFor(() => {
      expect(
        screen.getByText(/An account with this email already exists/i)
      ).toBeInTheDocument()
    })

    // Typing a new email should immediately clear the server error alert
    fireEvent.change(screen.getByLabelText(/Email Address/i), {
      target: { value: 'newemail@example.com' },
    })

    await waitFor(() => {
      expect(
        screen.queryByText(/An account with this email already exists/i)
      ).not.toBeInTheDocument()
    })
  })

  it('progressively displays specific password requirement errors in sequence', async () => {
    renderRegister()

    const passwordInput = screen.getByLabelText(/^Password/i)

    // 1. Single character entered (< 8 chars)
    fireEvent.change(passwordInput, { target: { value: 'a' } })
    await waitFor(() => {
      expect(
        screen.getByText(/Password must be at least 8 characters/i)
      ).toBeInTheDocument()
    })

    // 2. 8+ characters entered, but NO letters
    fireEvent.change(passwordInput, { target: { value: '12345678' } })
    await waitFor(() => {
      expect(
        screen.getByText(/Password must contain at least one letter/i)
      ).toBeInTheDocument()
    })

    // 3. 8+ characters with letters, but NO numbers
    fireEvent.change(passwordInput, { target: { value: 'abcdefgh' } })
    await waitFor(() => {
      expect(
        screen.getByText(/Password must contain at least one number/i)
      ).toBeInTheDocument()
    })

    // 4. 8+ characters with letters and numbers, but NO special characters
    fireEvent.change(passwordInput, { target: { value: 'abcdefg1' } })
    await waitFor(() => {
      expect(
        screen.getByText(/Password must contain at least one special character/i)
      ).toBeInTheDocument()
    })

    // 5. Complete all requirements including special character
    fireEvent.change(passwordInput, { target: { value: 'Abcdefg1@' } })
    await waitFor(() => {
      expect(
        screen.queryByText(/Password must be at least 8 characters/i)
      ).not.toBeInTheDocument()
      expect(
        screen.queryByText(/Password must contain at least one letter/i)
      ).not.toBeInTheDocument()
      expect(
        screen.queryByText(/Password must contain at least one number/i)
      ).not.toBeInTheDocument()
      expect(
        screen.queryByText(/Password must contain at least one special character/i)
      ).not.toBeInTheDocument()
      expect(screen.getByText(/Strong password/i)).toBeInTheDocument()
    })
  })
})


