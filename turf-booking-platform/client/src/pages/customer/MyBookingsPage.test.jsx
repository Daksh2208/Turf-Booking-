import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '../../hooks/useApi'
import { AuthContext } from '../../features/auth/context/AuthContext'
import { MyBookingsPage } from './MyBookingsPage'
import customerBookingService from '../../services/customer/booking.service'

vi.mock('../../services/customer/booking.service', () => ({
  default: {
    getMyBookings: vi.fn(),
    getCancellationPreview: vi.fn(),
    cancelBooking: vi.fn(),
  },
}))

const mockUser = {
  _id: 'user-001',
  name: 'Alex Hunter',
  email: 'alex@example.com',
  role: 'customer',
}

const mockUpcomingBooking = {
  _id: 'bk-upcoming',
  bookingId: 'TB-UPCOMING-01',
  status: 'confirmed',
  date: '2026-11-15',
  startTime: '10:00',
  endTime: '11:00',
  durationMinutes: 60,
  playerCount: 10,
  totalAmount: 120000,
  paymentStatus: 'paid',
  paymentMethod: 'stripe',
  canCancel: true,
  turf: {
    _id: 'turf-01',
    name: 'Wembley Turf Ground',
    address: { street: 'Main Arena Rd', city: 'Mumbai' },
  },
}

const mockTodayBooking = {
  _id: 'bk-today',
  bookingId: 'TB-TODAY-02',
  status: 'confirmed',
  date: '2026-10-31',
  startTime: '18:00',
  endTime: '19:00',
  durationMinutes: 60,
  playerCount: 12,
  totalAmount: 140000,
  paymentStatus: 'unpaid',
  paymentMethod: 'Pay at Venue',
  canCancel: true,
  turf: {
    _id: 'turf-02',
    name: 'Camp Nou Arena',
    address: { street: 'Sports Way', city: 'Ahmedabad' },
  },
}

const mockCompletedBooking = {
  _id: 'bk-completed',
  bookingId: 'TB-COMPLETED-03',
  status: 'completed',
  date: '2026-10-25',
  startTime: '14:00',
  endTime: '15:00',
  durationMinutes: 60,
  playerCount: 10,
  totalAmount: 100000,
  paymentStatus: 'paid',
  paymentMethod: 'stripe',
  canCancel: false,
  turf: {
    _id: 'turf-01',
    name: 'Wembley Turf Ground',
    address: { street: 'Main Arena Rd', city: 'Mumbai' },
  },
}

const mockCancelledBooking = {
  _id: 'bk-cancelled',
  bookingId: 'TB-CANCELLED-04',
  status: 'cancelled',
  date: '2026-10-28',
  startTime: '16:00',
  endTime: '17:00',
  durationMinutes: 60,
  playerCount: 8,
  totalAmount: 90000,
  paymentStatus: 'failed',
  paymentMethod: 'Pay at Venue',
  cancellationReason: 'Rain disrupted plans',
  cancelledAt: '2026-10-27T10:00:00.000Z',
  canCancel: false,
  turf: {
    _id: 'turf-02',
    name: 'Camp Nou Arena',
    address: { street: 'Sports Way', city: 'Ahmedabad' },
  },
}

const mockExpiredBooking = {
  _id: 'bk-expired',
  bookingId: 'TB-EXPIRED-05',
  status: 'expired',
  date: '2026-10-29',
  startTime: '11:00',
  endTime: '12:00',
  durationMinutes: 60,
  playerCount: 10,
  totalAmount: 110000,
  paymentStatus: 'failed',
  paymentMethod: 'stripe',
  paymentFailureReason: 'Payment session expired',
  canCancel: false,
  turf: {
    _id: 'turf-01',
    name: 'Wembley Turf Ground',
    address: { street: 'Main Arena Rd', city: 'Mumbai' },
  },
}

