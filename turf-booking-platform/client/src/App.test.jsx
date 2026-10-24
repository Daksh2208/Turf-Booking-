import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import App from './App'
import authService from './services/auth.service'

vi.mock('./services/auth.service', () => ({
  authService: {
    getMe: vi.fn().mockResolvedValue({ data: { user: null } }),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn().mockResolvedValue({}),
  },
  default: {
    getMe: vi.fn().mockResolvedValue({ data: { user: null } }),
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn().mockResolvedValue({}),
  },
}))

describe('App Root Routing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders landing placeholder on default route', async () => {
    render(<App />)

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { level: 1, name: /Sports Turf Booking/i })
      ).toBeInTheDocument()
    })
    expect(screen.getAllByRole('link', { name: /Sign In/i }).length).toBeGreaterThanOrEqual(1)
    expect(
      screen.getAllByRole('link', { name: /Create Account/i }).length
    ).toBeGreaterThanOrEqual(1)
  })
})
