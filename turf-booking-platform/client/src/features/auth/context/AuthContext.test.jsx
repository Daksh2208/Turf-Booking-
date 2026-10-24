import React from 'react'
import { render, screen, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuthProvider, useAuth } from './AuthContext'
import authService from '../../../services/auth.service'

vi.mock('../../../services/auth.service', () => ({
  authService: {
    getMe: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  },
  default: {
    getMe: vi.fn(),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  },
}))

// Test consumer component
const TestConsumer = () => {
  const { user, isAuthenticated, isLoading, login, logout } = useAuth()

  if (isLoading) return <div>Loading Auth...</div>

  return (
    <div>
      <div data-testid="auth-status">{isAuthenticated ? 'authenticated' : 'unauthenticated'}</div>
      <div data-testid="user-name">{user?.name || 'none'}</div>
      <div data-testid="user-role">{user?.role || 'none'}</div>
      <button onClick={() => login('test@example.com', 'Pass1234')}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  )
}

describe('AuthContext & AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('throws error when useAuth is used outside AuthProvider', () => {
    // Suppress console.error in react for this expected boundary failure
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<TestConsumer />)).toThrow('useAuth must be used within an AuthProvider')
    consoleError.mockRestore()
  })

  it('loads authenticated user on mount when valid session exists', async () => {
    authService.getMe.mockResolvedValueOnce({
      data: {
        user: { id: 'u123', name: 'Daksh Admin', email: 'admin@turf.com', role: 'admin' },
      },
    })

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    expect(screen.getByText('Loading Auth...')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated')
      expect(screen.getByTestId('user-name')).toHaveTextContent('Daksh Admin')
      expect(screen.getByTestId('user-role')).toHaveTextContent('admin')
    })
  })

  it('defaults to unauthenticated when no session exists on mount', async () => {
    authService.getMe.mockRejectedValueOnce(new Error('Unauthorized'))

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('unauthenticated')
      expect(screen.getByTestId('user-name')).toHaveTextContent('none')
    })
  })

  it('updates state on login and clears state on logout', async () => {
    authService.getMe.mockRejectedValueOnce(new Error('Unauthorized'))
    authService.login.mockResolvedValueOnce({
      data: {
        user: { id: 'u456', name: 'John Player', email: 'player@turf.com', role: 'customer' },
      },
    })
    authService.logout.mockResolvedValueOnce({})

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('unauthenticated')
    })

    // Perform Login
    await act(async () => {
      screen.getByText('Login').click()
    })

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated')
      expect(screen.getByTestId('user-name')).toHaveTextContent('John Player')
      expect(screen.getByTestId('user-role')).toHaveTextContent('customer')
    })

    // Perform Logout
    await act(async () => {
      screen.getByText('Logout').click()
    })

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('unauthenticated')
      expect(screen.getByTestId('user-name')).toHaveTextContent('none')
    })
  })

  it('clears user state when auth:session-expired event is dispatched', async () => {
    authService.getMe.mockResolvedValueOnce({
      data: {
        user: { id: 'u789', name: 'Session Expired User', email: 'exp@turf.com', role: 'customer' },
      },
    })

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('authenticated')
    })

    // Dispatch expiration event
    act(() => {
      window.dispatchEvent(new CustomEvent('auth:session-expired'))
    })

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('unauthenticated')
      expect(screen.getByTestId('user-name')).toHaveTextContent('none')
    })
  })
})
