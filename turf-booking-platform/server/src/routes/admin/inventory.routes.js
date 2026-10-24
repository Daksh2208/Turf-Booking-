import { Router } from 'express'
import { requireAuth, requireAdmin } from '../../middleware/auth.middleware.js'
import { validate } from '../../middleware/validate.middleware.js'
import {
  createSportValidator,
  updateSportValidator,
  createTurfValidator,
  updateTurfValidator,
  createAddOnValidator,
  updateAddOnValidator,
  createBannerValidator,
  updateBannerValidator,
  updateSettingsValidator,
} from '../../validators/inventory.validator.js'
import {
  createSport,
  updateSport,
  toggleSportStatus,
  deleteSport,
  getAdminSports,
  createTurf,
  updateTurf,
  toggleTurfStatus,
  deleteTurf,
  getAdminTurfs,
  createAddOn,
  updateAddOn,
  toggleAddOnStatus,
  deleteAddOn,
  getAdminAddOns,
  createBanner,
  updateBanner,
  toggleBannerStatus,
  deleteBanner,
  getAdminBanners,
  getSettings,
  updateSettings,
} from '../../controllers/admin/inventory.controller.js'

const router = Router()

// All routes in this router strictly require an authenticated administrator
router.use(requireAuth, requireAdmin)

// ==========================================
// Admin Sports Management
// ==========================================
router.post('/sports', createSportValidator, validate, createSport)
router.get('/sports', getAdminSports)
router.put('/sports/:id', updateSportValidator, validate, updateSport)
router.patch('/sports/:id/status', toggleSportStatus)
router.delete('/sports/:id', deleteSport)

// ==========================================
// Admin Turf Management
// ==========================================
router.post('/turfs', createTurfValidator, validate, createTurf)
router.get('/turfs', getAdminTurfs)
router.put('/turfs/:id', updateTurfValidator, validate, updateTurf)
router.patch('/turfs/:id/status', toggleTurfStatus)
router.delete('/turfs/:id', deleteTurf)

// ==========================================
// Admin Add-On Management
// ==========================================
router.post('/addons', createAddOnValidator, validate, createAddOn)
router.get('/addons', getAdminAddOns)
router.put('/addons/:id', updateAddOnValidator, validate, updateAddOn)
router.patch('/addons/:id/status', toggleAddOnStatus)
router.delete('/addons/:id', deleteAddOn)

// ==========================================
// Admin Banner Management
// ==========================================
router.post('/banners', createBannerValidator, validate, createBanner)
router.get('/banners', getAdminBanners)
router.put('/banners/:id', updateBannerValidator, validate, updateBanner)
router.patch('/banners/:id/status', toggleBannerStatus)
router.delete('/banners/:id', deleteBanner)

// ==========================================
// Admin Business Settings Management
// ==========================================
router.get('/settings', getSettings)
router.put('/settings', updateSettingsValidator, validate, updateSettings)

export default router
