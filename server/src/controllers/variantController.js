
const crypto = require('crypto');
const { z } = require('zod');
const db = require('../database/db');

const createVariantSchema = z.object({
  productId: z.string().min(1),
  sku: z.string().trim().min(1).max(100),
  size: z.string().trim().min(1).max(50),
  colorName: z.string().trim().min(1).max(100),
  colorHex: z.string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Enter a valid hex color.')
    .optional(),
  stockQuantity: z.coerce.number().int().min(0).default(0),
  lowStockThreshold: z.coerce.number().int().min(0).default(5)
});

const updateVariantSchema = z.object({
  sku: z.string().trim().min(1).max(100).optional(),
  size: z.string().trim().min(1).max(50).optional(),
  colorName: z.string().trim().min(1).max(100).optional(),
  colorHex: z.string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Enter a valid hex color.')
    .nullable()
    .optional(),
  isActive: z.boolean().optional(),
  lowStockThreshold: z.coerce.number().int().min(0).optional()
}).refine(data => Object.keys(data).length > 0, {
  message: 'Provide at least one field to update.'
});

// Add a new product variant
function createVariant(req, res) {
  try {
    const validation = createVariantSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid variant information.',
        errors: validation.error.issues
      });
    }

    const data = validation.data;

    const product = db.prepare(`
      SELECT id FROM products WHERE id = ?
    `).get(data.productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.'
      });
    }

    const variantId = crypto.randomBytes(16).toString('hex');

    db.prepare(`
      INSERT INTO product_variants (
        id,
        product_id,
        sku,
        size,
        color_name,
        color_hex,
        stock_quantity,
        low_stock_threshold,
        is_active
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(
      variantId,
      data.productId,
      data.sku,
      data.size,
      data.colorName,
      data.colorHex || null,
      data.stockQuantity,
      data.lowStockThreshold
    );

    const variant = db.prepare(`
      SELECT * FROM product_variants WHERE id = ?
    `).get(variantId);

    return res.status(201).json({
      success: true,
      message: 'Product variant created successfully.',
      variant
    });
  } catch (error) {
    console.error('Create variant error:', error);

    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({
        success: false,
        message: 'This SKU or product size and color combination already exists.'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Unable to create product variant.'
    });
  }
}

// Update variant details without replacing its database record
function updateVariant(req, res) {
  try {
    const validation = updateVariantSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid variant information.',
        errors: validation.error.issues
      });
    }

    const variantId = req.params.variantId;
    const data = validation.data;

    const existing = db.prepare(`
      SELECT * FROM product_variants WHERE id = ?
    `).get(variantId);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Product variant not found.'
      });
    }

    const updated = {
      sku: data.sku ?? existing.sku,
      size: data.size ?? existing.size,
      colorName: data.colorName ?? existing.color_name,
      colorHex: data.colorHex === undefined
        ? existing.color_hex
        : data.colorHex,
      isActive: data.isActive === undefined
        ? existing.is_active
        : Number(data.isActive),
      lowStockThreshold: data.lowStockThreshold
        ?? existing.low_stock_threshold
    };

    db.prepare(`
      UPDATE product_variants
      SET
        sku = ?,
        size = ?,
        color_name = ?,
        color_hex = ?,
        is_active = ?,
        low_stock_threshold = ?
      WHERE id = ?
    `).run(
      updated.sku,
      updated.size,
      updated.colorName,
      updated.colorHex,
      updated.isActive,
      updated.lowStockThreshold,
      variantId
    );

    const variant = db.prepare(`
      SELECT * FROM product_variants WHERE id = ?
    `).get(variantId);

    return res.json({
      success: true,
      message: 'Product variant updated successfully.',
      variant
    });
  } catch (error) {
    console.error('Update variant error:', error);

    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({
        success: false,
        message: 'This SKU or product size and color combination already exists.'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Unable to update product variant.'
    });
  }
}

module.exports = {
  createVariant,
  updateVariant
};
