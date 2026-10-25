import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '../../hooks/useApi'
import { CalendarPage } from './CalendarPage'
import adminCalendarService from '../../services/admin/calendar.service'
import adminInventoryService from '../../services/admin/inventory.service'

vi.mock('../../services/admin/calendar.service', () => ({
  adminCalendarService: {
    getCalendarSummary: vi.fn(),
    getDaySchedule: vi.fn(),
    getWeekSchedule: vi.fn(),
    createBlockedSlot: vi.fn(),
    deleteBlockedSlot: vi.fn(),
    getBookingDetails: vi.fn(),
  },
  default: {
    getCalendarSummary: vi.fn(),
    getDaySchedule: vi.fn(),
    getWeekSchedule: vi.fn(),
    createBlockedSlot: vi.fn(),
    deleteBlockedSlot: vi.fn(),
    getBookingDetails: vi.fn(),
  },
}))

vi.mock('../../services/admin/inventory.service', () => ({
  adminInventoryService: {
    getTurfs: vi.fn().mockResolvedValue({
      turfs: [
        { _id: 'turf-1', name: 'Arena One Premier' },
        { _id: 'turf-2', name: 'Arena Two Box' },
      ],
    }),
    getSports: vi.fn().mockResolvedValue({
      sports: [
        { _id: 'sport-1', name: 'Cricket' },
        { _id: 'sport-2', name: 'Football' },
      ],
    }),
  },
  default: {
    getTurfs: vi.fn().mockResolvedValue({
      turfs: [
        { _id: 'turf-1', name: 'Arena One Premier' },
        { _id: 'turf-2', name: 'Arena Two Box' },
      ],
    }),
    getSports: vi.fn().mockResolvedValue({
      sports: [
        { _id: 'sport-1', name: 'Cricket' },
        { _id: 'sport-2', name: 'Football' },
      ],
    }),
  },
}))

