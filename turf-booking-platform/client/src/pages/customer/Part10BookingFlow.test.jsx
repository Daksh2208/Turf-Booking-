import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '../../hooks/useApi'
import { AuthContext } from '../../features/auth/context/AuthContext'
import { CheckoutPage } from './CheckoutPage'
import { BookingSuccessPage } from './BookingSuccessPage'
import { MyBookingsPage } from './MyBookingsPage'
import customerBookingService from '../../services/customer/booking.service'
import customerInventoryService from '../../services/customer/inventory.service'
import customerPaymentService from '../../services/customer/payment.service'

const mockUser = {
  _id: 'user-p10-123',
  name: 'Virat Sharma',
  email: 'virat@example.com',
  phone: '9876543210',
  role: 'customer',
}

const mockTurf = {
  _id: 'turf-p10-001',
  name: 'Thunder Arena',
  slug: 'thunder-arena',
  address: {
    street: 'Plot 42 Stadium Road',
    city: 'Mumbai',
    state: 'Maharashtra',
    zipCode: '400001',
  },
  openingHours: { open: '06:00', close: '23:00' },
  pricing: {
    baseRate: 100000,
    peakRate: 150000,
    weekendRate: 120000,
  },
}

const mockQuote = {
  turf: { id: 'turf-p10-001', name: 'Thunder Arena' },
  date: '2026-11-10',
  timeRange: { startTime: '18:00', endTime: '19:00', durationHours: 1 },
  hourlySegments: [
    {
      startTime: '18:00',
      endTime: '19:00',
      durationHours: 1,
      rateType: 'peak',
      hourlyRate: 150000,
      segmentPrice: 150000,
    },
  ],
  turfSubtotal: 150000,
  addOns: [
    {
      addOnId: 'addon-1',
      name: 'Pro Football Bibs',
      unitPrice: 20000,
      quantity: 1,
      totalAmount: 20000,
    },
  ],
  addOnsSubtotal: 20000,
  subtotal: 170000,
  tax: {
    taxEnabled: true,
    taxName: 'GST',
    taxPercentage: 18,
    taxAmount: 30600,
  },
  finalTotal: 200600,
}

const mockBooking = {
  _id: 'b-p10-999',
  bookingId: 'TB-261110-8842',
  user: mockUser,
  turf: mockTurf,
  date: '2026-11-10',
  startTime: '18:00',
  endTime: '19:00',
  contactDetails: {
    name: 'Virat Sharma',
    email: 'virat@example.com',
    phone: '9876543210',
  },
  slotPrice: 150000,
  addOns: [
    {
      addOn: 'addon-1',
      name: 'Pro Football Bibs',
      price: 20000,
      quantity: 1,
      totalPrice: 20000,
    },
  ],
  addOnsTotal: 20000,
  subtotal: 170000,
  taxRatePercentage: 18,
  taxAmount: 30600,
  totalAmount: 200600,
  status: 'confirmed',
  paymentStatus: 'unpaid',
  paymentMethod: 'Pay at Venue',
  createdAt: '2026-10-24T12:00:00.000Z',
}

const renderWithProviders = (ui, { route = '/', state = null } = {}) => {
  const queryClient = new QueryClient()
  return render(
    <MemoryRouter initialEntries={state ? [{ pathname: route, state }] : [route]}>
      <AuthContext.Provider
        value={{
          user: mockUser,
          isAuthenticated: true,
          isLoading: false,
          login: vi.fn(),
          logout: vi.fn(),
        }}
      >
        <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
      </AuthContext.Provider>
    </MemoryRouter>
  )
}

