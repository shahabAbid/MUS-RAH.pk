
const crypto = require('crypto');
const { z } = require('zod');
const db = require('../database/db');

// ==========================================
// DATE VALIDATION
// ==========================================

const dateSchema = z.string()
  .refine(
    value => !Number.isNaN(Date.parse(value)),
    'Invalid date format.'
  )
  .nullable()
  .optional();

function isExpiryValid(startsAt, expiresAt) {
  if (!startsAt || !expiresAt) {
    return true;
  }

  return new Date(expiresAt).getTime() >
    new Date(startsAt).getTime();
}

function isCouponCurrentlyValid(coupon) {
  const result = db.prepare(`
    SELECT
      CASE
        WHEN is_active != 1 THEN 0
        WHEN starts_at IS NOT NULL
          AND datetime(starts_at) > datetime('now') THEN 0
        WHEN expires_at IS NOT NULL
          AND datetime(expires_at) < datetime('now') THEN 0
        WHEN usage_limit IS NOT NULL
          AND used_count >= usage_limit THEN 0
        ELSE 1
      END AS valid
    FROM coupons
    WHERE id = ?
  `).get(coupon.id);

  return Boolean(result?.valid);
}

// ==========================================
// COUPON VALIDATION SCHEMA
// ==========================================

const couponSchema = z.object({
  code: z.string()
    .trim()
    .min(2)
    .max(40)
    .regex(/^[A-Za-z0-9_-]+$/),

  discountType: z.enum(['percentage', 'fixed']),

  discountValue: z.number()
    .int()
    .positive(),

  minimumOrder: z.number()
    .int()
    .min(0)
    .default(0),

  startsAt: dateSchema,

  expiresAt: dateSchema,

  usageLimit: z.number()
    .int()
    .positive()
    .nullable()
    .optional(),

  isActive: z.boolean()
    .default(true)

}).refine(
  data =>
    data.discountType !== 'percentage' ||
    data.discountValue <= 100,
  {
    message: 'Percentage discount cannot exceed 100%.',
    path: ['discountValue']
  }
);

// ==========================================
// ADMIN: LIST COUPONS
// ==========================================

function listCoupons(req, res) {
  try {
    const coupons = db.prepare(`
      SELECT *
      FROM coupons
      ORDER BY created_at DESC
    `).all();

    return res.json({
      success: true,
      totalCoupons: coupons.length,
      coupons
    });

  } catch (error) {
    console.error('List coupons:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to load coupons.'
    });
  }
}

// ==========================================
// ADMIN: CREATE COUPON
// ==========================================

