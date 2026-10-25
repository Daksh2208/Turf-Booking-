import mongoose from 'mongoose'
import { Turf } from '../models/Turf.js'
import { Booking } from '../models/Booking.js'
import { BlockedSlot } from '../models/BlockedSlot.js'
import { HeldSlot } from '../models/HeldSlot.js'
import { Reservation } from '../models/Reservation.js'
import { BusinessSettings } from '../models/BusinessSettings.js'
import pricingService from './pricing.service.js'

export const availabilityService = {
  /**
   * Calculate slot availability and pricing for a specific turf and date.
   *
   * Each slot is strictly assigned one of five logical statuses:
   * - 'available': can potentially be booked or held
   * - 'selected_by_me': active temporary reservation held by current customer
   * - 'held': active temporary reservation held by another customer
   * - 'booked': occupied by a confirmed/pending customer booking
   * - 'blocked': unavailable due to admin maintenance, tournament or operational closure
   */
  async getTurfAvailability({ turfId, date, currentUserId }) {
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

    // Lazily expire stale reservations for this turf and date
    const now = new Date()
    const staleRes = await Reservation.find({
      turf: turfId,
      date,
      status: 'active',
      expiresAt: { $lte: now },
    }).select('_id')

    if (staleRes.length > 0) {
      const ids = staleRes.map((r) => r._id)
      await Reservation.updateMany({ _id: { $in: ids } }, { $set: { status: 'expired' } })
      await HeldSlot.updateMany({ reservation: { $in: ids } }, { $set: { status: 'expired' } })
    }

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

    // Query active customer bookings, admin blocked slots, and active held slots in parallel
    const [activeBookings, blockedSlots, activeHeldSlots, userActiveReservation] = await Promise.all([
      Booking.find({
        turf: turfId,
        date,
        status: { $in: ['pending', 'confirmed'] },
      }),
      BlockedSlot.find({
        turf: turfId,
        date,
      }),
      HeldSlot.find({
        turf: turfId,
        date,
        status: 'active',
        expiresAt: { $gt: now },
      }),
      currentUserId
        ? Reservation.findOne({
            turf: turfId,
            date,
            user: currentUserId,
            status: 'active',
            expiresAt: { $gt: now },
          })
        : null,
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

      // Check if slot is temporarily held
      const heldMatch = activeHeldSlots.find((h) => h.slotTime === startTime)

      let status = 'available'
      let reason = ''
      let note = ''
      let isMine = false
      let expiresAt = null

      if (blockedMatch) {
        status = 'blocked'
        reason = blockedMatch.reason || 'maintenance'
        note = blockedMatch.note || ''
      } else if (bookedMatch) {
        status = 'booked'
        // Never expose sensitive customer details
        reason = 'reserved'
      } else if (heldMatch) {
        expiresAt = heldMatch.expiresAt
        if (currentUserId && heldMatch.user.toString() === currentUserId.toString()) {
          status = 'selected_by_me'
          isMine = true
        } else {
          status = 'held'
          isMine = false
          reason = 'held'
        }
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
        isMine: Boolean(isMine),
        ...(reason ? { reason } : {}),
        ...(note ? { note } : {}),
        ...(expiresAt ? { expiresAt } : {}),
      })
    }

    let activeReservationData = null
    if (userActiveReservation) {
      const remainingSeconds = Math.max(
        0,
        Math.round((new Date(userActiveReservation.expiresAt).getTime() - Date.now()) / 1000)
      )
      activeReservationData = {
        id: userActiveReservation._id,
        reservationId: userActiveReservation.reservationId,
        turfId: userActiveReservation.turf,
        date: userActiveReservation.date,
        slots: userActiveReservation.slots,
        startTime: userActiveReservation.startTime,
        endTime: userActiveReservation.endTime,
        expiresAt: userActiveReservation.expiresAt,
        remainingSeconds,
        status: userActiveReservation.status,
      }
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
      activeReservation: activeReservationData,
    }
  },
}

export default availabilityService
