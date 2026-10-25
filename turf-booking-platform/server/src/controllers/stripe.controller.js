import stripeService from '../services/stripe.service.js'

export const getPublicConfig = async (req, res, next) => {
  try {
    const config = stripeService.getPublicConfig()
    res.status(200).json({
      success: true,
      data: config,
    })
  } catch (error) {
    next(error)
  }
}

export const createCheckoutSession = async (req, res, next) => {
  try {
    const session = await stripeService.createCheckoutSession(req.body, req.user, req.ip)
    res.status(200).json({
      success: true,
      message: 'Stripe checkout session created successfully.',
      data: session,
    })
  } catch (error) {
    next(error)
  }
}

export const getPaymentStatus = async (req, res, next) => {
  try {
    const { bookingId } = req.params
    const result = await stripeService.verifyAndGetPaymentStatus(bookingId, req.user)
    res.status(200).json({
      success: true,
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

export const handleWebhook = async (req, res, next) => {
  try {
    const signature = req.headers['stripe-signature']
    // req.body contains raw Buffer when express.raw middleware is used
    const result = await stripeService.handleWebhookEvent(req.body, signature)
    res.status(200).json(result)
  } catch (error) {
    next(error)
  }
}

export const cancelPendingBooking = async (req, res, next) => {
  try {
    const { bookingId } = req.params
    const result = await stripeService.cancelPendingBooking(bookingId, req.user)
    res.status(200).json({
      success: true,
      message: 'Pending booking cancelled successfully.',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}
