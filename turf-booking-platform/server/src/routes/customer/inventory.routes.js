import { Router } from 'express'
import {
  getPublicSports,
  getPublicSportBySlug,
  getPublicTurfs,
  getPublicTurfBySlug,
  getPublicAddOns,
  getPublicBanners,
  getPublicSettings,
} from '../../controllers/customer/inventory.controller.js'

const router = Router()

// ==========================================
// Customer / Public Inventory Read Routes
// ==========================================
router.get('/sports', getPublicSports)
router.get('/sports/:slug', getPublicSportBySlug)
router.get('/turfs', getPublicTurfs)
router.get('/turfs/:slug', getPublicTurfBySlug)
router.get('/addons', getPublicAddOns)
router.get('/banners', getPublicBanners)
router.get('/settings', getPublicSettings)

export default router
