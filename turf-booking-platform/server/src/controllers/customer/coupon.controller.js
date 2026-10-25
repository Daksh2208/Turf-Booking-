import pricingService from '../../services/pricing.service.js'
import couponService from '../../services/coupon.service.js'

export const validateCoupon = async (req, res, next) => {
  try {
    const {
      couponCode,
      turfId,
      sportId,
      date,
      startTime,
      endTime,
      slots,
      selectedSlots,
      addOns = [],
      playerCount,
    } = req.body

    if (!couponCode || typeof couponCode !== 'string' || !couponCode.trim()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_COUPON_CODE',
          message: 'Please provide a valid coupon code.',
        },
      })
    }

    if (!turfId || !date) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_BOOKING_CONTEXT',
          message: 'turfId and date are required to validate coupon eligibility.',
        },
      })
    }

    // Server authoritative price calculation including coupon discount
    const quote = await pricingService.calculateQuote({
      turfId,
      date,
      startTime,
      endTime,
      slots,
      selectedSlots,
      addOns,
      playerCount,
      couponCode: couponCode.trim(),
      sportId,
      user: req.user,
    })

    if (!quote.coupon) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'COUPON_NOT_APPLIED',
          message: 'Coupon could not be applied.',
        },
      })
    }

    res.status(200).json({
      success: true,
      data: {
        coupon: quote.coupon,
        preDiscountSubtotal: quote.preDiscountSubtotal,
        discountAmount: quote.discountAmount,
        taxableAmount: quote.taxableAmount,
        tax: quote.tax,
        finalTotal: quote.finalTotal,
        currency: quote.currency || 'INR',
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Fetch available/applicable coupons for a booking context with smart unlock nudges
 */
export const getAvailableCoupons = async (req, res, next) => {
  try {
    const { turfId, sportId, subtotal } = req.query
    const subtotalPaise = subtotal ? parseInt(subtotal, 10) : 0

    const coupons = await couponService.getApplicableCoupons({
      turfId,
      sportId,
      subtotal: isNaN(subtotalPaise) ? 0 : subtotalPaise,
      user: req.user,
    })

    res.status(200).json({
      success: true,
      data: { coupons },
    })
  } catch (error) {
    next(error)
  }
}