function createCoupon(req, res) {
  try {
    const parsed = couponSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: parsed.error.issues[0].message
      });
    }

    const data = parsed.data;

    if (!isExpiryValid(data.startsAt, data.expiresAt)) {
      return res.status(400).json({
        success: false,
        message: 'Expiry must be later than the start date.'
      });
    }

    const id = crypto.randomUUID().replace(/-/g, '');

    db.prepare(`
      INSERT INTO coupons (
        id,
        code,
        discount_type,
        discount_value,
        minimum_order,
        starts_at,
        expires_at,
        usage_limit,
        is_active
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      data.code.toUpperCase(),
      data.discountType,
      data.discountValue,
      data.minimumOrder,
      data.startsAt ? new Date(data.startsAt).toISOString() : null,
      data.expiresAt ? new Date(data.expiresAt).toISOString() : null,
      data.usageLimit ?? null,
      data.isActive ? 1 : 0
    );

    const coupon = db.prepare(`
      SELECT *
      FROM coupons
      WHERE id = ?
    `).get(id);

    return res.status(201).json({
      success: true,
      message: 'Coupon created successfully.',
      coupon
    });

  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({
        success: false,
        message: 'Coupon code already exists.'
      });
    }

    console.error('Create coupon:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to create coupon.'
    });
  }
}

// ==========================================
// ADMIN: UPDATE COUPON
// ==========================================

function updateCoupon(req, res) {
  try {
    const parsed = couponSchema.partial().safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: parsed.error.issues[0].message
      });
    }

    const data = parsed.data;

    if (!Object.keys(data).length) {
      return res.status(400).json({
        success: false,
        message: 'Provide at least one field to update.'
      });
    }

    const current = db.prepare(`
      SELECT *
      FROM coupons
      WHERE id = ?
    `).get(req.params.id);

    if (!current) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found.'
      });
    }

    const next = {
      code: data.code ?? current.code,

      discountType:
        data.discountType ?? current.discount_type,

      discountValue:
        data.discountValue ?? current.discount_value,

      minimumOrder:
        data.minimumOrder ?? current.minimum_order,

      startsAt:
        data.startsAt === undefined
          ? current.starts_at
          : data.startsAt,

      expiresAt:
        data.expiresAt === undefined
          ? current.expires_at
          : data.expiresAt,

      usageLimit:
        data.usageLimit === undefined
          ? current.usage_limit
          : data.usageLimit,

      isActive:
        data.isActive === undefined
          ? current.is_active
          : (data.isActive ? 1 : 0)
    };

    if (
      next.discountType === 'percentage' &&
      next.discountValue > 100
    ) {
      return res.status(400).json({
        success: false,
        message: 'Percentage discount cannot exceed 100%.'
      });
    }

    if (!isExpiryValid(next.startsAt, next.expiresAt)) {
      return res.status(400).json({
        success: false,
        message: 'Expiry must be later than the start date.'
      });
    }

    if (
      next.usageLimit !== null &&
      next.usageLimit < current.used_count
    ) {
      return res.status(400).json({
        success: false,
        message: 'Usage limit cannot be lower than coupons already used.'
      });
    }

    db.prepare(`
      UPDATE coupons
      SET
        code = ?,
        discount_type = ?,
        discount_value = ?,
        minimum_order = ?,
        starts_at = ?,
        expires_at = ?,
        usage_limit = ?,
        is_active = ?
      WHERE id = ?
    `).run(
      next.code.toUpperCase(),
      next.discountType,
      next.discountValue,
      next.minimumOrder,
      next.startsAt
        ? new Date(next.startsAt).toISOString()
        : null,
      next.expiresAt
        ? new Date(next.expiresAt).toISOString()
        : null,
      next.usageLimit,
      next.isActive,
      req.params.id
    );

    const updatedCoupon = db.prepare(`
      SELECT *
      FROM coupons
      WHERE id = ?
    `).get(req.params.id);

    return res.json({
      success: true,
      message: 'Coupon updated successfully.',
      coupon: updatedCoupon
    });

  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({
        success: false,
        message: 'Coupon code already exists.'
      });
    }

    console.error('Update coupon:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to update coupon.'
    });
  }
}

// ==========================================
// ADMIN: DELETE COUPON
// ==========================================

function deleteCoupon(req, res) {
  try {
    const result = db.prepare(`
      DELETE FROM coupons
      WHERE id = ?
    `).run(req.params.id);

    if (!result.changes) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found.'
      });
    }

    return res.json({
      success: true,
      message: 'Coupon deleted successfully.'
    });

  } catch (error) {
    console.error('Delete coupon:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to delete coupon.'
    });
  }
}

// ==========================================
// CUSTOMER: VALIDATE COUPON
// ==========================================

function validateCoupon(req, res) {
  try {
    const code = String(req.body.code || '')
      .trim()
      .toUpperCase();

    const subtotal = req.body.subtotal;

    if (
      !code ||
      !Number.isSafeInteger(subtotal) ||
      subtotal < 0
    ) {
      return res.status(400).json({
        success: false,
        message: 'Valid coupon code and subtotal are required.'
      });
    }

    const coupon = db.prepare(`
      SELECT *
      FROM coupons
      WHERE code = ? COLLATE NOCASE
    `).get(code);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        message: 'Coupon not found.'
      });
    }

    if (!isCouponCurrentlyValid(coupon)) {
      return res.status(400).json({
        success: false,
        message: 'Coupon is inactive, expired, or unavailable.'
      });
    }

    // ==========================================
    // CHECK CUSTOMER'S PREVIOUS COUPON USAGE
    // ==========================================

    const previousUsage = db.prepare(`
      SELECT id
      FROM coupon_usages
      WHERE coupon_id = ?
        AND user_id = ?
    `).get(coupon.id, req.user.id);

    if (previousUsage) {
      return res.status(400).json({
        success: false,
        message: 'You have already used this coupon.'
      });
    }

    // ==========================================
    // CHECK MINIMUM ORDER
    // ==========================================

    if (subtotal < coupon.minimum_order) {
      return res.status(400).json({
        success: false,
        message: `Minimum order is PKR ${coupon.minimum_order}.`
      });
    }

    // ==========================================
    // CALCULATE DISCOUNT
    // ==========================================

    const discount = coupon.discount_type === 'percentage'
      ? Math.floor(
          subtotal * coupon.discount_value / 100
        )
      : Math.min(subtotal, coupon.discount_value);

    return res.json({
      success: true,
      message: 'Coupon applied successfully.',
      coupon: {
        code: coupon.code,
        discountType: coupon.discount_type,
        discountValue: coupon.discount_value
      },
      subtotal,
      discount,
      finalSubtotal: subtotal - discount
    });

  } catch (error) {
    console.error('Validate coupon:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to validate coupon.'
    });
  }
}

// ==========================================
// EXPORT CONTROLLER FUNCTIONS
// ==========================================

module.exports = {
  listCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  validateCoupon
};
