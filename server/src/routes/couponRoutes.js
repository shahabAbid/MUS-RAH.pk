
const express = require('express');
const router = express.Router();

const {
  requireAuth,
  requireAdmin
} = require('../middleware/authMiddleware');

const {
  listCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  validateCoupon
} = require('../controllers/couponController');

// Customer coupon validation
router.post('/validate', requireAuth, validateCoupon);

// Admin coupon management
router.get('/admin/all', requireAuth, requireAdmin, listCoupons);
router.post('/admin', requireAuth, requireAdmin, createCoupon);
router.patch('/admin/:id', requireAuth, requireAdmin, updateCoupon);
router.delete('/admin/:id', requireAuth, requireAdmin, deleteCoupon);

module.exports = router;
