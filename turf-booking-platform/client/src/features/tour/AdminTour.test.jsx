import React from 'react'
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AdminTourProvider, useAdminTour } from './AdminTourContext'
import { adminTourSteps } from './adminTourSteps'
import { AuthContext } from '../auth/context/AuthContext'
import { MemoryRouter } from 'react-router-dom'
import { AdminLayout } from '../../layouts/AdminLayout'

// Mock driver.js
const mockDriverInstance = {
  drive: vi.fn(),
  destroy: vi.fn(),
  hasNextStep: vi.fn().mockReturnValue(false),
}

let lastDriverConfig = null

vi.mock('driver.js', () => ({
  driver: vi.fn((config) => {
    lastDriverConfig = config
    return mockDriverInstance
  }),
}))

// Helper wrapper component with mock auth
const renderWithAuth = (
  ui,
  {
    user = { id: 'admin-1', name: 'Super Admin', email: 'admin@turf.com', role: 'admin' },
    isAuthenticated = true,
    isAdmin = true,
    isLoading = false,
  } = {}
) => {
  const authValue = {
    user,
    isAuthenticated,
    isAdmin,
    isLoading,
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
    refreshUser: vi.fn(),
  }

  return render(
    <MemoryRouter>
      <AuthContext.Provider value={authValue}>
        {ui}
      </AuthContext.Provider>
    </MemoryRouter>
  )
}

// Test trigger component to test useAdminTour
const TourTestComponent = () => {
  const { startTour, skipTour } = useAdminTour()
  return (
    <div>
      <button onClick={startTour}>Manual Launch Tour</button>
      <button onClick={skipTour}>Manual Skip Tour</button>
    </div>
  )
}

