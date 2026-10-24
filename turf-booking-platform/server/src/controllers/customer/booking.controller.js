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
    const booking = await bookingService.createBooking(req.body, req.user, req.ip)
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
    const bookings = await bookingService.getUserBookings(req.user._id)
    res.status(200).json({
      success: true,
      data: { bookings },
    })
  } catch (error) {
    next(error)
  }
}

