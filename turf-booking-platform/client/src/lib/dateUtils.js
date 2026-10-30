/**
 * Timezone-aware date utilities for TurfSpot
 *
 * Ensures date operations (e.g. today's date, min selectable date, elapsed slots)
 * are calculated in the facility's local timezone (Asia/Kolkata by default)
 * instead of naive UTC which drifts backward by 5.5 hours after midnight.
 */

export const DEFAULT_TIMEZONE = 'Asia/Kolkata'

/**
 * Returns today's date formatted as YYYY-MM-DD in the target timezone
 * @param {string} timezone - e.g. 'Asia/Kolkata'
 * @returns {string} 'YYYY-MM-DD'
 */
export const getTodayDateString = (timezone = DEFAULT_TIMEZONE) => {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date())
  } catch {
    // Fallback to local client date if Intl format fails
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
}

/**
 * Returns current time formatted as HH:mm in the target timezone (24-hour)
 * @param {string} timezone - e.g. 'Asia/Kolkata'
 * @returns {string} 'HH:mm'
 */
export const getCurrentTimeString = (timezone = DEFAULT_TIMEZONE) => {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
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
 * Formats a YYYY-MM-DD date string for user-friendly display
 * @param {string} dateString
 * @returns {string} e.g. 'Sat, 31 Oct 2026'
 */
export const formatDateDisplay = (dateString) => {
  if (!dateString) return ''
  try {
    const [y, m, d] = dateString.split('-').map(Number)
    const dObj = new Date(y, m - 1, d)
    return dObj.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return dateString
  }
}