describe('MyBookingsPage - Complete Booking Lifecycle and Smart Filtering Suite', () => {
  let queryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
  })

  const renderPage = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AuthContext.Provider value={{ user: mockUser, isAuthenticated: true, logout: vi.fn() }}>
            <MyBookingsPage />
          </AuthContext.Provider>
        </MemoryRouter>
      </QueryClientProvider>
    )
  }

  it('renders all 5 customer-friendly filters with counts', async () => {
    customerBookingService.getMyBookings.mockResolvedValueOnce({
      bookings: [mockUpcomingBooking, mockTodayBooking],
      pagination: { page: 1, totalPages: 1, total: 2 },
      counts: {
        all: 5,
        upcoming: 1,
        today: 1,
        past: 1,
        cancelled: 1,
      },
    })

    renderPage()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /All/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Upcoming/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Today/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Past/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Cancelled/i })).toBeInTheDocument()
      expect(screen.getByText('5')).toBeInTheDocument()
    })
  })

  it('clicking Upcoming filter fetches upcoming bookings without full page reload', async () => {
    customerBookingService.getMyBookings
      .mockResolvedValueOnce({
        bookings: [mockUpcomingBooking],
        pagination: { page: 1, totalPages: 1, total: 1 },
        counts: { all: 1, upcoming: 1, today: 0, past: 0, cancelled: 0 },
      })
      .mockResolvedValueOnce({
        bookings: [mockUpcomingBooking],
        pagination: { page: 1, totalPages: 1, total: 1 },
        counts: { all: 1, upcoming: 1, today: 0, past: 0, cancelled: 0 },
      })

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('TB-UPCOMING-01')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Upcoming/i }))

    await waitFor(() => {
      expect(customerBookingService.getMyBookings).toHaveBeenCalledWith(
        expect.objectContaining({ filter: 'upcoming' })
      )
    })
  })

  it('displays contextual Cancel button on upcoming confirmed bookings when eligible', async () => {
    customerBookingService.getMyBookings.mockResolvedValueOnce({
      bookings: [mockUpcomingBooking],
      pagination: { page: 1, totalPages: 1, total: 1 },
    })

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('TB-UPCOMING-01')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /^Cancel$/i })).toBeInTheDocument()
      expect(screen.getByText('View Pass')).toBeInTheDocument()
    })
  })

  it('does NOT display Cancel button for completed bookings', async () => {
    customerBookingService.getMyBookings.mockResolvedValueOnce({
      bookings: [mockCompletedBooking],
      pagination: { page: 1, totalPages: 1, total: 1 },
    })

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('TB-COMPLETED-03')).toBeInTheDocument()
      expect(screen.getByText('Completed')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /^Cancel$/i })).not.toBeInTheDocument()
      expect(screen.getByText('View Pass')).toBeInTheDocument()
    })
  })

  it('displays cancellation details and no Cancel button for cancelled bookings', async () => {
    customerBookingService.getMyBookings.mockResolvedValueOnce({
      bookings: [mockCancelledBooking],
      pagination: { page: 1, totalPages: 1, total: 1 },
    })

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('TB-CANCELLED-04')).toBeInTheDocument()
      expect(screen.getAllByText('Cancelled').length).toBeGreaterThanOrEqual(1)
      expect(screen.getByText(/Cancellation Details/i)).toBeInTheDocument()
      expect(screen.getByText(/"Rain disrupted plans"/i)).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /^Cancel$/i })).not.toBeInTheDocument()
      expect(screen.getByText('View Details')).toBeInTheDocument()
    })
  })

  it('displays expired details and no Cancel button for expired hold bookings', async () => {
    customerBookingService.getMyBookings.mockResolvedValueOnce({
      bookings: [mockExpiredBooking],
      pagination: { page: 1, totalPages: 1, total: 1 },
    })

    renderPage()

    await waitFor(() => {
      expect(screen.getByText('TB-EXPIRED-05')).toBeInTheDocument()
      expect(screen.getByText('Expired')).toBeInTheDocument()
      expect(screen.getByText(/Reservation Window Expired/i)).toBeInTheDocument()
      expect(screen.getByText(/Payment session expired/i)).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /^Cancel$/i })).not.toBeInTheDocument()
      expect(screen.getByText('View Details')).toBeInTheDocument()
    })
  })

  it('allows user to filter bookings by calendar date and clear the date filter', async () => {
    customerBookingService.getMyBookings
      .mockResolvedValueOnce({
        bookings: [mockTodayBooking],
        pagination: { page: 1, totalPages: 1, total: 1 },
        counts: { all: 1, upcoming: 0, today: 1, past: 0, cancelled: 0 },
      })
      .mockResolvedValueOnce({
        bookings: [mockTodayBooking],
        pagination: { page: 1, totalPages: 1, total: 1 },
        counts: { all: 1, upcoming: 0, today: 1, past: 0, cancelled: 0 },
      })

    renderPage()

    await waitFor(() => {
      expect(screen.getByLabelText(/Filter bookings by date/i)).toBeInTheDocument()
    })

    const dateInput = screen.getByLabelText(/Filter bookings by date/i)
    fireEvent.change(dateInput, { target: { value: '2026-10-31' } })

    await waitFor(() => {
      expect(customerBookingService.getMyBookings).toHaveBeenCalledWith(
        expect.objectContaining({ date: '2026-10-31' })
      )
      expect(screen.getByText(/Showing matches on/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Show All Dates/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Show All Dates/i }))

    await waitFor(() => {
      expect(customerBookingService.getMyBookings).toHaveBeenCalledWith(
        expect.objectContaining({ date: '' })
      )
    })
  })
})
