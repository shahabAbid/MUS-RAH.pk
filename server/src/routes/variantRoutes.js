
const express = require('express');
const router = express.Router();

const {
  requireAuth,
  requireAdmin
} = require('../middleware/authMiddleware');

const {
  createVariant,
  updateVariant
} = require('../controllers/variantController');

router.post(
  '/',
  requireAuth,
  requireAdmin,
  createVariant
);

router.patch(
  '/:variantId',
  requireAuth,
  requireAdmin,
  updateVariant
);

module.exports = router;
