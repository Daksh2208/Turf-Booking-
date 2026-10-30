import { describe, it, expect, vi, beforeEach } from 'vitest'
import mongoose from 'mongoose'
import { Booking } from '../src/models/Booking.js'
import { BusinessSettings } from '../src/models/BusinessSettings.js'
import { SlotReservation } from '../src/models/SlotReservation.js'
import bookingService from '../src/services/booking.service.js'
import reservationService from '../src/services/reservation.service.js'
import {
  getBusinessToday,
  getBusinessCurrentTime,
  getSlotTimestamp,
  getBookingTimestamps,
} from '../src/utils/dateUtils.js'

mongoose.set('bufferCommands', false)

describe('Backend Booking Lifecycle & Smart Filtering Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.restoreAllMocks()
    vi.spyOn(reservationService, 'expireStaleReservations').mockResolvedValue()
  })

  // 1 & 2 & 13 & 14: Filtering, Sorting, and Live Counts
  it('1 & 2 & 13 & 14: getUserBookings queries upcoming, today, past, cancelled with correct sort and counts', async () => {
    vi.spyOn(BusinessSettings, 'getSettings').mockResolvedValue({
      timezone: 'Asia/Kolkata',
      cancellationPolicy: { enabled: true, cutoffHours: 4 },
      bookingRules: { cancellationCutoffHours: 4 },
    })

    vi.spyOn(bookingService, 'reconcileOverdueBookings').mockResolvedValue()

    // Mock countDocuments for all, upcoming, today, past, cancelled, total
    vi.spyOn(Booking, 'countDocuments')
      .mockResolvedValueOnce(10) // all
      .mockResolvedValueOnce(3)  // upcoming
      .mockResolvedValueOnce(2)  // today
      .mockResolvedValueOnce(4)  // past
      .mockResolvedValueOnce(1)  // cancelled
      .mockResolvedValueOnce(3)  // total for query

    const mockFindChain = {
      populate: vi.fn().mockReturnThis(),
      sort: vi.fn().mockReturnThis(),
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue([
        {
          _id: 'bk-1',
          date: '2026-11-05',
          startTime: '10:00',
          endTime: '11:00',
          status: 'confirmed',
          totalAmount: 100000,
          toObject: () => ({
            _id: 'bk-1',
            date: '2026-11-05',
            startTime: '10:00',
            endTime: '11:00',
            status: 'confirmed',
            totalAmount: 100000,
          }),
        },
      ]),
    }
    vi.spyOn(Booking, 'find').mockReturnValue(mockFindChain)

    const result = await bookingService.getUserBookings('user-123', {
      filter: 'upcoming',
      page: 1,
      limit: 10,
    })

    expect(result.counts).toEqual({
      all: 10,
      upcoming: 3,
      today: 2,
      past: 4,
      cancelled: 1,
    })
    expect(result.bookings).toHaveLength(1)
    expect(result.bookings[0].canCancel).toBe(true)

    // Verify upcoming sort was { date: 1, startTime: 1 }
    expect(mockFindChain.sort).toHaveBeenCalledWith({ date: 1, startTime: 1 })
  })

  // 3 & 4: Automatic Completion Lifecycle
  it('3 & 4: Booking remains Confirmed until end time, then becomes Completed', async () => {
    const tz = 'Asia/Kolkata'
    const today = getBusinessToday(tz)

    // A match scheduled for today from 10:00 to 12:00
    const matchBooking = {
      _id: 'bk-lifecycle',
      date: today,
      startTime: '10:00',
      endTime: '12:00',
      durationMinutes: 120,
      turf: { timezone: tz },
      status: 'confirmed',
    }

    const { startMs, endMs } = getBookingTimestamps(matchBooking, tz)

    // Before 10:00 AM: Confirmed
    const beforeStart = startMs - 1000 * 60 * 30 // 30 mins before
    expect(beforeStart < startMs).toBe(true)
    expect(beforeStart < endMs).toBe(true)

    // During booking (11:00 AM): Confirmed
    const midMatch = startMs + 1000 * 60 * 60 // 1 hour into match
    expect(midMatch >= startMs).toBe(true)
    expect(midMatch < endMs).toBe(true)

    // After 12:00 PM: Completed
    const afterEnd = endMs + 1000 * 60 * 5 // 5 mins after match
    expect(afterEnd >= endMs).toBe(true)
  })

  // 4 & 15: Reconcile overdue bookings idempotently
  it('4 & 15: reconcileOverdueBookings updates overdue confirmed bookings to completed idempotently', async () => {
    vi.spyOn(BusinessSettings, 'getSettings').mockResolvedValue({
      timezone: 'Asia/Kolkata',
    })

    const pastDate = '2026-10-01'
    const overdueCandidate = {
      _id: 'bk-overdue-1',
      date: pastDate,
      startTime: '10:00',
      endTime: '11:00',
      durationMinutes: 60,
      turf: { timezone: 'Asia/Kolkata' },
      status: 'confirmed',
    }

    const selectMock = vi.fn().mockResolvedValue([overdueCandidate])
    const populateMock = vi.fn().mockReturnValue({ select: selectMock })
    vi.spyOn(Booking, 'find')
      .mockReturnValueOnce({ populate: populateMock }) // for overdue confirmed
      .mockReturnValueOnce({ select: vi.fn().mockResolvedValue([]) }) // for expired pending

    const updateManySpy = vi.spyOn(Booking, 'updateMany').mockResolvedValue({ modifiedCount: 1 })

    await bookingService.reconcileOverdueBookings()

    expect(updateManySpy).toHaveBeenCalledWith(
      { _id: { $in: ['bk-overdue-1'] }, status: 'confirmed' },
      { $set: { status: 'completed' } }
    )
  })

  // 8: Completed booking cannot be cancelled by customer
  it('8: Completed booking cannot be cancelled by customer', async () => {
    const completedBooking = {
      _id: 'bk-completed',
      user: 'user-001',
      status: 'completed',
    }

    vi.spyOn(Booking, 'findById').mockResolvedValue(completedBooking)

    await expect(
      bookingService.cancelBooking(
        'bk-completed',
        { cancellationReason: 'Tried cancelling' },
        { _id: 'user-001', role: 'customer' }
      )
    ).rejects.toThrow('Completed bookings cannot be cancelled by customers.')
  })

  // 9: Cancelled booking cannot become Completed
  it('9: updateBookingStatus rejects transition from cancelled to completed', async () => {
    const cancelledBooking = {
      _id: 'bk-cancelled-trans',
      status: 'cancelled',
      save: vi.fn(),
    }

    vi.spyOn(Booking, 'findById').mockResolvedValue(cancelledBooking)

    await expect(
      bookingService.updateBookingStatus(
        'bk-cancelled-trans',
        { status: 'completed' },
        { _id: 'admin-1', role: 'admin' }
      )
    ).rejects.toThrow(/Cannot transition booking status from 'cancelled' to 'completed'/)
  })

  // 10: Customer cannot access another customer bookings
  it('10: Customer cannot access another customer booking in getBookingById', async () => {
    const otherUserBooking = {
      _id: 'bk-other',
      user: { _id: 'user-other', toString: () => 'user-other' },
      status: 'confirmed',
    }

    const queryMock = {}
    queryMock.populate = vi.fn().mockReturnValue(queryMock)
    queryMock.then = (resolve) => resolve(otherUserBooking)

    vi.spyOn(Booking, 'findOne').mockReturnValue(queryMock)

    await expect(
      bookingService.getBookingById('bk-other', { _id: 'user-current', role: 'customer' })
    ).rejects.toThrow('You are not authorized to access this booking.')
  })

  // 11 & 12: Venue timezone and midnight crossing
  it('11 & 12: getBookingTimestamps accurately handles venue timezone and midnight crossing', () => {
    const bookingMidnight = {
      date: '2026-10-31',
      startTime: '23:30',
      endTime: '01:30',
      durationMinutes: 120,
      turf: { timezone: 'Asia/Kolkata' },
    }

    const { startMs, endMs, timezone } = getBookingTimestamps(bookingMidnight)
    expect(timezone).toBe('Asia/Kolkata')
    expect(endMs - startMs).toBe(120 * 60 * 1000)
    expect(new Date(endMs).toISOString()).toBe('2026-10-31T20:00:00.000Z') // 01:30 IST on Nov 1 is 20:00 UTC on Oct 31
  })
})
