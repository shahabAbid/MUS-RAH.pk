
const crypto = require('crypto');
const { z } = require('zod');
const db = require('../database/db');

// ==========================================
// VALIDATION
// ==========================================

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(150).optional().default(''),
  body: z.string().trim().min(5).max(2000)
});

const feedbackSchema = z.object({
  comment: z.string().trim().min(5).max(2000)
});

// ==========================================
// PUBLIC: GET PRODUCT REVIEWS
// ==========================================

function listProductReviews(req, res) {
  try {
    const { productId } = req.params;

    const product = db.prepare(`
      SELECT id
      FROM products
      WHERE id = ? AND status = 'published'
    `).get(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.'
      });
    }

    const reviews = db.prepare(`
      SELECT
        r.id,
        r.rating,
        r.title,
        r.body,
        r.is_verified_purchase,
        r.created_at,
        u.full_name AS customer_name
      FROM reviews r
      JOIN users u ON u.id = r.user_id
      WHERE r.product_id = ?
        AND r.is_published = 1
      ORDER BY r.created_at DESC
    `).all(productId);

    const summary = db.prepare(`
      SELECT
        COUNT(*) AS total_reviews,
        ROUND(AVG(rating), 1) AS average_rating
      FROM reviews
      WHERE product_id = ?
        AND is_published = 1
    `).get(productId);

    return res.json({
      success: true,
      summary: {
        totalReviews: summary.total_reviews,
        averageRating: summary.average_rating || 0
      },
      reviews
    });

  } catch (error) {
    console.error('List product reviews:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to load product reviews.'
    });
  }
}

// ==========================================
// CUSTOMER: CREATE RATING REVIEW
// ==========================================

function createReview(req, res) {
  try {
    const validation = reviewSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid review information.',
        errors: validation.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message
        }))
      });
    }

    const { rating, title, body } = validation.data;
    const productId = req.params.productId;
    const userId = req.user.id;

    const product = db.prepare(`
      SELECT id
      FROM products
      WHERE id = ? AND status = 'published'
    `).get(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.'
      });
    }

    const existingReview = db.prepare(`
      SELECT id
      FROM reviews
      WHERE product_id = ? AND user_id = ?
    `).get(productId, userId);

    if (existingReview) {
      return res.status(409).json({
        success: false,
        message: 'You have already reviewed this product.'
      });
    }

    const verifiedPurchase = db.prepare(`
      SELECT oi.id
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE o.user_id = ?
        AND oi.product_id = ?
        AND o.status = 'delivered'
      LIMIT 1
    `).get(userId, productId);

    const reviewId = crypto.randomUUID().replace(/-/g, '');

    db.prepare(`
      INSERT INTO reviews (
        id,
        product_id,
        user_id,
        rating,
        title,
        body,
        is_verified_purchase,
        is_published
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `).run(
      reviewId,
      productId,
      userId,
      rating,
      title || null,
      body,
      verifiedPurchase ? 1 : 0
    );

    return res.status(201).json({
      success: true,
      message: 'Review submitted successfully. It will appear after moderation.',
      review: {
        id: reviewId,
        productId,
        rating,
        title,
        body,
        isVerifiedPurchase: Boolean(verifiedPurchase),
        isPublished: false
      }
    });

  } catch (error) {
    console.error('Create review:', error);

    if (
      error.code === 'SQLITE_CONSTRAINT_UNIQUE' ||
      error.code === 'SQLITE_CONSTRAINT_PRIMARYKEY'
    ) {
      return res.status(409).json({
        success: false,
        message: 'You have already reviewed this product.'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Unable to submit review.'
    });
  }
}

// ==========================================
// CUSTOMER: SUBMIT COMPLAINT OR COMPLIMENT
// ==========================================

