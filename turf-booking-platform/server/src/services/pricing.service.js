import mongoose from 'mongoose'
import { Turf } from '../models/Turf.js'
import { AddOn } from '../models/AddOn.js'
import { BusinessSettings } from '../models/BusinessSettings.js'
import couponService from './coupon.service.js'

export const pricingService = {
  /**
   * Helper to deterministically get Day of Week (0=Sunday ... 6=Saturday)
   * from a YYYY-MM-DD string, avoiding machine timezone discrepancies.
   */
  getDayOfWeek(dateStr) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const err = new Error(`Invalid date format "${dateStr}". Expected YYYY-MM-DD.`)
      err.statusCode = 400
      err.code = 'INVALID_DATE_FORMAT'
      throw err
    }
    const [year, month, day] = dateStr.split('-').map(Number)
    const dateObj = new Date(Date.UTC(year, month - 1, day))
    if (isNaN(dateObj.getTime()) || dateObj.getUTCFullYear() !== year || dateObj.getUTCMonth() !== month - 1 || dateObj.getUTCDate() !== day) {
      const err = new Error(`Invalid calendar date "${dateStr}".`)
      err.statusCode = 400
      err.code = 'INVALID_CALENDAR_DATE'
      throw err
    }
    return dateObj.getUTCDay()
  },

  /**
   * Check if a time segment overlaps with a given period [start, end].
   * Handles overnight periods crossing midnight (e.g. 22:00 to 02:00).
   */
  isTimeInPeriod(segStart, segEnd, periodStart, periodEnd) {
    if (periodStart < periodEnd) {
      // Normal within-day interval (e.g. 18:00 to 23:00)
      return segStart < periodEnd && segEnd > periodStart
    }
    if (periodStart > periodEnd) {
      // Midnight-crossing interval (e.g. 22:00 to 02:00)
      return (
        (segStart >= periodStart || segStart < periodEnd) ||
        (segEnd > periodStart || segEnd <= periodEnd)
      )
    }
    return false
  },

  /**
   * Single source of truth for rate type and hourly price for an individual slot segment.
   *
   * Pricing Rules:
   * 1. Standard weekday, non-peak hour: Base Rate
   * 2. Standard weekday, peak hour: Peak Rate (replaces Base Rate)
   * 3. Weekend day, non-peak hour: Weekend Rate (replaces Base Rate)
   * 4. Weekend day + Peak hour: Deterministic max(weekendRate, peakRate)
   */
  getSegmentPricing(turf, dateStr, segStart, segEnd) {
    const dayOfWeek = this.getDayOfWeek(dateStr)
    const weekendDays = turf.pricing?.weekendDays || [0, 6] // default Sun, Sat
    const isWeekend = weekendDays.includes(dayOfWeek)

    const baseRate = turf.pricing?.baseRate
    const defaultPeakRate = turf.pricing?.peakRate
    const weekendRate = turf.pricing?.weekendRate

    if (baseRate === undefined || baseRate === null || !Number.isInteger(baseRate) || baseRate < 0) {
      const err = new Error('Turf is missing valid base hourly rate configuration.')
      err.statusCode = 400
      err.code = 'INVALID_PRICING_CONFIG'
      throw err
    }

    // Determine applicable peak period
    let matchedPeakRate = null
    const peakPeriods = Array.isArray(turf.pricing?.peakPeriods) && turf.pricing.peakPeriods.length > 0
      ? turf.pricing.peakPeriods
      : [
          {
            start: turf.pricing?.peakHours?.start || '18:00',
            end: turf.pricing?.peakHours?.end || '23:00',
            rate: defaultPeakRate,
          },
        ]

    for (const period of peakPeriods) {
      if (this.isTimeInPeriod(segStart, segEnd, period.start, period.end)) {
        matchedPeakRate = period.rate !== undefined && period.rate !== null ? period.rate : defaultPeakRate
        break
      }
    }

    const isPeak = matchedPeakRate !== null

    if (isWeekend && isPeak) {
      // Deterministic rule for overlap: Highest applicable rate
      const effectiveWeekendRate = weekendRate !== undefined && weekendRate !== null ? weekendRate : baseRate
      const effectiveRate = Math.max(effectiveWeekendRate, matchedPeakRate)
      return {
        rateType: 'weekend_peak',
        hourlyRate: effectiveRate,
        segmentPrice: effectiveRate,
      }
    }

    if (isWeekend) {
      const effectiveRate = weekendRate !== undefined && weekendRate !== null ? weekendRate : baseRate
      return {
        rateType: 'weekend',
        hourlyRate: effectiveRate,
        segmentPrice: effectiveRate,
      }
    }

    if (isPeak) {
      return {
        rateType: 'peak',
        hourlyRate: matchedPeakRate,
        segmentPrice: matchedPeakRate,
      }
    }

    return {
      rateType: 'base',
      hourlyRate: baseRate,
      segmentPrice: baseRate,
    }
  },

  /**
   * Split a start and end time (e.g. 17:00 to 20:00) into consecutive 1-hour segments.
   */
  splitIntoHourlySegments(startTime, endTime) {
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      const err = new Error('Start time and end time must be in HH:mm 24-hour format.')
      err.statusCode = 400
      err.code = 'INVALID_TIME_FORMAT'
      throw err
    }

    const [startH, startM] = startTime.split(':').map(Number)
    const [endH, endM] = endTime.split(':').map(Number)

    const startMinutes = startH * 60 + startM
    const endMinutes = endH * 60 + endM

    if (endMinutes <= startMinutes) {
      const err = new Error('End time must be strictly after start time.')
      err.statusCode = 400
      err.code = 'INVALID_TIME_RANGE'
      throw err
    }

    const segments = []
    let current = startMinutes

    while (current < endMinutes) {
      const next = Math.min(current + 60, endMinutes)
      const curH = String(Math.floor(current / 60)).padStart(2, '0')
      const curM = String(current % 60).padStart(2, '0')
      const nxtH = String(Math.floor(next / 60)).padStart(2, '0')
      const nxtM = String(next % 60).padStart(2, '0')

      segments.push({
        startTime: `${curH}:${curM}`,
        endTime: `${nxtH}:${nxtM}`,
        durationFraction: (next - current) / 60,
      })

      current = next
    }

    return segments
  },

  /**
   * Calculate a comprehensive, server-validated pricing quote.
   */
  async calculateQuote({
    turfId,
    date,
    startTime,
    endTime,
    addOns = [],
    playerCount,
    slots,
    selectedSlots,
    couponCode = null,
    sportId = null,
    user = null,
  }) {
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

    // Capacity & Player Count Validation
    const minCap = turf.capacity?.minPlayers || 2
    const maxCap = turf.capacity?.maxPlayers || 22

    let effectivePlayers = minCap
    if (playerCount !== undefined && playerCount !== null && playerCount !== '') {
      effectivePlayers = Number(playerCount)
      if (!Number.isInteger(effectivePlayers) || effectivePlayers < 1) {
        const err = new Error(`Player count must be a positive integer. Received "${playerCount}".`)
        err.statusCode = 400
        err.code = 'INVALID_PLAYER_COUNT'
        throw err
      }

      if (effectivePlayers > maxCap) {
        const err = new Error(
          `Player count (${effectivePlayers}) exceeds turf maximum capacity of ${maxCap} players.`
        )
        err.statusCode = 400
        err.code = 'CAPACITY_EXCEEDED'
        throw err
      }

      if (effectivePlayers < minCap) {
        const err = new Error(
          `Player count (${effectivePlayers}) is below the minimum required capacity of ${minCap} players.`
        )
        err.statusCode = 400
        err.code = 'MIN_PLAYERS_REQUIRED'
        throw err
      }
    }

    if (!date) {
      const err = new Error('Date is required in YYYY-MM-DD format.')
      err.statusCode = 400
      err.code = 'MISSING_DATE'
      throw err
    }

    // Validate day of week
    this.getDayOfWeek(date)

    // Support either explicit discrete slots array OR startTime/endTime range
    const rawSegments = []
    const discreteSlots =
      Array.isArray(slots) && slots.length > 0
        ? slots
        : Array.isArray(selectedSlots) && selectedSlots.length > 0
        ? selectedSlots
        : Array.isArray(arguments[0]?.selectedSlots) && arguments[0].selectedSlots.length > 0
        ? arguments[0].selectedSlots
        : []

    if (Array.isArray(discreteSlots) && discreteSlots.length > 0) {
      for (const item of discreteSlots) {
        const sStart = typeof item === 'string' ? item : item.startTime
        let sEnd = typeof item === 'object' && item.endTime ? item.endTime : null
        if (!sEnd && typeof sStart === 'string') {
          const [h, m] = sStart.split(':').map(Number)
          sEnd = `${String(h + 1).padStart(2, '0')}:${String(m || 0).padStart(2, '0')}`
        }
        if (sStart && sEnd) {
          rawSegments.push({
            startTime: sStart,
            endTime: sEnd,
            durationFraction: 1,
          })
        }
      }
    } else {
      if (!startTime || !endTime) {
        const err = new Error('Start time and end time or slots array are required.')
        err.statusCode = 400
        err.code = 'MISSING_TIMES'
        throw err
      }
      rawSegments.push(...this.splitIntoHourlySegments(startTime, endTime))
    }

    const durationHours = rawSegments.reduce((sum, seg) => sum + seg.durationFraction, 0)

    // Calculate segment breakdowns
    const hourlySegments = []
    let turfSubtotal = 0

    for (const rawSeg of rawSegments) {
      const pricing = this.getSegmentPricing(turf, date, rawSeg.startTime, rawSeg.endTime)
      const segmentPrice = Math.round(pricing.hourlyRate * rawSeg.durationFraction)

      hourlySegments.push({
        startTime: rawSeg.startTime,
        endTime: rawSeg.endTime,
        durationHours: rawSeg.durationFraction,
        rateType: pricing.rateType,
        hourlyRate: pricing.hourlyRate,
        segmentPrice,
      })

      turfSubtotal += segmentPrice
    }

    // Process and validate Add-Ons
    const addOnsBreakdown = []
    let addOnsSubtotal = 0

    if (Array.isArray(addOns) && addOns.length > 0) {
      for (const item of addOns) {
        const itemAddOnId = item.addOnId || item.id
        if (!itemAddOnId) {
          const err = new Error('Add-on ID is required for each add-on selection.')
          err.statusCode = 400
          err.code = 'INVALID_ADDON_SELECTION'
          throw err
        }

        if (!mongoose.Types.ObjectId.isValid(itemAddOnId)) {
          const err = new Error(`Invalid add-on ID format: "${itemAddOnId}".`)
          err.statusCode = 400
          err.code = 'INVALID_ADDON_ID'
          throw err
        }

        const quantity = item.quantity !== undefined ? Number(item.quantity) : 1
        if (!Number.isInteger(quantity) || quantity < 1) {
          const err = new Error(`Add-on quantity must be a positive integer. Received "${item.quantity}".`)
          err.statusCode = 400
          err.code = 'INVALID_ADDON_QUANTITY'
          throw err
        }

        const addon = await AddOn.findById(itemAddOnId)
        if (!addon) {
          const err = new Error(`Add-on with ID "${itemAddOnId}" does not exist.`)
          err.statusCode = 404
          err.code = 'ADDON_NOT_FOUND'
          throw err
        }

        if (!addon.isActive) {
          const err = new Error(`Add-on "${addon.name}" is currently inactive.`)
          err.statusCode = 400
          err.code = 'ADDON_INACTIVE'
          throw err
        }

        let itemTotal = 0
        if (addon.pricingUnit === 'per_hour') {
          itemTotal = Math.round(addon.price * quantity * durationHours)
        } else if (addon.pricingUnit === 'per_player') {
          itemTotal = Math.round(addon.price * quantity * effectivePlayers)
        } else {
          // 'per_booking'
          itemTotal = addon.price * quantity
        }

        addOnsBreakdown.push({
          addOnId: addon._id,
          name: addon.name,
          unitPrice: addon.price,
          quantity,
          pricingUnit: addon.pricingUnit,
          totalAmount: itemTotal,
        })

        addOnsSubtotal += itemTotal
      }
    }

    const preDiscountSubtotal = turfSubtotal + addOnsSubtotal
    let discountAmount = 0
    let couponDetails = null

    if (couponCode && typeof couponCode === 'string' && couponCode.trim()) {
      const couponCalc = await couponService.validateAndCalculateDiscount({
        couponCode: couponCode.trim(),
        preDiscountSubtotal,
        turfId,
        sportId,
        user,
      })
      discountAmount = couponCalc.discountAmount
      couponDetails = {
        couponId: couponCalc.coupon.id,
        code: couponCalc.coupon.code,
        description: couponCalc.coupon.description,
        discountType: couponCalc.coupon.discountType,
        discountValue: couponCalc.coupon.discountValue,
        discountAmount: couponCalc.discountAmount,
        preDiscountSubtotal,
        postDiscountSubtotal: couponCalc.postDiscountSubtotal,
      }
    }

    const taxableAmount = Math.max(0, preDiscountSubtotal - discountAmount)

    // Calculate Tax / GST on post-discount taxable amount
    const settings = await BusinessSettings.getSettings()
    const taxEnabled = Boolean(settings.taxSettings?.taxEnabled)
    const taxName = settings.taxSettings?.taxName || 'GST'
    const taxPercentage = taxEnabled ? Number(settings.taxSettings?.taxRatePercentage) || 0 : 0
    const taxAmount = taxEnabled ? Math.round((taxableAmount * taxPercentage) / 100) : 0
    const finalTotal = taxableAmount + taxAmount

    // Authoritative partial advance calculation from BusinessSettings
    const partialPaymentEnabled = settings.partialPaymentSettings?.enabled !== false
    const advancePercentage = partialPaymentEnabled ? (Number(settings.partialPaymentSettings?.advancePercentage) || 20) : 0
    const advanceAmount = partialPaymentEnabled ? Math.round((finalTotal * advancePercentage) / 100) : finalTotal
    const remainingAmount = finalTotal - advanceAmount

    return {
      turf: {
        id: turf._id,
        name: turf.name,
        slug: turf.slug,
      },
      date,
      timeRange: {
        startTime: startTime || (rawSegments[0] ? rawSegments[0].startTime : ''),
        endTime: endTime || (rawSegments.length > 0 ? rawSegments[rawSegments.length - 1].endTime : ''),
        durationHours,
        selectedSlots: rawSegments.map((s) => s.startTime),
      },
      playerCount: effectivePlayers,
      capacity: {
        minPlayers: minCap,
        maxPlayers: maxCap,
      },
      hourlySegments,
      turfSubtotal,
      addOns: addOnsBreakdown,
      addOnsSubtotal,
      subtotal: preDiscountSubtotal,
      preDiscountSubtotal,
      discountAmount,
      coupon: couponDetails,
      taxableAmount,
      tax: {
        taxEnabled,
        taxName,
        taxPercentage,
        taxAmount,
      },
      finalTotal,
      partialPayment: {
        enabled: partialPaymentEnabled,
        advancePercentage,
        advanceAmount,
        remainingAmount,
      },
      currency: settings.currency || 'INR',
      note: 'Pricing quote estimate only. Slot is not reserved until booking is confirmed.',
    }
  },
}

export default pricingService
