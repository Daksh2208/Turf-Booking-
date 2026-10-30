import { describe, it, expect } from 'vitest'
import {
  getBusinessToday,
  getBusinessCurrentTime,
  getSlotTimestamp,
  getBookingTimestamps,
  DEFAULT_TIMEZONE,
} from '../src/utils/dateUtils.js'

describe('Timezone-aware Date & Booking Timestamp Utilities Suite', () => {
  it('returns valid YYYY-MM-DD format for getBusinessToday in Asia/Kolkata', () => {
    const today = getBusinessToday('Asia/Kolkata')
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('returns valid 24-hour HH:mm format for getBusinessCurrentTime in Asia/Kolkata', () => {
    const time = getBusinessCurrentTime('Asia/Kolkata')
    expect(time).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/)
  })

  it('calculates exact epoch timestamp for a given date and time in Asia/Kolkata', () => {
    // 2026-10-31 10:00:00 IST is UTC+05:30 -> 2026-10-31 04:30:00 UTC
    const ts = getSlotTimestamp('2026-10-31', '10:00', 'Asia/Kolkata')
    const expectedUtc = Date.UTC(2026, 9, 31, 4, 30, 0)
    expect(ts).toBe(expectedUtc)
  })

  it('calculates start and end timestamps correctly for standard match', () => {
    const booking = {
      date: '2026-10-31',
      startTime: '10:00',
      endTime: '12:00',
      durationMinutes: 120,
    }
    const { startMs, endMs, timezone } = getBookingTimestamps(booking, 'Asia/Kolkata')
    expect(timezone).toBe('Asia/Kolkata')
    expect(startMs).toBe(Date.UTC(2026, 9, 31, 4, 30, 0))
    expect(endMs).toBe(Date.UTC(2026, 9, 31, 6, 30, 0))
    expect(endMs - startMs).toBe(120 * 60 * 1000)
  })

  it('handles matches crossing midnight correctly (e.g. 23:00 to 01:00)', () => {
    const midnightBooking = {
      date: '2026-10-31',
      startTime: '23:00',
      endTime: '01:00',
      durationMinutes: 120,
    }
    const { startMs, endMs } = getBookingTimestamps(midnightBooking, 'Asia/Kolkata')
    // 23:00 IST is 17:30 UTC
    expect(startMs).toBe(Date.UTC(2026, 9, 31, 17, 30, 0))
    // 01:00 IST next day is 19:30 UTC
    expect(endMs).toBe(Date.UTC(2026, 9, 31, 19, 30, 0))
    expect(endMs - startMs).toBe(120 * 60 * 1000)
    expect(endMs).toBeGreaterThan(startMs)
  })

  it('handles midnight boundary matches correctly (e.g. 23:00 to 00:00)', () => {
    const midnightBoundaryBooking = {
      date: '2026-10-31',
      startTime: '23:00',
      endTime: '00:00',
    }
    const { startMs, endMs } = getBookingTimestamps(midnightBoundaryBooking, 'Asia/Kolkata')
    expect(endMs - startMs).toBe(60 * 60 * 1000)
    expect(endMs).toBeGreaterThan(startMs)
  })
})