function createProductFeedback(req, res) {
  try {
    const validation = feedbackSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a comment of at least 5 characters.'
      });
    }

    const { productId, type } = req.params;

    if (!['complaint', 'compliment'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid feedback type.'
      });
    }

    const product = db.prepare(`
      SELECT id
      FROM products
      WHERE id = ? AND status = 'published'
    `).get(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.'
      });
    }

    const feedbackId = crypto.randomUUID().replace(/-/g, '');

    db.prepare(`
      INSERT INTO product_feedback (
        id,
        product_id,
        user_id,
        feedback_type,
        rating,
        comment
      )
      VALUES (?, ?, ?, ?, NULL, ?)
    `).run(
      feedbackId,
      productId,
      req.user.id,
      type,
      validation.data.comment
    );

    return res.status(201).json({
      success: true,
      message: `${type === 'complaint' ? 'Complaint' : 'Compliment'} submitted successfully.`,
      feedback: {
        id: feedbackId,
        productId,
        type,
        comment: validation.data.comment
      }
    });

  } catch (error) {
    console.error('Create product feedback:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to submit feedback.'
    });
  }
}

// ==========================================
// ADMIN: LIST ALL RATING REVIEWS
// ==========================================

function listAdminReviews(req, res) {
  try {
    const reviews = db.prepare(`
      SELECT
        r.*,
        p.name AS product_name,
        u.full_name AS customer_name,
        u.email AS customer_email
      FROM reviews r
      LEFT JOIN products p ON p.id = r.product_id
      LEFT JOIN users u ON u.id = r.user_id
      ORDER BY r.created_at DESC
    `).all();

    return res.json({
      success: true,
      totalReviews: reviews.length,
      reviews
    });

  } catch (error) {
    console.error('List admin reviews:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to load reviews.'
    });
  }
}

// ==========================================
// ADMIN: LIST COMPLAINTS AND COMPLIMENTS
// ==========================================

function listAdminFeedback(req, res) {
  try {
    const feedback = db.prepare(`
      SELECT
        f.id,
        f.product_id,
        f.user_id,
        f.feedback_type,
        f.comment,
        f.created_at,
        p.name AS product_name,
        u.full_name AS customer_name,
        u.email AS customer_email
      FROM product_feedback f
      LEFT JOIN products p ON p.id = f.product_id
      LEFT JOIN users u ON u.id = f.user_id
      ORDER BY f.created_at DESC
    `).all();

    return res.json({
      success: true,
      totalFeedback: feedback.length,
      feedback
    });

  } catch (error) {
    console.error('List admin feedback:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to load customer feedback.'
    });
  }
}

// ==========================================
// ADMIN: DELETE COMPLAINT OR COMPLIMENT
// ==========================================

function deleteProductFeedback(req, res) {
  try {
    const result = db.prepare(`
      DELETE FROM product_feedback
      WHERE id = ?
    `).run(req.params.id);

    if (!result.changes) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found.'
      });
    }

    return res.json({
      success: true,
      message: 'Feedback deleted successfully.'
    });

  } catch (error) {
    console.error('Delete product feedback:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to delete feedback.'
    });
  }
}

// ==========================================
// ADMIN: PUBLISH OR HIDE REVIEW
// ==========================================

function moderateReview(req, res) {
  try {
    const moderationSchema = z.object({
      isPublished: z.boolean()
    });

    const validation = moderationSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'isPublished must be true or false.'
      });
    }

    const { isPublished } = validation.data;

    const result = db.prepare(`
      UPDATE reviews
      SET is_published = ?
      WHERE id = ?
    `).run(isPublished ? 1 : 0, req.params.id);

    if (!result.changes) {
      return res.status(404).json({
        success: false,
        message: 'Review not found.'
      });
    }

    return res.json({
      success: true,
      message: isPublished
        ? 'Review published successfully.'
        : 'Review hidden successfully.'
    });

  } catch (error) {
    console.error('Moderate review:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to moderate review.'
    });
  }
}

// ==========================================
// ADMIN: DELETE RATING REVIEW
// ==========================================

function deleteReview(req, res) {
  try {
    const result = db.prepare(`
      DELETE FROM reviews
      WHERE id = ?
    `).run(req.params.id);

    if (!result.changes) {
      return res.status(404).json({
        success: false,
        message: 'Review not found.'
      });
    }

    return res.json({
      success: true,
      message: 'Review deleted successfully.'
    });

  } catch (error) {
    console.error('Delete review:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to delete review.'
    });
  }
}

// ==========================================
// EXPORT CONTROLLER FUNCTIONS
// ==========================================

module.exports = {
  listProductReviews,
  createReview,
  createProductFeedback,
  listAdminReviews,
  listAdminFeedback,
  deleteProductFeedback,
  moderateReview,
  deleteReview
};
