import { describe, it, expect, vi } from 'vitest'
import { getTodayDateString, getCurrentTimeString, formatDateDisplay } from './dateUtils'

describe('dateUtils - Timezone-Aware Midnight Rollover', () => {
  it('1. returns current date in Asia/Kolkata timezone past midnight (e.g. 01:52 AM)', () => {
    // Mock current time to 2026-10-30T20:22:00.000Z (which is 2026-10-31 01:52:00 in Asia/Kolkata)
    const mockTime = new Date('2026-10-30T20:22:00.000Z')
    vi.setSystemTime(mockTime)

    // Naive UTC toISOString would return '2026-10-30'
    expect(mockTime.toISOString().split('T')[0]).toBe('2026-10-30')

    // getTodayDateString with Asia/Kolkata must return '2026-10-31'
    const todayKolkata = getTodayDateString('Asia/Kolkata')
    expect(todayKolkata).toBe('2026-10-31')

    const timeKolkata = getCurrentTimeString('Asia/Kolkata')
    expect(timeKolkata).toBe('01:52')

    vi.useRealTimers()
  })

  it('2. formats date for display accurately', () => {
    expect(formatDateDisplay('2026-10-31')).toBe('Sat, 31 Oct 2026')
  })
})

