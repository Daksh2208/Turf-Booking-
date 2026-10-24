import React from 'react'
import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('App Root Routing', () => {
  it('renders landing placeholder on default route', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { level: 1, name: /Sports Turf Booking/i })
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Sign In/i })).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /Create Account/i })
    ).toBeInTheDocument()
  })
})
