import calendarService from '../../services/calendar.service.js'

export const getCalendarSummary = async (req, res, next) => {
  try {
    const { startDate, endDate, turfId, sportId, status, paymentStatus } = req.query
    const data = await calendarService.getCalendarSummary({
      startDate,
      endDate,
      turfId,
      sportId,
      status,
      paymentStatus,
    })

    res.status(200).json({
      success: true,
      data,
    })
  } catch (error) {
    next(error)
  }
}

export const getDaySchedule = async (req, res, next) => {
  try {
    const { date, turfId, sportId, status, paymentStatus } = req.query
    const data = await calendarService.getDaySchedule({
      date,
      turfId,
      sportId,
      status,
      paymentStatus,
    })

    res.status(200).json({
      success: true,
      data,
    })
  } catch (error) {
    next(error)
  }
}

export const getWeekSchedule = async (req, res, next) => {
  try {
    const { startDate, endDate, turfId, sportId, status, paymentStatus } = req.query
    const data = await calendarService.getWeekSchedule({
      startDate,
      endDate,
      turfId,
      sportId,
      status,
      paymentStatus,
    })

    res.status(200).json({
      success: true,
      data,
    })
  } catch (error) {
    next(error)
  }
}

export default {
  getCalendarSummary,
  getDaySchedule,
  getWeekSchedule,
}
