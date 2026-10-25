import reservationService from '../../services/reservation.service.js'

export const holdSlots = async (req, res, next) => {
  try {
    const { turfId, date, slots, reservationId } = req.body

    const result = await reservationService.holdSlots({
      user: req.user,
      turfId,
      date,
      slots,
      reservationId,
    })

    return res.status(200).json({
      success: true,
      message: 'Slots successfully reserved.',
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

export const getCurrentReservation = async (req, res, next) => {
  try {
    const { turfId, date } = req.query

    const reservation = await reservationService.getCurrentReservation({
      user: req.user,
      turfId,
      date,
    })

    return res.status(200).json({
      success: true,
      data: {
        reservation,
      },
    })
  } catch (error) {
    next(error)
  }
}

export const releaseReservation = async (req, res, next) => {
  try {
    const { reservationId, turfId, date } = req.body

    const result = await reservationService.releaseReservation({
      user: req.user,
      reservationId,
      turfId,
      date,
    })

    return res.status(200).json({
      success: true,
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

export const renewReservation = async (req, res, next) => {
  try {
    const { reservationId } = req.body

    const result = await reservationService.renewReservation({
      user: req.user,
      reservationId,
    })

    return res.status(200).json({
      success: true,
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

export default {
  holdSlots,
  getCurrentReservation,
  releaseReservation,
  renewReservation,
}
