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

const mockConfirmedBooking = {
  _id: 'bk-1001',
  bookingId: 'TB-261110-1001',
  status: 'confirmed',
  date: '2026-11-10',
  startTime: '18:00',
  endTime: '19:00',
  selectedSlots: ['18:00 - 19:00'],
  durationMinutes: 60,
  playerCount: 10,
  paymentStatus: 'paid',
  paymentMethod: 'stripe',
  totalAmount: 150000,
  turf: {
    _id: 'turf-001',
    name: 'Premier Arena Ground',
    slug: 'premier-arena-ground',
    address: {
      street: '123 Stadium Road',
      city: 'Mumbai',
    },
  },
  sport: {
    name: 'Football',
  },
}

describe('Customer Cancellation & Refund Flow', () => {
  let queryClient

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })
  })

  const renderMyBookings = () => {
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

  it('1. opens cancellation modal and displays booking details and full refund estimate', async () => {
    customerBookingService.getMyBookings.mockResolvedValueOnce({
      bookings: [mockConfirmedBooking],
      pagination: { page: 1, totalPages: 1, total: 1 },
    })

    customerBookingService.getCancellationPreview.mockResolvedValueOnce({
      calculation: {
        canCustomerCancel: true,
        refundType: 'full',
        refundPercentage: 100,
        originalAmount: 150000,
        eligibleRefundAmount: 150000,
        nonRefundableAmount: 0,
        hoursRemaining: 36,
        policyExplanation: 'Cancellation is more than 24 hours before booking. 100% refund is eligible.',
      },
    })

    renderMyBookings()

    await waitFor(() => {
      expect(screen.getByText('TB-261110-1001')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /^Cancel$/i })).toBeInTheDocument()
    })

    // Click "Cancel" button on booking card
    fireEvent.click(screen.getByRole('button', { name: /^Cancel$/i }))

    // Verify modal is open and preview was called
    await waitFor(() => {
      expect(customerBookingService.getCancellationPreview).toHaveBeenCalledWith('bk-1001')
      expect(screen.getByText(/Cancel Match Booking/i)).toBeInTheDocument()
      expect(screen.getByText(/Full Refund Eligible \(100%\)/i)).toBeInTheDocument()
      expect(screen.getAllByText(/₹1500\.00/i).length).toBeGreaterThan(0)
      expect(screen.getByText(/Stripe Online Payment/i)).toBeInTheDocument()
    })
  })

  it('2. displays partial refund details for cancellations closer to match start', async () => {
    customerBookingService.getMyBookings.mockResolvedValueOnce({
      bookings: [mockConfirmedBooking],
      pagination: { page: 1, totalPages: 1, total: 1 },
    })

    customerBookingService.getCancellationPreview.mockResolvedValueOnce({
      calculation: {
        canCustomerCancel: true,
        refundType: 'partial',
        refundPercentage: 50,
        originalAmount: 150000,
        eligibleRefundAmount: 75000,
        nonRefundableAmount: 75000,
        hoursRemaining: 18,
        policyExplanation: 'Cancellation is between 12 and 24 hours before match start. 50% refund is eligible.',
      },
    })

    renderMyBookings()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^Cancel$/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /^Cancel$/i }))

    await waitFor(() => {
      expect(screen.getByText(/Partial Refund Eligible \(50%\)/i)).toBeInTheDocument()
      expect(screen.getAllByText(/₹750\.00/i).length).toBe(2)
      expect(screen.getByText(/Cancellation is between 12 and 24 hours before match start/i)).toBeInTheDocument()
    })
  })

  it('3. displays zero refund banner when within non-refundable window', async () => {
    customerBookingService.getMyBookings.mockResolvedValueOnce({
      bookings: [mockConfirmedBooking],
      pagination: { page: 1, totalPages: 1, total: 1 },
    })

    customerBookingService.getCancellationPreview.mockResolvedValueOnce({
      calculation: {
        canCustomerCancel: true,
        refundType: 'zero',
        refundPercentage: 0,
        originalAmount: 150000,
        eligibleRefundAmount: 0,
        nonRefundableAmount: 150000,
        hoursRemaining: 4,
        policyExplanation: 'Cancellation is less than 12 hours before match start. Non-refundable.',
      },
    })

    renderMyBookings()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^Cancel$/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /^Cancel$/i }))

    await waitFor(() => {
      expect(screen.getByText(/No Refund Due \(0%\)/i)).toBeInTheDocument()
      expect(screen.getByText(/Cancellation is less than 12 hours before match start/i)).toBeInTheDocument()
    })
  })

  it('4. displays Pay at Venue notice for pay_at_venue bookings', async () => {
    const venueBooking = {
      ...mockConfirmedBooking,
      paymentMethod: 'pay_at_venue',
      paymentStatus: 'pending',
    }

    customerBookingService.getMyBookings.mockResolvedValueOnce({
      bookings: [venueBooking],
      pagination: { page: 1, totalPages: 1, total: 1 },
    })

    customerBookingService.getCancellationPreview.mockResolvedValueOnce({
      calculation: {
        canCustomerCancel: true,
        refundType: 'not_applicable',
        refundPercentage: 0,
        originalAmount: 150000,
        eligibleRefundAmount: 0,
        nonRefundableAmount: 0,
        hoursRemaining: 25,
        policyExplanation: 'Pay at venue booking - no online charge made.',
      },
    })

    renderMyBookings()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^Cancel$/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /^Cancel$/i }))

    await waitFor(() => {
      expect(screen.getByText('Pay at Venue Booking')).toBeInTheDocument()
      expect(screen.getByText(/No online payment was charged/i)).toBeInTheDocument()
    })
  })

  it('5. submits cancellation with optional reason and updates the list', async () => {
    customerBookingService.getMyBookings
      .mockResolvedValueOnce({
        bookings: [mockConfirmedBooking],
        pagination: { page: 1, totalPages: 1, total: 1 },
      })
      .mockResolvedValueOnce({
        bookings: [
          {
            ...mockConfirmedBooking,
            status: 'cancelled',
            refundStatus: 'succeeded',
            refundAmount: 150000,
          },
        ],
        pagination: { page: 1, totalPages: 1, total: 1 },
      })

    customerBookingService.getCancellationPreview.mockResolvedValueOnce({
      calculation: {
        canCustomerCancel: true,
        refundType: 'full',
        refundPercentage: 100,
        originalAmount: 150000,
        eligibleRefundAmount: 150000,
        nonRefundableAmount: 0,
        hoursRemaining: 36,
        policyExplanation: 'Eligible for 100% refund.',
      },
    })

    customerBookingService.cancelBooking.mockResolvedValueOnce({
      booking: {
        ...mockConfirmedBooking,
        status: 'cancelled',
        refundStatus: 'succeeded',
      },
    })

    renderMyBookings()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^Cancel$/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /^Cancel$/i }))

    await waitFor(() => {
      expect(screen.getByText(/Confirm Cancellation/i)).toBeInTheDocument()
    })

    // Select reason
    const reasonSelect = screen.getByRole('combobox')
    fireEvent.change(reasonSelect, { target: { value: 'Other reason' } })

    const customInput = await screen.findByPlaceholderText(/Please describe reason/i)
    fireEvent.change(customInput, { target: { value: 'Work emergency' } })

    // Click confirm
    const confirmBtn = screen.getByRole('button', { name: /Confirm Cancellation/i })
    fireEvent.click(confirmBtn)

    await waitFor(() => {
      expect(customerBookingService.cancelBooking).toHaveBeenCalledWith('bk-1001', {
        cancellationReason: 'Work emergency',
      })
    })
  })

  it('6. renders refund status badges on cancelled bookings', async () => {
    const cancelledWithRefund = {
      ...mockConfirmedBooking,
      status: 'cancelled',
      refundStatus: 'succeeded',
      refundAmount: 150000,
    }

    customerBookingService.getMyBookings.mockResolvedValueOnce({
      bookings: [cancelledWithRefund],
      pagination: { page: 1, totalPages: 1, total: 1 },
    })

    renderMyBookings()

    await waitFor(() => {
      expect(screen.getByText(/Refunded: ₹1500\.00/i)).toBeInTheDocument()
    })
  })
})