describe('Part 10 Frontend: Checkout, Booking Confirmation & My Bookings', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(customerInventoryService, 'getTurfById').mockResolvedValue(mockTurf)
    vi.spyOn(customerBookingService, 'getPricingQuote').mockResolvedValue(mockQuote)
    vi.spyOn(customerBookingService, 'createBooking').mockResolvedValue(mockBooking)
    vi.spyOn(customerBookingService, 'getBookingById').mockResolvedValue(mockBooking)
    vi.spyOn(customerBookingService, 'getMyBookings').mockResolvedValue({
      bookings: [mockBooking],
      pagination: { page: 1, totalPages: 1, total: 1 },
    })
    vi.spyOn(customerPaymentService, 'getStripeConfig').mockResolvedValue({ enabled: true, publishableKey: 'pk_test' })
    vi.spyOn(customerPaymentService, 'createCheckoutSession').mockResolvedValue({ url: 'https://checkout.stripe.com/test-session' })
    vi.spyOn(customerInventoryService, 'getSettings').mockResolvedValue({
      partialPaymentSettings: { enabled: true, advancePercentage: 20 },
    })
  })

  it('1. CheckoutPage displays arena, slot, contact fields, and authoritative price quote', async () => {
    renderWithProviders(<CheckoutPage />, {
      route: '/checkout',
      state: {
        turfId: mockTurf._id,
        turf: mockTurf,
        date: '2026-11-10',
        startTime: '18:00',
        endTime: '19:00',
        selectedAddOns: [{ addOnId: 'addon-1', quantity: 1 }],
      },
    })

    // Arena name and time slot
    expect(screen.getByText('Thunder Arena')).toBeInTheDocument()
    expect(screen.getByText(/18:00 - 19:00/i)).toBeInTheDocument()

    // Contact inputs prefilled from logged-in user
    expect(screen.getByDisplayValue('Virat Sharma')).toBeInTheDocument()
    expect(screen.getByDisplayValue('virat@example.com')).toBeInTheDocument()
    expect(screen.getByDisplayValue('9876543210')).toBeInTheDocument()

    // Wait for server-calculated price quote
    await waitFor(() => {
      expect(screen.getByText('Pro Football Bibs × 1')).toBeInTheDocument()
      expect(screen.getByText('GST (18%)')).toBeInTheDocument()
      expect(screen.getAllByText(/2006\.00/).length).toBeGreaterThanOrEqual(1)
    })

    // Partial Advance option clearly highlighted with dynamic percentage
    expect(screen.getByText(/Advance Online, Remaining at Venue/i)).toBeInTheDocument()
  })

  it('2. CheckoutPage enforces validation if contact details are cleared', async () => {
    renderWithProviders(<CheckoutPage />, {
      route: '/checkout',
      state: {
        turfId: mockTurf._id,
        turf: mockTurf,
        date: '2026-11-10',
        startTime: '18:00',
        endTime: '19:00',
        selectedAddOns: [],
      },
    })

    await waitFor(() => {
      expect(screen.getAllByText(/2006\.00/).length).toBeGreaterThanOrEqual(1)
    })

    // Clear name and phone inputs
    const nameInput = screen.getByDisplayValue('Virat Sharma')
    fireEvent.change(nameInput, { target: { value: '' } })

    const submitBtn = screen.getByRole('button', { name: /Pay.*with Stripe/i })
    fireEvent.click(submitBtn)

    expect(screen.getByText(/Full name is required for booking/i)).toBeInTheDocument()
    expect(customerPaymentService.createCheckoutSession).not.toHaveBeenCalled()
  })

  it('3. CheckoutPage successfully submits booking with Pay at Venue and idempotency', async () => {
    // Mock window.location
    delete window.location
    window.location = { href: '', origin: 'http://localhost:3000' }

    renderWithProviders(
      <Routes>
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/bookings/success/:id" element={<BookingSuccessPage />} />
      </Routes>,
      {
        route: '/checkout',
        state: {
          turfId: mockTurf._id,
          turf: mockTurf,
          date: '2026-11-10',
          startTime: '18:00',
          endTime: '19:00',
          selectedAddOns: [{ addOnId: 'addon-1', quantity: 1 }],
        },
      }
    )

    await waitFor(() => {
      expect(screen.getAllByText(/2006\.00/).length).toBeGreaterThanOrEqual(1)
    })

    const submitBtn = screen.getByRole('button', { name: /Pay.*with Stripe/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(customerPaymentService.createCheckoutSession).toHaveBeenCalledWith(
        expect.objectContaining({
          bookingData: expect.objectContaining({
            turfId: mockTurf._id,
            date: '2026-11-10',
            startTime: '18:00',
            endTime: '19:00',
            paymentPlan: 'partial_advance',
            contactDetails: {
              name: 'Virat Sharma',
              email: 'virat@example.com',
              phone: '9876543210',
            },
          }),
        }),
        expect.stringMatching(/^IDEM-/)
      )
    })
  })

  it('4. BookingSuccessPage displays verified booking reference, unpaid status, and breakdown', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/bookings/success/:id" element={<BookingSuccessPage />} />
      </Routes>,
      {
        route: `/bookings/success/${mockBooking._id}`,
      }
    )

    expect(await screen.findByText('Booking Confirmed!')).toBeInTheDocument()
    expect(screen.getAllByText(/TB-261110-8842/).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Thunder Arena')).toBeInTheDocument()
    expect(screen.getAllByText(/Pay at Venue/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/2006\.00/).length).toBeGreaterThanOrEqual(1)
  })

  it('5. BookingSuccessPage handles cancelled or failed bookings accurately with void notice', async () => {
    const cancelledBooking = {
      ...mockBooking,
      status: 'cancelled',
      paymentStatus: 'failed',
      cancellationReason: 'Payment timed out or cancelled by customer',
    }
    customerBookingService.getBookingById.mockResolvedValueOnce(cancelledBooking)

    renderWithProviders(
      <Routes>
        <Route path="/bookings/success/:id" element={<BookingSuccessPage />} />
      </Routes>,
      {
        route: `/bookings/success/${cancelledBooking._id}`,
      }
    )

    expect(await screen.findByText('Booking Cancelled')).toBeInTheDocument()
    expect(screen.queryByText('Booking Confirmed!')).not.toBeInTheDocument()
    expect(screen.getByText(/Pass Status: Cancelled & Void/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Rebook Arena Slot/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Download Ticket Pass/i })).not.toBeInTheDocument()
  })

  it('6. MyBookingsPage renders customer bookings, status badges, and filter tabs', async () => {
    renderWithProviders(<MyBookingsPage />, {
      route: '/my-bookings',
    })

    await waitFor(() => {
      expect(screen.getByText('My Bookings')).toBeInTheDocument()
      expect(screen.getByText('TB-261110-8842')).toBeInTheDocument()
      expect(screen.getByText('Thunder Arena')).toBeInTheDocument()
      expect(screen.getByText(/Pay at Venue \(unpaid\)/i)).toBeInTheDocument()
    })

    // Filter tabs exist
    expect(screen.getByRole('button', { name: /^All/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Upcoming/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Today/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Past/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Cancelled/i })).toBeInTheDocument()

    // Test clicking a filter tab
    fireEvent.click(screen.getByRole('button', { name: /^Cancelled/i }))
    await waitFor(() => {
      expect(customerBookingService.getMyBookings).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'cancelled',
        })
      )
    })
  })

  it('7. MyBookingsPage displays View Details and Rebook instead of View Pass for cancelled bookings', async () => {
    const cancelledBooking = {
      ...mockBooking,
      status: 'cancelled',
      paymentStatus: 'failed',
    }
    customerBookingService.getMyBookings.mockResolvedValueOnce({
      bookings: [cancelledBooking],
      pagination: { page: 1, totalPages: 1, total: 1 },
    })

    renderWithProviders(<MyBookingsPage />, {
      route: '/my-bookings',
    })

    await waitFor(() => {
      expect(screen.getByText('TB-261110-8842')).toBeInTheDocument()
      expect(screen.getByText('View Details')).toBeInTheDocument()
      expect(screen.getByText('Rebook')).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: /View Pass/i })).not.toBeInTheDocument()
    })
  })

  it('8. CheckoutPage restricts Contact Mobile Number to numeric keys and validates length', async () => {
    renderWithProviders(<CheckoutPage />, {
      route: '/checkout',
      state: {
        turfId: mockTurf._id,
        turf: mockTurf,
        date: '2026-11-10',
        startTime: '18:00',
        endTime: '19:00',
        selectedAddOns: [],
      },
    })

    const phoneInput = screen.getByDisplayValue('9876543210')

    // Try pressing an alphabet key - default should be prevented and error displayed
    const allowed = fireEvent.keyDown(phoneInput, { key: 'a' })
    expect(allowed).toBe(false)
    expect(
      screen.getByText(/Only numbers are allowed for contact mobile number/i)
    ).toBeInTheDocument()

    // Enter number starting with 1, 2, 3... (< 6)
    fireEvent.change(phoneInput, { target: { value: '12345' } })
    expect(
      screen.getByText(/Indian mobile numbers must start with 6, 7, 8, or 9/i)
    ).toBeInTheDocument()

    // Enter valid starting digit (6-9) but short (< 10 digits)
    fireEvent.change(phoneInput, { target: { value: '98765' } })
    expect(screen.getByText(/5 \/ 10 digits/i)).toBeInTheDocument()

    // Enter 11-digit number - immediately shows warning and blocks/caps extra digits
    fireEvent.change(phoneInput, { target: { value: '93133266489' } })
    expect(screen.getByText(/Mobile number cannot exceed 10 digits/i)).toBeInTheDocument()

    // Enter valid 10-digit number
    fireEvent.change(phoneInput, { target: { value: '9876543210' } })
    expect(screen.getByText(/Valid 10-digit Indian mobile number/i)).toBeInTheDocument()
    expect(
      screen.queryByText(/Mobile number cannot exceed 10 digits/i)
    ).not.toBeInTheDocument()

    // Try pressing an 11th digit when already at 10 digits
    const extraKeyAllowed = fireEvent.keyDown(phoneInput, { key: '9' })
    expect(extraKeyAllowed).toBe(false)
    expect(screen.getByText(/Indian mobile number cannot exceed 10 digits/i)).toBeInTheDocument()

    // Move to another field (blur) - should clear transient warning because input value has valid 10 digits
    fireEvent.blur(phoneInput)
    expect(
      screen.queryByText(/Indian mobile number cannot exceed 10 digits/i)
    ).not.toBeInTheDocument()
    expect(screen.getByText(/Valid 10-digit Indian mobile number/i)).toBeInTheDocument()
  })
})

