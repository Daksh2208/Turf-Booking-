import availabilityService from '../../services/availability.service.js'

export const getAvailability = async (req, res, next) => {
  try {
    const { turfId, date } = req.query
    if (!turfId || !date) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Query parameters "turfId" and "date" (YYYY-MM-DD) are required.',
          code: 'MISSING_REQUIRED_PARAMS',
        },
      })
    }

    const data = await availabilityService.getTurfAvailability({ turfId, date })
    res.status(200).json({
      success: true,
      data,
    })
  } catch (error) {
    next(error)
  }
}

export default { getAvailability }
