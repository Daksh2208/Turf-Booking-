import customerService from '../../services/customer.service.js'

/**
 * GET /api/v1/admin/customers/analytics
 * Retrieve high-level customer analytical metrics (active users, repeat customers, retention, top spenders)
 */
export const getCustomerAnalytics = async (req, res, next) => {
  try {
    const analytics = await customerService.getCustomerAnalytics()
    res.status(200).json({
      success: true,
      data: analytics,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/v1/admin/customers
 * Paginated list of registered customers with booking and spend metrics
 */
export const getCustomersList = async (req, res, next) => {
  try {
    const result = await customerService.getCustomers(req.query)
    res.status(200).json({
      success: true,
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/v1/admin/customers/:id
 * Customer profile details, aggregate stats, and recent booking history
 */
export const getCustomerDetails = async (req, res, next) => {
  try {
    const result = await customerService.getCustomerById(req.params.id)
    res.status(200).json({
      success: true,
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * PATCH /api/v1/admin/customers/:id/status
 * Enable or suspend a customer account
 */
export const toggleCustomerStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive boolean field is required in request body',
      })
    }

    const updatedCustomer = await customerService.toggleCustomerStatus(
      req.params.id,
      isActive,
      req.user,
      req.ip
    )

    res.status(200).json({
      success: true,
      message: `Customer account ${isActive ? 'activated' : 'suspended'} successfully.`,
      data: { customer: updatedCustomer },
    })
  } catch (error) {
    next(error)
  }
}
