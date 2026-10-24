import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the turf booking platform title', () => {
    render(<App />)
    expect(screen.getByText(/Turf Booking/i)).toBeInTheDocument()
    expect(screen.getByText(/Step 1: Project Initialized/i)).toBeInTheDocument()
  })

  it('renders customer and admin preview modules', () => {
    render(<App />)
    expect(screen.getByText(/Customer Portal/i)).toBeInTheDocument()
    expect(screen.getByText(/Admin Panel/i)).toBeInTheDocument()
  })
})
