export const DEFAULT_TIMEZONE = 'Asia/Kolkata'

/**
 * Returns today's date formatted as YYYY-MM-DD in the target business timezone.
 * Avoids UTC boundary drift where new Date().toISOString() returns yesterday's date
 * between 00:00 and 05:30 IST.
 *
 * @param {string} timezone
 * @returns {string} 'YYYY-MM-DD'
 */
export function getBusinessToday(timezone = DEFAULT_TIMEZONE) {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone || DEFAULT_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date())
  } catch {
    return new Date().toISOString().slice(0, 10)
  }
}

/**
 * Returns current time formatted as HH:mm in the target business timezone (24-hour).
 *
 * @param {string} timezone
 * @returns {string} 'HH:mm'
 */
export function getBusinessCurrentTime(timezone = DEFAULT_TIMEZONE) {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone || DEFAULT_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date())
  } catch {
    const now = new Date()
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  }
}

/**
 * Converts a calendar date string (YYYY-MM-DD) and 24-hour time string (HH:mm)
 * in the specified venue timezone into an exact UTC epoch timestamp in milliseconds.
 *
 * @param {string} dateStr - 'YYYY-MM-DD'
 * @param {string} timeStr - 'HH:mm'
 * @param {string} timezone - e.g. 'Asia/Kolkata'
 * @returns {number} Epoch timestamp in milliseconds
 */
export function getSlotTimestamp(dateStr, timeStr, timezone = DEFAULT_TIMEZONE) {
  if (!dateStr || !timeStr) return Date.now()
  const tz = timezone || DEFAULT_TIMEZONE
  try {
    const [year, month, day] = dateStr.split('-').map(Number)
    const [hours, minutes] = timeStr.split(':').map(Number)

    const tentativeUtc = new Date(Date.UTC(year, month - 1, day, hours, minutes))

    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })

    const parts = formatter.formatToParts(tentativeUtc)
    const partMap = {}
    for (const p of parts) partMap[p.type] = p.value

    const tzYear = Number(partMap.year)
    const tzMonth = Number(partMap.month)
    const tzDay = Number(partMap.day)
    let tzHour = Number(partMap.hour)
    if (tzHour === 24) tzHour = 0
    const tzMinute = Number(partMap.minute)

    const asIfUtc = Date.UTC(tzYear, tzMonth - 1, tzDay, tzHour, tzMinute)
    const offsetMs = asIfUtc - tentativeUtc.getTime()

    return tentativeUtc.getTime() - offsetMs
  } catch {
    return new Date(`${dateStr}T${timeStr}:00`).getTime()
  }
}

/**
 * Calculates authoritative UTC epoch start and end timestamps (in milliseconds)
 * for a booking record, respecting the venue timezone and midnight-crossing matches.
 *
 * @param {object} booking - Booking document or object
 * @param {string} [venueTimezone] - Optional timezone override (defaults to booking.turf.timezone or DEFAULT_TIMEZONE)
 * @returns {{ startMs: number, endMs: number, timezone: string }}
 */
export function getBookingTimestamps(booking, venueTimezone) {
  const tz = venueTimezone || booking?.turf?.timezone || DEFAULT_TIMEZONE
  const startMs = getSlotTimestamp(booking.date, booking.startTime, tz)

  let durationMin = 0
  if (booking.durationMinutes && Number(booking.durationMinutes) > 0) {
    durationMin = Number(booking.durationMinutes)
  } else if (booking.startTime && booking.endTime) {
    const [sh, sm] = booking.startTime.split(':').map(Number)
    const [eh, em] = booking.endTime.split(':').map(Number)
    const startMins = sh * 60 + sm
    const endMins = eh * 60 + em
    let diff = endMins - startMins
    if (diff <= 0) {
      // Midnight crossing: e.g. 23:00 to 01:00 or 23:00 to 00:00
      diff += 24 * 60
    }
    durationMin = diff
  } else {
    durationMin = 60
  }

  const endMs = startMs + durationMin * 60 * 1000
  return { startMs, endMs, timezone: tz }
}