describe('Admin CalendarPage Component Suite', () => {
  let queryClient

  const mockMonthSummary = {
    summary: {
      totalBookings: 8,
      occupiedSlots: 12,
      availableSlots: 60,
      heldSlots: 2,
      blockedSlots: 4,
      completedBookings: 3,
      cancelledBookings: 1,
      totalRevenuePaise: 450000,
      totalRevenueFormatted: '₹4,500.00',
    },
    days: [
      {
        date: '2026-10-25',
        isToday: true,
        isPast: false,
        totalBookings: 5,
        occupiedSlots: 7,
        availableSlots: 15,
        blockedSlots: 2,
        heldSlots: 1,
        totalSlots: 24,
        revenuePaise: 250000,
        revenueFormatted: '₹2,500.00',
        hasHighActivity: true,
      },
    ],
    timezone: 'Asia/Kolkata',
    today: '2026-10-25',
  }

  const mockDaySchedule = {
    date: '2026-10-25',
    isToday: true,
    isPast: false,
    timezone: 'Asia/Kolkata',
    turf: {
      _id: 'turf-1',
      name: 'Arena One Premier',
    },
    operatingHours: { open: '06:00', close: '23:00' },
    slotDurationMinutes: 60,
    summary: {
      totalBookings: 3,
      occupiedSlots: 4,
      availableSlots: 12,
      heldSlots: 1,
      blockedSlots: 1,
      revenuePaise: 180000,
      revenueFormatted: '₹1,800.00',
    },
    slots: [
      {
        startTime: '09:00',
        endTime: '10:00',
        durationMinutes: 60,
        status: 'booked',
        booking: {
          _id: 'b1',
          bookingId: 'BK-1001',
          customer: { name: 'Rahul Sharma', email: 'rahul@test.com', phone: '9876543210' },
          sport: { name: 'Cricket' },
          turf: { name: 'Arena One Premier' },
          startTime: '09:00',
          endTime: '10:00',
          durationMinutes: 60,
          status: 'confirmed',
          paymentStatus: 'paid',
          paymentMethod: 'stripe',
          totalAmount: 80000,
          totalAmountFormatted: '₹800.00',
          amountPaid: 80000,
          amountPaidFormatted: '₹800.00',
          amountDue: 0,
          amountDueFormatted: '₹0.00',
        },
      },
      {
        startTime: '10:00',
        endTime: '11:00',
        durationMinutes: 60,
        status: 'blocked',
        blocked: {
          _id: 'blk-1',
          reason: 'maintenance',
          note: 'Turf rolling',
          createdBy: 'Administrator',
        },
      },
      {
        startTime: '11:00',
        endTime: '12:00',
        durationMinutes: 60,
        status: 'available',
        priceFormatted: '₹800.00',
        rateType: 'base',
      },
    ],
  }

  const mockWeekSchedule = {
    startDate: '2026-10-19',
    endDate: '2026-10-25',
    timezone: 'Asia/Kolkata',
    turf: { _id: 'turf-1', name: 'Arena One Premier' },
    operatingHours: { open: '06:00', close: '23:00' },
    slotDurationMinutes: 60,
    days: [
      {
        date: '2026-10-25',
        isToday: true,
        totalBookings: 3,
        occupiedSlots: 4,
        blockedSlots: 1,
        heldSlots: 0,
        revenuePaise: 180000,
        events: [
          {
            id: 'b1',
            type: 'booking',
            bookingId: 'BK-1001',
            title: 'Rahul Sharma',
            startTime: '09:00',
            endTime: '10:00',
            status: 'confirmed',
            paymentStatus: 'paid',
            totalAmountFormatted: '₹800.00',
            customer: { name: 'Rahul Sharma', email: 'rahul@test.com', phone: '9876543210' },
          },
        ],
      },
    ],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    adminCalendarService.getCalendarSummary.mockResolvedValue(mockMonthSummary)
    adminCalendarService.getDaySchedule.mockResolvedValue(mockDaySchedule)
    adminCalendarService.getWeekSchedule.mockResolvedValue(mockWeekSchedule)
  })

  it('renders page title, summary cards, and navigation controls', async () => {
    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <CalendarPage />
        </QueryClientProvider>
      </MemoryRouter>
    )

    // Heading
    expect(screen.getByText('Booking Calendar & Schedule')).toBeInTheDocument()

    // Metric Summary Cards
    await waitFor(() => {
      expect(screen.getByText('Occupied Slots')).toBeInTheDocument()
      expect(screen.getByText('Available Slots')).toBeInTheDocument()
      expect(screen.getByText('Active Holds')).toBeInTheDocument()
      expect(screen.getByText('Blocked Slots')).toBeInTheDocument()
      expect(screen.getByText('Revenue (Paid)')).toBeInTheDocument()
    })

    // Navigation buttons
    expect(screen.getByText('Today')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Month' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Week' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Day' })).toBeInTheDocument()
  })

  it('allows switching to Day View and renders slot-by-slot operational schedule', async () => {
    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <CalendarPage />
        </QueryClientProvider>
      </MemoryRouter>
    )

    // Switch to Day view
    const dayBtn = screen.getByRole('button', { name: 'Day' })
    fireEvent.click(dayBtn)

    await waitFor(() => {
      expect(adminCalendarService.getDaySchedule).toHaveBeenCalled()
      // Should show the booked slot
      expect(screen.getByText('Rahul Sharma')).toBeInTheDocument()
      expect(screen.getByText('BK-1001')).toBeInTheDocument()
      // Should show the blocked slot
      expect(screen.getByText(/Turf rolling/i)).toBeInTheDocument()
      // Should show the available slot
      expect(screen.getByText('11:00 - 12:00')).toBeInTheDocument()
    })
  })

  it('allows switching to Week View and renders time grid', async () => {
    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <CalendarPage />
        </QueryClientProvider>
      </MemoryRouter>
    )

    // Switch to Week view
    const weekBtn = screen.getByRole('button', { name: 'Week' })
    fireEvent.click(weekBtn)

    await waitFor(() => {
      expect(adminCalendarService.getWeekSchedule).toHaveBeenCalled()
      expect(screen.getByText('Time')).toBeInTheDocument()
    })
  })

  it('opens Booking Details modal when clicking a booking in Day View', async () => {
    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <CalendarPage />
        </QueryClientProvider>
      </MemoryRouter>
    )

    // Switch to Day View
    fireEvent.click(screen.getByRole('button', { name: 'Day' }))

    await waitFor(() => {
      expect(screen.getByText('Rahul Sharma')).toBeInTheDocument()
    })

    // Click "View Details"
    const viewDetailsBtn = screen.getByText('View Details')
    fireEvent.click(viewDetailsBtn)

    await waitFor(() => {
      expect(screen.getByText('Booking Reference')).toBeInTheDocument()
      expect(screen.getByText('Customer Information')).toBeInTheDocument()
      expect(screen.getByText('rahul@test.com')).toBeInTheDocument()
      expect(screen.getByText('9876543210')).toBeInTheDocument()
      expect(screen.getByText('Financial Breakdown')).toBeInTheDocument()
      expect(screen.getByText('Manage in Bookings')).toBeInTheDocument()
    })
  })

  it('opens Block Slot modal and validates required fields', async () => {
    render(
      <MemoryRouter>
        <QueryClientProvider client={queryClient}>
          <CalendarPage />
        </QueryClientProvider>
      </MemoryRouter>
    )

    // Click top Block Slot button
    const blockBtn = screen.getByRole('button', { name: /Block Slot/i })
    fireEvent.click(blockBtn)

    await waitFor(() => {
      expect(screen.getByText('Block Arena Time Slot')).toBeInTheDocument()
      expect(screen.getByText('Turf Arena *')).toBeInTheDocument()
      expect(screen.getByText('Confirm & Block Slot')).toBeInTheDocument()
    })
  })
})
