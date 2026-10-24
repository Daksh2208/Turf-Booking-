import sportService from '../../services/sport.service.js'
import turfService from '../../services/turf.service.js'
import addOnService from '../../services/addon.service.js'
import bannerService from '../../services/banner.service.js'
import settingsService from '../../services/settings.service.js'

// ==========================================
// ADMIN SPORTS CONTROLLERS
// ==========================================

export const createSport = async (req, res, next) => {
  try {
    const sport = await sportService.createSport(req.body, req.user, req.ip)
    res.status(201).json({
      success: true,
      message: 'Sport created successfully.',
      data: { sport },
    })
  } catch (error) {
    next(error)
  }
}

export const updateSport = async (req, res, next) => {
  try {
    const sport = await sportService.updateSport(req.params.id, req.body, req.user, req.ip)
    res.status(200).json({
      success: true,
      message: 'Sport updated successfully.',
      data: { sport },
    })
  } catch (error) {
    next(error)
  }
}

export const toggleSportStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body
    const sport = await sportService.toggleSportStatus(req.params.id, isActive, req.user, req.ip)
    res.status(200).json({
      success: true,
      message: `Sport ${sport.isActive ? 'activated' : 'deactivated'} successfully.`,
      data: { sport },
    })
  } catch (error) {
    next(error)
  }
}

export const getAdminSports = async (req, res, next) => {
  try {
    const result = await sportService.getAdminSports(req.query)
    res.status(200).json({
      success: true,
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

// ==========================================
// ADMIN TURF CONTROLLERS
// ==========================================

export const createTurf = async (req, res, next) => {
  try {
    const turf = await turfService.createTurf(req.body, req.user, req.ip)
    res.status(201).json({
      success: true,
      message: 'Turf created successfully.',
      data: { turf },
    })
  } catch (error) {
    next(error)
  }
}

export const updateTurf = async (req, res, next) => {
  try {
    const turf = await turfService.updateTurf(req.params.id, req.body, req.user, req.ip)
    res.status(200).json({
      success: true,
      message: 'Turf updated successfully.',
      data: { turf },
    })
  } catch (error) {
    next(error)
  }
}

export const toggleTurfStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body
    const turf = await turfService.toggleTurfStatus(req.params.id, isActive, req.user, req.ip)
    res.status(200).json({
      success: true,
      message: `Turf ${turf.isActive ? 'activated' : 'deactivated'} successfully.`,
      data: { turf },
    })
  } catch (error) {
    next(error)
  }
}

export const getAdminTurfs = async (req, res, next) => {
  try {
    const result = await turfService.getAdminTurfs(req.query)
    res.status(200).json({
      success: true,
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

// ==========================================
// ADMIN ADDON CONTROLLERS
// ==========================================

export const createAddOn = async (req, res, next) => {
  try {
    const addOn = await addOnService.createAddOn(req.body, req.user, req.ip)
    res.status(201).json({
      success: true,
      message: 'Add-on created successfully.',
      data: { addOn },
    })
  } catch (error) {
    next(error)
  }
}

export const updateAddOn = async (req, res, next) => {
  try {
    const addOn = await addOnService.updateAddOn(req.params.id, req.body, req.user, req.ip)
    res.status(200).json({
      success: true,
      message: 'Add-on updated successfully.',
      data: { addOn },
    })
  } catch (error) {
    next(error)
  }
}

export const toggleAddOnStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body
    const addOn = await addOnService.toggleAddOnStatus(req.params.id, isActive, req.user, req.ip)
    res.status(200).json({
      success: true,
      message: `Add-on ${addOn.isActive ? 'activated' : 'deactivated'} successfully.`,
      data: { addOn },
    })
  } catch (error) {
    next(error)
  }
}

export const getAdminAddOns = async (req, res, next) => {
  try {
    const result = await addOnService.getAdminAddOns(req.query)
    res.status(200).json({
      success: true,
      data: result,
    })
  } catch (error) {
    next(error)
  }
}

// ==========================================
// ADMIN BANNER CONTROLLERS
// ==========================================

export const createBanner = async (req, res, next) => {
  try {
    const banner = await bannerService.createBanner(req.body, req.user, req.ip)
    res.status(201).json({
      success: true,
      message: 'Banner created successfully.',
      data: { banner },
    })
  } catch (error) {
    next(error)
  }
}

export const updateBanner = async (req, res, next) => {
  try {
    const banner = await bannerService.updateBanner(req.params.id, req.body, req.user, req.ip)
    res.status(200).json({
      success: true,
      message: 'Banner updated successfully.',
      data: { banner },
    })
  } catch (error) {
    next(error)
  }
}

export const toggleBannerStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body
    const banner = await bannerService.toggleBannerStatus(req.params.id, isActive, req.user, req.ip)
    res.status(200).json({
      success: true,
      message: `Banner ${banner.isActive ? 'activated' : 'deactivated'} successfully.`,
      data: { banner },
    })
  } catch (error) {
    next(error)
  }
}

export const deleteBanner = async (req, res, next) => {
  try {
    const result = await bannerService.deleteBanner(req.params.id, req.user, req.ip)
    res.status(200).json({
      success: true,
      message: result.message,
    })
  } catch (error) {
    next(error)
  }
}

export const getAdminBanners = async (req, res, next) => {
  try {
    const banners = await bannerService.getAdminBanners()
    res.status(200).json({
      success: true,
      data: { banners },
    })
  } catch (error) {
    next(error)
  }
}

// ==========================================
// ADMIN SETTINGS CONTROLLERS
// ==========================================

export const getSettings = async (req, res, next) => {
  try {
    const settings = await settingsService.getSettings()
    res.status(200).json({
      success: true,
      data: { settings },
    })
  } catch (error) {
    next(error)
  }
}

export const updateSettings = async (req, res, next) => {
  try {
    const settings = await settingsService.updateSettings(req.body, req.user, req.ip)
    res.status(200).json({
      success: true,
      message: 'Business settings updated successfully.',
      data: { settings },
    })
  } catch (error) {
    next(error)
  }
}

export const deleteSport = async (req, res, next) => {
  try {
    const result = await sportService.deleteSport(req.params.id, req.user, req.ip)
    res.status(200).json({
      success: true,
      message: result.message,
    })
  } catch (error) {
    next(error)
  }
}

export const deleteTurf = async (req, res, next) => {
  try {
    const result = await turfService.deleteTurf(req.params.id, req.user, req.ip)
    res.status(200).json({
      success: true,
      message: result.message,
    })
  } catch (error) {
    next(error)
  }
}

export const deleteAddOn = async (req, res, next) => {
  try {
    const result = await addOnService.deleteAddOn(req.params.id, req.user, req.ip)
    res.status(200).json({
      success: true,
      message: result.message,
    })
  } catch (error) {
    next(error)
  }
}

