import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { LoginPage } from './LoginPage'

describe('LoginPage Component', () => {
  const renderLogin = () =>
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    )

  it('renders login form elements with accessible labels', () => {
    renderLogin()

    expect(screen.getByRole('heading', { level: 1, name: /Welcome Back/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^Password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Sign In to Account/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Create Account/i })).toBeInTheDocument()
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
