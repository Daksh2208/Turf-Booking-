import bookingService from '../../services/booking.service.js'
import pricingService from '../../services/pricing.service.js'

export const getTurfSlots = async (req, res, next) => {
  try {
    const { turfId, date } = req.query
    if (!turfId || !date) {
      return res.status(400).json({
        success: false,
        message: 'turfId and date (YYYY-MM-DD) query parameters are required.',
      })
    }

    const data = await bookingService.getTurfSlots(turfId, date)
    res.status(200).json({
      success: true,
      data,
    })
  } catch (error) {
    next(error)
  }
}

export const getPricingQuote = async (req, res, next) => {
  try {
    const quote = await pricingService.calculateQuote(req.body)
    res.status(200).json({
      success: true,
      message: 'Pricing quote calculated successfully.',
      data: { quote },
    })
  } catch (error) {
    next(error)
  }
}

export const createBooking = async (req, res, next) => {
  try {
    if (req.user?.role === 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ADMIN_BOOKING_FORBIDDEN',
          message: 'Forbidden: Admins cannot create customer bookings. Please use admin management endpoints.',
        },
      })
    }

    const idempotencyKey =
      req.body.idempotencyKey || req.headers['x-idempotency-key'] || undefined

    const booking = await bookingService.createBooking(
      { ...req.body, idempotencyKey },
      req.user,
      req.ip
    )

    res.status(201).json({
      success: true,
      message: 'Booking confirmed successfully.',
      data: { booking },
    })
  } catch (error) {
    next(error)
  }
}

export const getMyBookings = async (req, res, next) => {
  try {
    if (req.user?.role === 'admin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ADMIN_BOOKING_FORBIDDEN',
          message: 'Forbidden: Admins cannot access customer bookings via customer endpoints.',
        },
      })
    }
    const { page, limit, status } = req.query
    const result = await bookingService.getUserBookings(req.user._id, {
      page,
      limit,
      status,
    })

    res.status(200).json({
      success: true,
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

export const getBookingDetail = async (req, res, next) => {
  try {
    const { id } = req.params
    const booking = await bookingService.getBookingById(id, req.user)

    res.status(200).json({
      success: true,
      data: { booking },
    })
  } catch (error) {
    next(error)
  }
}

export const cancelMyBooking = async (req, res, next) => {
  try {
    const { id } = req.params
    const { cancellationReason } = req.body
    const booking = await bookingService.cancelBooking(
      id,
      { cancellationReason },
      req.user,
      req.ip
    )

    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully.',
      data: { booking },
    })
  } catch (error) {
    next(error)
  }
}

