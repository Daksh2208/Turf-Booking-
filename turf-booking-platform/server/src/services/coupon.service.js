import mongoose from 'mongoose'
import { Coupon } from '../models/Coupon.js'
import { CouponRedemption } from '../models/CouponRedemption.js'
import '../models/Sport.js'
import '../models/Turf.js'
import '../models/User.js'

export const couponService = {
  /**
   * Automatically deactivates all coupons whose expiry date has passed.
   * Coupons remain deactivated until an admin re-edits their validity date to the future.
   */
  async autoDeactivateExpiredCoupons() {
    const now = new Date()
    const result = await Coupon.updateMany(
      {
        isDeleted: false,
        isActive: true,
        expiresAt: { $ne: null, $lte: now },
      },
      {
        $set: { isActive: false },
      }
    )
    return result
  },
  /**
   * Normalizes coupon code to uppercase and trimmed.
   */
  normalizeCode(code) {
    if (!code || typeof code !== 'string') return ''
    return code.trim().toUpperCase()
  },

  /**
   * Central validation & discount calculation engine.
   * Pure calculation: does NOT increment usage count or mutate database.
   */
  async validateAndCalculateDiscount({
    couponCode,
    preDiscountSubtotal,
    turfId = null,
    sportId = null,
    user = null,
  }) {
    const normalizedCode = this.normalizeCode(couponCode)
    if (!normalizedCode) {
      const err = new Error('Coupon code is required.')
      err.statusCode = 400
      err.code = 'INVALID_COUPON_CODE'
      throw err
    }

    if (!Number.isInteger(preDiscountSubtotal) || preDiscountSubtotal < 0) {
      const err = new Error('Invalid booking subtotal for coupon calculation.')
      err.statusCode = 400
      err.code = 'INVALID_SUBTOTAL'
      throw err
    }

    // 1. Fetch Coupon
    const coupon = await Coupon.findOne({
      code: normalizedCode,
      isDeleted: false,
    })

    if (!coupon) {
      const err = new Error(`Coupon code "${normalizedCode}" does not exist.`)
      err.statusCode = 404
      err.code = 'COUPON_NOT_FOUND'
      throw err
    }

    // 2. Time Validity Range
    const now = new Date()
    if (coupon.expiresAt && now > coupon.expiresAt) {
      if (coupon.isActive) {
        coupon.isActive = false
        await coupon.save().catch(() => {})
      }
      const err = new Error(`Coupon "${normalizedCode}" has expired on ${coupon.expiresAt.toISOString().slice(0, 10)}.`)
      err.statusCode = 400
      err.code = 'COUPON_EXPIRED'
      throw err
    }

    if (coupon.startAt && now < coupon.startAt) {
      const err = new Error(`Coupon "${normalizedCode}" is not active yet. It begins on ${coupon.startAt.toISOString().slice(0, 10)}.`)
      err.statusCode = 400
      err.code = 'COUPON_NOT_STARTED'
      throw err
    }

    // 3. Active status check
    if (!coupon.isActive) {
      const err = new Error(`Coupon "${normalizedCode}" is currently inactive.`)
      err.statusCode = 400
      err.code = 'COUPON_INACTIVE'
      throw err
    }

    // 4. Global Usage Limit
    if (coupon.usageLimit !== null && coupon.usageLimit !== undefined) {
      if (coupon.usedCount >= coupon.usageLimit) {
        const err = new Error(`Coupon "${normalizedCode}" has reached its maximum total redemptions.`)
        err.statusCode = 400
        err.code = 'COUPON_USAGE_LIMIT_EXCEEDED'
        throw err
      }
    }

    // 5. Per-Customer Usage Limit
    if (user && user._id) {
      const activeUserRedemptions = await CouponRedemption.countDocuments({
        coupon: coupon._id,
        user: user._id,
        status: 'active',
      })

      if (activeUserRedemptions >= coupon.perUserLimit) {
        const err = new Error(
          `You have already used coupon "${normalizedCode}" the maximum allowed number of times (${coupon.perUserLimit}).`
        )
        err.statusCode = 400
        err.code = 'COUPON_USER_LIMIT_EXCEEDED'
        throw err
      }
    }

    // 6. Eligible Turfs Check
    if (Array.isArray(coupon.eligibleTurfs) && coupon.eligibleTurfs.length > 0 && turfId) {
      const turfIdStr = turfId.toString()
      const isEligible = coupon.eligibleTurfs.some((t) => t.toString() === turfIdStr)
      if (!isEligible) {
        const err = new Error(`Coupon "${normalizedCode}" is not applicable to the selected sports turf.`)
        err.statusCode = 400
        err.code = 'COUPON_TURF_NOT_ELIGIBLE'
        throw err
      }
    }

    // 7. Eligible Sports Check
    if (Array.isArray(coupon.eligibleSports) && coupon.eligibleSports.length > 0 && sportId) {
      const sportIdStr = sportId.toString()
      const isEligible = coupon.eligibleSports.some((s) => s.toString() === sportIdStr)
      if (!isEligible) {
        const err = new Error(`Coupon "${normalizedCode}" is not applicable to the selected sport.`)
        err.statusCode = 400
        err.code = 'COUPON_SPORT_NOT_ELIGIBLE'
        throw err
      }
    }

    // 8. Minimum Booking Subtotal Check
    if (coupon.minimumBookingAmount > 0 && preDiscountSubtotal < coupon.minimumBookingAmount) {
      const formattedMin = `₹${(coupon.minimumBookingAmount / 100).toFixed(2)}`
      const formattedSub = `₹${(preDiscountSubtotal / 100).toFixed(2)}`
      const err = new Error(
        `Booking subtotal (${formattedSub}) does not meet the minimum required amount (${formattedMin}) for coupon "${normalizedCode}".`
      )
      err.statusCode = 400
      err.code = 'COUPON_MINIMUM_NOT_MET'
      throw err
    }

    // 9. Calculate Discount Amount
    let discountAmount = 0
    if (coupon.discountType === 'percentage') {
      discountAmount = Math.round((preDiscountSubtotal * coupon.discountValue) / 100)
      if (coupon.maximumDiscountAmount !== null && coupon.maximumDiscountAmount !== undefined) {
        discountAmount = Math.min(discountAmount, coupon.maximumDiscountAmount)
      }
    } else {
      // Fixed discount
      discountAmount = Math.min(coupon.discountValue, preDiscountSubtotal)
    }

    // Never let discount be negative or exceed subtotal
    discountAmount = Math.max(0, Math.min(discountAmount, preDiscountSubtotal))
    const postDiscountSubtotal = Math.max(0, preDiscountSubtotal - discountAmount)

    return {
      coupon: {
        id: coupon._id,
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minimumBookingAmount: coupon.minimumBookingAmount,
        maximumDiscountAmount: coupon.maximumDiscountAmount,
      },
      discountType: coupon.discountType,
      preDiscountSubtotal,
      discountAmount,
      postDiscountSubtotal,
    }
  },

  /**
   * Atomically records a coupon redemption during booking creation.
   * Protects global usageLimit & per-user limit with atomic conditional updates.
   */
  async redeemCouponForBooking({
    couponId,
    couponCode,
    user,
    bookingId,
    discountAmount,
    session = null,
  }) {
    if (!couponId) return null

    // 1. Verify per-user limit immediately before redemption
    const coupon = await Coupon.findById(couponId).session(session)
    if (!coupon || !coupon.isActive || coupon.isDeleted) {
      const err = new Error('Coupon is no longer available.')
      err.statusCode = 400
      err.code = 'COUPON_NOT_AVAILABLE'
      throw err
    }

    const currentRedemptions = await CouponRedemption.countDocuments({
      coupon: coupon._id,
      user: user._id,
      status: 'active',
    }).session(session)

    if (currentRedemptions >= coupon.perUserLimit) {
      const err = new Error(`You have reached the maximum allowed redemptions (${coupon.perUserLimit}) for this coupon.`)
      err.statusCode = 400
      err.code = 'COUPON_USER_LIMIT_EXCEEDED'
      throw err
    }

    // 2. Atomic increment of usedCount if usageLimit condition is met
    const query = {
      _id: couponId,
      isActive: true,
      isDeleted: false,
      $or: [
        { usageLimit: null },
        { usageLimit: { $exists: false } },
        { $expr: { $lt: ['$usedCount', '$usageLimit'] } },
      ],
    }

    const updated = await Coupon.findOneAndUpdate(
      query,
      { $inc: { usedCount: 1 } },
      { new: true, session }
    )

    if (!updated) {
      const err = new Error('Coupon usage limit was exceeded while processing booking.')
      err.statusCode = 409
      err.code = 'COUPON_USAGE_LIMIT_EXCEEDED'
      throw err
    }

    // 3. Create CouponRedemption record linking booking & customer
    const redemptionPayload = {
      coupon: couponId,
      user: user._id,
      booking: bookingId,
      couponCode: couponCode || coupon.code,
      discountAmount,
      status: 'active',
    }

    let redemption
    if (session) {
      const [r] = await CouponRedemption.create([redemptionPayload], { session })
      redemption = r
    } else {
      redemption = await CouponRedemption.create(redemptionPayload)
    }

    return redemption
  },

  /**
   * Alias for releaseCouponOnCancellation to ensure cross-module method call compatibility
   */
  async releaseRedemption(bookingId, session = null) {
    return this.releaseCouponOnCancellation(bookingId, session)
  },

  /**
   * Releases a coupon redemption when a booking is cancelled.
   * Decrements usedCount and marks redemption as released.
   */
  async releaseCouponOnCancellation(bookingId, session = null) {
    const redemption = await CouponRedemption.findOne({
      booking: bookingId,
      status: 'active',
    }).session(session)

    if (!redemption) {
      return null
    }

    // Mark redemption as released
    redemption.status = 'released'
    await redemption.save({ session })

    // Decrement usedCount safely (never below 0)
    await Coupon.findOneAndUpdate(
      { _id: redemption.coupon, usedCount: { $gt: 0 } },
      { $inc: { usedCount: -1 } },
      { session }
    )

    return redemption
  },

  /**
   * Alias for releaseCouponOnCancellation to ensure cross-module method call compatibility
   */
  async releaseRedemption(bookingId, session = null) {
    return this.releaseCouponOnCancellation(bookingId, session)
  },

  // ================= ADMIN CRUD OPERATIONS ================= //

  /**
   * List coupons with pagination, search, and status filters.
   */
  async listCoupons({ page = 1, limit = 20, search = '', status = 'all' }) {
    // Automatically deactivate expired coupons first
    await this.autoDeactivateExpiredCoupons()

    const pageNum = Math.max(1, Number(page) || 1)
    const limitNum = Math.min(100, Math.max(1, Number(limit) || 20))
    const skip = (pageNum - 1) * limitNum

    const filter = { isDeleted: false }

    if (search && search.trim()) {
      const s = search.trim().toUpperCase()
      filter.$or = [
        { code: { $regex: s, $options: 'i' } },
        { description: { $regex: s, $options: 'i' } },
      ]
    }

    const now = new Date()
    if (status === 'active') {
      filter.isActive = true
      filter.$and = [
        { $or: [{ startAt: null }, { startAt: { $lte: now } }] },
        { $or: [{ expiresAt: null }, { expiresAt: { $gte: now } }] },
      ]
    } else if (status === 'inactive') {
      filter.isActive = false
    } else if (status === 'expired') {
      filter.expiresAt = { $lt: now }
    } else if (status === 'scheduled') {
      filter.startAt = { $gt: now }
    }

    const [coupons, total] = await Promise.all([
      Coupon.find(filter)
        .populate('eligibleSports', 'name slug')
        .populate('eligibleTurfs', 'name slug')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      Coupon.countDocuments(filter),
    ])

    return {
      coupons,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    }
  },

  /**
   * Get coupon by ID.
   */
  async getCouponById(id) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      const err = new Error('Invalid coupon ID.')
      err.statusCode = 400
      err.code = 'INVALID_COUPON_ID'
      throw err
    }

    const coupon = await Coupon.findOne({ _id: id, isDeleted: false })
      .populate('eligibleSports', 'name slug')
      .populate('eligibleTurfs', 'name slug')
      .populate('createdBy', 'name email')

    if (!coupon) {
      const err = new Error('Coupon not found.')
      err.statusCode = 404
      err.code = 'COUPON_NOT_FOUND'
      throw err
    }

    // Deactivate if validity expired
    if (coupon.expiresAt && new Date() > coupon.expiresAt && coupon.isActive) {
      coupon.isActive = false
      await coupon.save().catch(() => {})
    }

    return coupon
  },

  /**
   * Create a new coupon.
   */
  async createCoupon(data, adminUser) {
    const normalizedCode = this.normalizeCode(data.code)
    if (!normalizedCode || normalizedCode.length < 3) {
      const err = new Error('Coupon code is required and must be at least 3 characters.')
      err.statusCode = 400
      err.code = 'INVALID_COUPON_CODE'
      throw err
    }

    // Check duplicate code
    const existing = await Coupon.findOne({ code: normalizedCode, isDeleted: false })
    if (existing) {
      const err = new Error(`Coupon code "${normalizedCode}" already exists.`)
      err.statusCode = 409
      err.code = 'DUPLICATE_COUPON_CODE'
      throw err
    }

    // Validate discount type & value
    const discountType = data.discountType === 'fixed' ? 'fixed' : 'percentage'
    const discountValue = Number(data.discountValue)
    if (isNaN(discountValue) || discountValue <= 0) {
      const err = new Error('Discount value must be a positive number.')
      err.statusCode = 400
      err.code = 'INVALID_DISCOUNT_VALUE'
      throw err
    }

    if (discountType === 'percentage' && (discountValue < 1 || discountValue > 100)) {
      const err = new Error('Percentage discount must be between 1 and 100.')
      err.statusCode = 400
      err.code = 'INVALID_PERCENTAGE'
      throw err
    }

    // Dates validation
    let startAt = data.startAt ? new Date(data.startAt) : null
    let expiresAt = data.expiresAt ? new Date(data.expiresAt) : null

    if (startAt && isNaN(startAt.getTime())) startAt = null
    if (expiresAt && isNaN(expiresAt.getTime())) expiresAt = null

    if (startAt && expiresAt && startAt >= expiresAt) {
      const err = new Error('Coupon expiry date must be strictly after the start date.')
      err.statusCode = 400
      err.code = 'INVALID_DATE_RANGE'
      throw err
    }

    const coupon = await Coupon.create({
      code: normalizedCode,
      description: data.description ? data.description.trim() : '',
      discountType,
      discountValue: discountType === 'percentage' ? discountValue : Math.round(discountValue), // fixed in paise
      minimumBookingAmount: data.minimumBookingAmount ? Math.max(0, Math.round(Number(data.minimumBookingAmount))) : 0,
      maximumDiscountAmount: data.maximumDiscountAmount ? Math.max(0, Math.round(Number(data.maximumDiscountAmount))) : null,
      startAt,
      expiresAt,
      usageLimit: data.usageLimit ? Math.max(1, Number(data.usageLimit)) : null,
      perUserLimit: data.perUserLimit ? Math.max(1, Number(data.perUserLimit)) : 1,
      eligibleSports: Array.isArray(data.eligibleSports) ? data.eligibleSports.filter((id) => mongoose.Types.ObjectId.isValid(id)) : [],
      eligibleTurfs: Array.isArray(data.eligibleTurfs) ? data.eligibleTurfs.filter((id) => mongoose.Types.ObjectId.isValid(id)) : [],
      isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
      createdBy: adminUser?._id || null,
    })

    return coupon
  },

  /**
   * Update an existing coupon.
   */
  async updateCoupon(id, updates) {
    const coupon = await this.getCouponById(id)

    if (updates.code) {
      const newCode = this.normalizeCode(updates.code)
      if (newCode !== coupon.code) {
        const conflict = await Coupon.findOne({
          code: newCode,
          _id: { $ne: id },
          isDeleted: false,
        })
        if (conflict) {
          const err = new Error(`Coupon code "${newCode}" is already taken.`)
          err.statusCode = 409
          err.code = 'DUPLICATE_COUPON_CODE'
          throw err
        }
        coupon.code = newCode
      }
    }

    if (updates.description !== undefined) {
      coupon.description = updates.description.trim()
    }

    if (updates.discountType) {
      coupon.discountType = updates.discountType === 'fixed' ? 'fixed' : 'percentage'
    }

    if (updates.discountValue !== undefined) {
      const val = Number(updates.discountValue)
      if (isNaN(val) || val <= 0) {
        const err = new Error('Discount value must be a positive number.')
        err.statusCode = 400
        err.code = 'INVALID_DISCOUNT_VALUE'
        throw err
      }
      if (coupon.discountType === 'percentage' && (val < 1 || val > 100)) {
        const err = new Error('Percentage discount must be between 1 and 100.')
        err.statusCode = 400
        err.code = 'INVALID_PERCENTAGE'
        throw err
      }
      coupon.discountValue = coupon.discountType === 'percentage' ? val : Math.round(val)
    }

    if (updates.minimumBookingAmount !== undefined) {
      coupon.minimumBookingAmount = Math.max(0, Math.round(Number(updates.minimumBookingAmount) || 0))
    }

    if (updates.maximumDiscountAmount !== undefined) {
      coupon.maximumDiscountAmount = updates.maximumDiscountAmount ? Math.max(0, Math.round(Number(updates.maximumDiscountAmount))) : null
    }

    if (updates.startAt !== undefined) {
      coupon.startAt = updates.startAt ? new Date(updates.startAt) : null
    }

    if (updates.expiresAt !== undefined) {
      coupon.expiresAt = updates.expiresAt ? new Date(updates.expiresAt) : null
    }

    if (coupon.startAt && coupon.expiresAt && coupon.startAt >= coupon.expiresAt) {
      const err = new Error('Coupon expiry date must be strictly after the start date.')
      err.statusCode = 400
      err.code = 'INVALID_DATE_RANGE'
      throw err
    }

    if (updates.usageLimit !== undefined) {
      coupon.usageLimit = updates.usageLimit ? Math.max(1, Number(updates.usageLimit)) : null
    }

    if (updates.perUserLimit !== undefined) {
      coupon.perUserLimit = Math.max(1, Number(updates.perUserLimit) || 1)
    }

    if (updates.eligibleSports !== undefined) {
      coupon.eligibleSports = Array.isArray(updates.eligibleSports)
        ? updates.eligibleSports.filter((s) => mongoose.Types.ObjectId.isValid(s))
        : []
    }

    if (updates.eligibleTurfs !== undefined) {
      coupon.eligibleTurfs = Array.isArray(updates.eligibleTurfs)
        ? updates.eligibleTurfs.filter((t) => mongoose.Types.ObjectId.isValid(t))
        : []
    }

    const isNowExpired = coupon.expiresAt && new Date() > coupon.expiresAt

    if (isNowExpired) {
      // Validity is still in the past -> force deactivated
      coupon.isActive = false
    } else if (updates.isActive !== undefined) {
      coupon.isActive = Boolean(updates.isActive)
    } else if (!coupon.isActive && updates.expiresAt !== undefined) {
      // Admin re-edited validity to a future date, reactivate automatically
      coupon.isActive = true
    }

    await coupon.save()
    return coupon
  },

  /**
   * Quick toggle active status.
   */
  async toggleCouponStatus(id, isActive) {
    const coupon = await this.getCouponById(id)
    if (isActive && coupon.expiresAt && new Date() > coupon.expiresAt) {
      const err = new Error('Cannot activate an expired coupon. Please re-edit its validity date first.')
      err.statusCode = 400
      err.code = 'COUPON_EXPIRED'
      throw err
    }
    coupon.isActive = Boolean(isActive)
    await coupon.save()
    return coupon
  },

  /**
   * Safe delete (soft deletion if redeemed; hard delete if never used).
   */
  async deleteCoupon(id) {
    const coupon = await this.getCouponById(id)

    // Check if redemptions exist
    const hasRedemptions = (await CouponRedemption.countDocuments({ coupon: id })) > 0 || coupon.usedCount > 0

    if (hasRedemptions) {
      // Soft delete to protect historical bookings
      coupon.isDeleted = true
      coupon.isActive = false
      await coupon.save()
      return { deleted: true, softDeleted: true, message: 'Coupon has historical redemptions; safely deactivated and archived.' }
    }

    await Coupon.deleteOne({ _id: id })
    return { deleted: true, softDeleted: false, message: 'Coupon permanently deleted.' }
  },

  /**
   * Retrieves applicable coupons for a customer given booking context (turfId, sportId, subtotal).
   * Annotates coupons with eligibility, amountNeeded to unlock, and potential savings.
   */
  async getApplicableCoupons({ turfId = null, sportId = null, subtotal = 0, user = null }) {
    // Deactivate any expired coupons before discovery
    await this.autoDeactivateExpiredCoupons()

    const now = new Date()
    const filter = {
      isActive: true,
      isDeleted: false,
      $and: [
        { $or: [{ startAt: null }, { startAt: { $lte: now } }] },
        { $or: [{ expiresAt: null }, { expiresAt: { $gte: now } }] },
      ],
    }

    const coupons = await Coupon.find(filter)
      .populate('eligibleSports', 'name slug')
      .populate('eligibleTurfs', 'name slug')
      .sort({ minimumBookingAmount: 1, discountValue: -1 })

    const result = []

    for (const coupon of coupons) {
      // 1. Check global limit
      if (coupon.usageLimit !== null && coupon.usageLimit !== undefined) {
        if (coupon.usedCount >= coupon.usageLimit) {
          continue // coupon exhausted
        }
      }

      // 2. Check per-user limit if user is authenticated
      if (user && user._id) {
        const userRedemptions = await CouponRedemption.countDocuments({
          coupon: coupon._id,
          user: user._id,
          status: 'active',
        })
        if (userRedemptions >= coupon.perUserLimit) {
          continue // customer already used their quota
        }
      }

      // 3. Check turf eligibility
      if (Array.isArray(coupon.eligibleTurfs) && coupon.eligibleTurfs.length > 0 && turfId) {
        const turfIdStr = turfId.toString()
        const isEligibleTurf = coupon.eligibleTurfs.some((t) => (t._id || t).toString() === turfIdStr)
        if (!isEligibleTurf) continue
      }

      // 4. Check sport eligibility
      if (Array.isArray(coupon.eligibleSports) && coupon.eligibleSports.length > 0 && sportId) {
        const sportIdStr = sportId.toString()
        const isEligibleSport = coupon.eligibleSports.some((s) => (s._id || s).toString() === sportIdStr)
        if (!isEligibleSport) continue
      }

      // 5. Calculate eligibility & amount needed to unlock
      const minAmount = coupon.minimumBookingAmount || 0
      const isEligible = subtotal >= minAmount
      const amountNeeded = isEligible ? 0 : minAmount - subtotal

      // 6. Calculate potential discount
      let potentialDiscount = 0
      if (coupon.discountType === 'percentage') {
        const base = isEligible ? subtotal : minAmount
        potentialDiscount = Math.round((base * coupon.discountValue) / 100)
        if (coupon.maximumDiscountAmount) {
          potentialDiscount = Math.min(potentialDiscount, coupon.maximumDiscountAmount)
        }
      } else {
        potentialDiscount = coupon.discountValue
      }

      result.push({
        _id: coupon._id,
        code: coupon.code,
        description: coupon.description,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minimumBookingAmount: coupon.minimumBookingAmount,
        maximumDiscountAmount: coupon.maximumDiscountAmount,
        expiresAt: coupon.expiresAt,
        isEligible,
        amountNeeded,
        potentialDiscount,
        highlightNudge: !isEligible && minAmount > 0
          ? `Add ₹${Math.ceil((minAmount - subtotal) / 100).toLocaleString('en-IN')} more to unlock ${
              coupon.discountType === 'percentage'
                ? `${coupon.discountValue}% OFF`
                : `₹${Math.round(coupon.discountValue / 100).toLocaleString('en-IN')} FLAT OFF`
            }!`
          : null,
      })
    }

    return result
  },
}

export default couponService
