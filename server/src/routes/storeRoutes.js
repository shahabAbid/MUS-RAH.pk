
const express = require('express');
const router = express.Router();

const {
  requireAuth,
  requireAdmin
} = require('../middleware/authMiddleware');

const {
  getPublicSettings,
  getAdminSettings,
  updateStoreSettings
} = require('../controllers/storeController');

// Public storefront settings
router.get('/settings', getPublicSettings);

// Admin settings management
router.get('/admin/settings', requireAuth, requireAdmin, getAdminSettings);
router.patch('/admin/settings', requireAuth, requireAdmin, updateStoreSettings);

module.exports = router;
