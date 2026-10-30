import bookingService from '../../services/booking.service.js'
import blockedSlotService from '../../services/blockedSlot.service.js'

export const getDashboardMetrics = async (req, res, next) => {
  try {
    const data = await bookingService.getDashboardMetrics()
    res.status(200).json({
      success: true,
      data,
    })
  } catch (error) {
    next(error)
  }
}

export const getAdminBookings = async (req, res, next) => {
  try {
    const result = await bookingService.getAdminBookings(req.query)
    res.status(200).json({
      success: true,
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

export const getBookingDetails = async (req, res, next) => {
  try {
    const booking = await bookingService.getBookingById(req.params.id)
    res.status(200).json({
      success: true,
      data: { booking },
    })
  } catch (error) {
    next(error)
  }
}

export const updateBookingStatus = async (req, res, next) => {
  try {
    const { status, cancellationReason } = req.body
    if (!['pending', 'confirmed', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid booking status. Allowed values: pending, confirmed, completed, cancelled',
      })
    }

    const booking = await bookingService.updateBookingStatus(
      req.params.id,
      { status, cancellationReason },
      req.user,
      req.ip
    )

    res.status(200).json({
      success: true,
      message: `Booking status updated to ${status}.`,
      data: { booking },
    })
  } catch (error) {
    next(error)
  }
}

export const recordPayment = async (req, res, next) => {
  try {
    const { paymentMethod, notes } = req.body
    const booking = await bookingService.recordPayment(
      req.params.id,
      { paymentMethod, notes },
      req.user,
      req.ip
    )

    res.status(200).json({
      success: true,
      message: 'Payment recorded successfully.',
      data: { booking },
    })
  } catch (error) {
    next(error)
  }
}

export const cancelBooking = async (req, res, next) => {
  try {
    const { cancellationReason } = req.body
    const booking = await bookingService.cancelBooking(
      req.params.id,
      { cancellationReason },
      req.user,
      req.ip
    )

    res.status(200).json({
      success: true,
      message: 'Booking cancelled and slot released successfully.',
      data: { booking },
    })
  } catch (error) {
    next(error)
  }
}

export const retryRefund = async (req, res, next) => {
  try {
    const booking = await bookingService.retryRefund(req.params.id, req.user, req.ip)
    res.status(200).json({
      success: true,
      message: 'Refund retry submitted successfully.',
      data: { booking },
    })
  } catch (error) {
    next(error)
  }
}

export const getAdminCancellationPreview = async (req, res, next) => {
  try {
    const data = await bookingService.getCancellationPreview(req.params.id, req.user)
    res.status(200).json({
      success: true,
      data,
    })
  } catch (error) {
    next(error)
  }
}

// ==========================================
// BLOCKED SLOTS CONTROLLERS
// ==========================================

export const createBlockedSlot = async (req, res, next) => {
  try {
    const blockedSlot = await blockedSlotService.createBlockedSlot(req.body, req.user, req.ip)
    res.status(201).json({
      success: true,
      message: 'Slot blocked successfully.',
      data: { blockedSlot },
    })
  } catch (error) {
    next(error)
  }
}

export const updateBlockedSlot = async (req, res, next) => {
  try {
    const blockedSlot = await blockedSlotService.updateBlockedSlot(req.params.id, req.body, req.user, req.ip)
    res.status(200).json({
      success: true,
      message: 'Blocked slot updated successfully.',
      data: { blockedSlot },
    })
  } catch (error) {
    next(error)
  }
}

export const deleteBlockedSlot = async (req, res, next) => {
  try {
    const result = await blockedSlotService.deleteBlockedSlot(req.params.id, req.user, req.ip)
    res.status(200).json({
      success: true,
      message: result.message,
    })
  } catch (error) {
    next(error)
  }
}

export const getAdminBlockedSlots = async (req, res, next) => {
  try {
    const result = await blockedSlotService.getAdminBlockedSlots(req.query)
    res.status(200).json({
      success: true,
      data: result,
    })
  } catch (error) {
    next(error)
  }
}
