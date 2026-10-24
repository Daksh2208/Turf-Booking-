import sportService from '../../services/sport.service.js'
import turfService from '../../services/turf.service.js'
import addOnService from '../../services/addon.service.js'
import bannerService from '../../services/banner.service.js'
import settingsService from '../../services/settings.service.js'

// ==========================================
// CUSTOMER READ-ONLY INVENTORY CONTROLLERS
// ==========================================

export const getPublicSports = async (req, res, next) => {
  try {
    const sports = await sportService.getPublicSports()
    res.status(200).json({
      success: true,
      data: { sports },
    })
  } catch (error) {
    next(error)
  }
}

export const getPublicSportBySlug = async (req, res, next) => {
  try {
    const sport = await sportService.getPublicSportBySlug(req.params.slug)
    res.status(200).json({
      success: true,
      data: { sport },
    })
  } catch (error) {
    next(error)
  }
}

export const getPublicTurfs = async (req, res, next) => {
  try {
    const result = await turfService.getPublicTurfs(req.query)
    res.status(200).json({
      success: true,
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

export const getPublicTurfBySlug = async (req, res, next) => {
  try {
    const turf = await turfService.getPublicTurfBySlug(req.params.slug)
    res.status(200).json({
      success: true,
      data: { turf },
    })
  } catch (error) {
    next(error)
  }
}

export const getPublicAddOns = async (req, res, next) => {
  try {
    const addOns = await addOnService.getPublicAddOns()
    res.status(200).json({
      success: true,
      data: { addOns },
    })
  } catch (error) {
    next(error)
  }
}

export const getPublicBanners = async (req, res, next) => {
  try {
    const banners = await bannerService.getPublicBanners()
    res.status(200).json({
      success: true,
      data: { banners },
    })
  } catch (error) {
    next(error)
  }
}

export const getPublicSettings = async (req, res, next) => {
  try {
    const settings = await settingsService.getPublicSettings()
    res.status(200).json({
      success: true,
      data: { settings },
    })
  } catch (error) {
    next(error)
  }
}
