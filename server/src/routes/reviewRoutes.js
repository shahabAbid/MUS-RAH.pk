
const express = require('express');
const router = express.Router();

const {
  requireAuth,
  requireAdmin
} = require('../middleware/authMiddleware');

const {
  listProductReviews,
  createReview,
  createProductFeedback,
  listAdminReviews,
  listAdminFeedback,
  deleteProductFeedback,
  moderateReview,
  deleteReview
} = require('../controllers/reviewController');

// ==========================================
// PUBLIC PRODUCT REVIEWS
// ==========================================

router.get(
  '/product/:productId',
  listProductReviews
);

// ==========================================
// CUSTOMER SUBMISSIONS
// ==========================================

router.post(
  '/product/:productId',
  requireAuth,
  createReview
);

router.post(
  '/product/:productId/:type',
  requireAuth,
  createProductFeedback
);

// ==========================================
// ADMIN REVIEW MANAGEMENT
// ==========================================

router.get(
  '/admin/all',
  requireAuth,
  requireAdmin,
  listAdminReviews
);

router.patch(
  '/admin/:id/moderate',
  requireAuth,
  requireAdmin,
  moderateReview
);

router.delete(
  '/admin/:id',
  requireAuth,
  requireAdmin,
  deleteReview
);

// ==========================================
// ADMIN COMPLAINT AND COMPLIMENT MANAGEMENT
// ==========================================

router.get(
  '/admin/feedback',
  requireAuth,
  requireAdmin,
  listAdminFeedback
);

router.delete(
  '/admin/feedback/:id',
  requireAuth,
  requireAdmin,
  deleteProductFeedback
);

module.exports = router;