describe('Admin Web Tour Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    lastDriverConfig = null
    window.localStorage.clear()
  })

  afterEach(() => {
    window.localStorage.clear()
  })

  it('1. shows Welcome Modal automatically to an authenticated admin when webTourPrompted is not set', async () => {
    renderWithAuth(
      <AdminTourProvider>
        <div>Admin Content</div>
      </AdminTourProvider>
    )

    expect(screen.getByText('Welcome to Your Admin Panel! 👋')).toBeInTheDocument()
    expect(
      screen.getByText(/Let's take a quick tour to help you discover the important features/i)
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Start Tour/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Skip Tour$/i })).toBeInTheDocument()
    expect(window.localStorage.getItem('webTourPrompted')).toBeNull()
  })

  it('2. does NOT show Welcome Modal while auth is loading', () => {
    renderWithAuth(
      <AdminTourProvider>
        <div>Admin Content</div>
      </AdminTourProvider>,
      { isLoading: true, isAuthenticated: false, isAdmin: false }
    )

    expect(screen.queryByText('Welcome to Your Admin Panel! 👋')).not.toBeInTheDocument()
  })

  it('3. does NOT show Admin Welcome Modal to customers or unauthenticated guests', () => {
    renderWithAuth(
      <AdminTourProvider>
        <div>Customer Content</div>
      </AdminTourProvider>,
      {
        user: { id: 'cust-1', name: 'John Doe', role: 'customer' },
        isAuthenticated: true,
        isAdmin: false,
      }
    )

    expect(screen.queryByText('Welcome to Your Admin Panel! 👋')).not.toBeInTheDocument()
  })

  it('4. clicking "Skip Tour" marks webTourPrompted="true" and closes the modal without launching driver', async () => {
    renderWithAuth(
      <AdminTourProvider>
        <div>Admin Content</div>
      </AdminTourProvider>
    )

    const skipButton = screen.getByRole('button', { name: /^Skip Tour$/i })
    fireEvent.click(skipButton)

    expect(window.localStorage.getItem('webTourPrompted')).toBe('true')
    expect(screen.queryByText('Welcome to Your Admin Panel! 👋')).not.toBeInTheDocument()
    expect(mockDriverInstance.drive).not.toHaveBeenCalled()
  })

  it('5. clicking "Start Tour" closes modal, launches driver.js, and saves webTourPrompted="true" on completion', async () => {
    renderWithAuth(
      <AdminTourProvider>
        <div>Admin Content</div>
      </AdminTourProvider>
    )

    const startButton = screen.getByRole('button', { name: /Start Tour/i })
    fireEvent.click(startButton)

    // Modal closes immediately
    expect(screen.queryByText('Welcome to Your Admin Panel! 👋')).not.toBeInTheDocument()

    // Wait for driver to be instantiated and driven
    await waitFor(() => {
      expect(mockDriverInstance.drive).toHaveBeenCalled()
    })

    expect(lastDriverConfig).toBeTruthy()
    expect(lastDriverConfig.steps.length).toBe(11)

    // Simulate completion / exit callback from driver
    act(() => {
      lastDriverConfig.onDestroyStarted()
    })

    expect(window.localStorage.getItem('webTourPrompted')).toBe('true')
    expect(mockDriverInstance.destroy).toHaveBeenCalled()

    // Completion toast should appear
    expect(screen.getByText(/You're All Set! 🎉/i)).toBeInTheDocument()
  })

  it('6. does NOT show the modal on reload/subsequent visits when webTourPrompted="true"', () => {
    window.localStorage.setItem('webTourPrompted', 'true')

    renderWithAuth(
      <AdminTourProvider>
        <div>Admin Content</div>
      </AdminTourProvider>
    )

    expect(screen.queryByText('Welcome to Your Admin Panel! 👋')).not.toBeInTheDocument()
  })

  it('7. allows manual replay of the tour via useAdminTour even when webTourPrompted="true"', async () => {
    window.localStorage.setItem('webTourPrompted', 'true')

    renderWithAuth(
      <AdminTourProvider>
        <TourTestComponent />
      </AdminTourProvider>
    )

    expect(screen.queryByText('Welcome to Your Admin Panel! 👋')).not.toBeInTheDocument()

    const manualLaunchButton = screen.getByRole('button', { name: /Manual Launch Tour/i })
    fireEvent.click(manualLaunchButton)

    await waitFor(() => {
      expect(mockDriverInstance.drive).toHaveBeenCalled()
    })

    // The flag remains 'true'
    expect(window.localStorage.getItem('webTourPrompted')).toBe('true')
  })

  it('8. renders the "Tour Guide" button in AdminLayout header and triggers the tour', async () => {
    window.localStorage.setItem('webTourPrompted', 'true')

    renderWithAuth(<AdminLayout />)

    // Find the desktop Tour Guide button
    const tourGuideBtn = screen.getByRole('button', { name: /Tour Guide/i })
    expect(tourGuideBtn).toBeInTheDocument()

    fireEvent.click(tourGuideBtn)

    await waitFor(() => {
      expect(mockDriverInstance.drive).toHaveBeenCalled()
    })
  })

  it('9. verifies all 11 high-level admin steps have valid data-tour selectors and descriptions', () => {
    expect(adminTourSteps).toHaveLength(11)

    const expectedElements = [
      '[data-tour="admin-dashboard-header"]',
      '[data-tour="dashboard-metrics"]',
      '[data-tour="financial-health"]',
      '[data-tour="schedule-table"]',
      '[data-tour="admin-sidebar"]',
      '[data-tour="nav-turfs"]',
      '[data-tour="nav-bookings"]',
      '[data-tour="nav-blocked-slots"]',
      '[data-tour="nav-sports"]',
      '[data-tour="nav-coupons"]',
      '[data-tour="nav-settings"]',
    ]

    adminTourSteps.forEach((step, index) => {
      expect(step.element).toBe(expectedElements[index])
      expect(step.popover.title).toBeTruthy()
      expect(step.popover.description).toBeTruthy()
    })
  })

  it('10. handles localStorage restrictions or exceptions gracefully without crashing', () => {
    const originalGetItem = window.localStorage.getItem
    const originalSetItem = window.localStorage.setItem

    // Simulate restricted localStorage environment (e.g. private browsing mode)
    window.localStorage.getItem = vi.fn(() => {
      throw new Error('SecurityError: Access is denied')
    })
    window.localStorage.setItem = vi.fn(() => {
      throw new Error('QuotaExceededError')
    })

    expect(() => {
      renderWithAuth(
        <AdminTourProvider>
          <div>Admin Content</div>
        </AdminTourProvider>
      )
    }).not.toThrow()

    // Restore
    window.localStorage.getItem = originalGetItem
    window.localStorage.setItem = originalSetItem
  })
})
