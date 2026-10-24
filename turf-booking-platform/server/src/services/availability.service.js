import mongoose from 'mongoose'
import { Turf } from '../models/Turf.js'
import { Booking } from '../models/Booking.js'
import { BlockedSlot } from '../models/BlockedSlot.js'
import { BusinessSettings } from '../models/BusinessSettings.js'
import pricingService from './pricing.service.js'

export const availabilityService = {
  /**
   * Calculate slot availability and pricing for a specific turf and date.
   *
   * Each slot is strictly assigned one of three statuses:
   * - 'available': can potentially be booked
   * - 'booked': occupied by a confirmed/pending customer booking
   * - 'blocked': unavailable due to admin maintenance, tournament or operational closure
   */
  async getTurfAvailability({ turfId, date }) {
    if (!turfId) {
      const err = new Error('Turf ID is required.')
      err.statusCode = 400
      err.code = 'MISSING_TURF_ID'
      throw err
    }

    if (!mongoose.Types.ObjectId.isValid(turfId)) {
      const err = new Error(`Invalid turf ID format "${turfId}".`)
      err.statusCode = 400
      err.code = 'INVALID_TURF_ID'
      throw err
    }

    const turf = await Turf.findById(turfId)
    if (!turf) {
      const err = new Error('Turf arena not found.')
      err.statusCode = 404
      err.code = 'TURF_NOT_FOUND'
      throw err
    }

    if (!turf.isActive) {
      const err = new Error('Turf arena is currently inactive.')
      err.statusCode = 400
      err.code = 'TURF_INACTIVE'
      throw err
    }

    if (!date) {
      const err = new Error('Date parameter is required in YYYY-MM-DD format.')
      err.statusCode = 400
      err.code = 'MISSING_DATE'
      throw err
    }

    // Deterministically validate calendar date and day of week
    pricingService.getDayOfWeek(date)

    const settings = await BusinessSettings.getSettings()
    const slotDuration = settings.bookingRules?.slotDurationMinutes || 60
    const timezone = turf.timezone || settings.timezone || 'Asia/Kolkata'

    const openTime = turf.openingHours?.open || '06:00'
    const closeTime = turf.openingHours?.close || '23:00'

    const [openH, openM] = openTime.split(':').map(Number)
    const [closeH, closeM] = closeTime.split(':').map(Number)

    const openMinutes = openH * 60 + openM
    let closeMinutes = closeH * 60 + closeM

    // Support overnight operating hours crossing midnight (e.g. 18:00 to 02:00)
    if (closeMinutes <= openMinutes) {
      closeMinutes += 24 * 60
    }

    // Query active customer bookings and admin blocked slots in parallel
    const [activeBookings, blockedSlots] = await Promise.all([
      Booking.find({
        turf: turfId,
        date,
        status: { $in: ['pending', 'confirmed'] },
      }),
      BlockedSlot.find({
        turf: turfId,
        date,
      }),
    ])

    const slots = []

    for (let current = openMinutes; current + slotDuration <= closeMinutes; current += slotDuration) {
      const startH = String(Math.floor((current % (24 * 60)) / 60)).padStart(2, '0')
      const startM = String(current % 60).padStart(2, '0')
      const endH = String(Math.floor(((current + slotDuration) % (24 * 60)) / 60)).padStart(2, '0')
      const endM = String((current + slotDuration) % 60).padStart(2, '0')

      const startTime = `${startH}:${startM}`
      const endTime = `${endH}:${endM}`

      // Check if slot overlaps with any active block
      const blockedMatch = blockedSlots.find((b) => {
        return startTime < b.endTime && endTime > b.startTime
      })

      // Check if slot overlaps with any valid booking
      const bookedMatch = activeBookings.find((b) => {
        if (b.selectedSlots && b.selectedSlots.length > 0) {
          return b.selectedSlots.includes(startTime)
        }
        return startTime < b.endTime && endTime > b.startTime
      })

      let status = 'available'
      let reason = ''
      let note = ''

      if (blockedMatch) {
        status = 'blocked'
        reason = blockedMatch.reason || 'maintenance'
        note = blockedMatch.note || ''
      } else if (bookedMatch) {
        status = 'booked'
        // Never expose sensitive customer details
        reason = 'reserved'
      }

      // Calculate price estimate through Part 7 pricing service
      const pricing = pricingService.getSegmentPricing(turf, date, startTime, endTime)

      slots.push({
        startTime,
        endTime,
        durationMinutes: slotDuration,
        status,
        rateType: pricing.rateType,
        price: pricing.segmentPrice,
        priceFormatted: `₹${(pricing.segmentPrice / 100).toFixed(2)}`,
        ...(reason ? { reason } : {}),
        ...(note ? { note } : {}),
      })
    }

    return {
      turf: {
        id: turf._id,
        name: turf.name,
        slug: turf.slug,
        size: turf.size,
        surface: turf.surface,
      },
      date,
      timezone,
      operatingHours: {
        open: openTime,
        close: closeTime,
      },
      slotDurationMinutes: slotDuration,
      slots,
    }
  },
}

export default availabilityService
