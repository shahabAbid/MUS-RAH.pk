
const express = require('express');
const router = express.Router();

const {
  requireAuth,
  requireAdmin
} = require('../middleware/authMiddleware');

const {
  adjustStock,
  getInventoryHistory
} = require('../controllers/inventoryController');

// View stock history
router.get(
  '/variants/:variantId/history',
  requireAuth,
  requireAdmin,
  getInventoryHistory
);

// Adjust stock
router.patch(
  '/variants/:variantId/stock',
  requireAuth,
  requireAdmin,
  adjustStock
);

module.exports = router;
