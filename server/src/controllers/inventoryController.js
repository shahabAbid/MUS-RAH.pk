
const crypto = require('crypto');
const { z } = require('zod');
const db = require('../database/db');

const stockSchema = z.object({
  changeQuantity: z.coerce
    .number()
    .int('Stock change must be a whole number.')
    .refine(value => value !== 0, 'Stock change cannot be zero.'),
  reason: z.string().trim().max(200).optional()
});

// Adjust product stock
function adjustStock(req, res) {
  try {
    const validation = stockSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid stock adjustment.',
        errors: validation.error.issues
      });
    }

    const { changeQuantity, reason } = validation.data;
    const variantId = req.params.variantId;

    const adjustTransaction = db.transaction(() => {
      const variant = db.prepare(`
        SELECT
          pv.id,
          pv.product_id,
          pv.sku,
          pv.size,
          pv.color_name,
          pv.stock_quantity,
          p.name AS product_name
        FROM product_variants pv
        JOIN products p ON p.id = pv.product_id
        WHERE pv.id = ?
      `).get(variantId);

      if (!variant) {
        const error = new Error('Product variant not found.');
        error.status = 404;
        throw error;
      }

      const previousQuantity = variant.stock_quantity;
      const newQuantity = previousQuantity + changeQuantity;

      if (newQuantity < 0) {
        const error = new Error(
          'Insufficient stock. Stock quantity cannot become negative.'
        );
        error.status = 400;
        throw error;
      }

      db.prepare(`
        UPDATE product_variants
        SET stock_quantity = ?
        WHERE id = ?
      `).run(newQuantity, variantId);

      db.prepare(`
        INSERT INTO inventory_logs (
          id,
          variant_id,
          change_quantity,
          previous_quantity,
          new_quantity,
          reason,
          changed_by
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        crypto.randomBytes(16).toString('hex'),
        variantId,
        changeQuantity,
        previousQuantity,
        newQuantity,
        reason || 'Manual stock adjustment',
        req.user.id
      );

      return {
        variantId,
        productId: variant.product_id,
        productName: variant.product_name,
        sku: variant.sku,
        size: variant.size,
        colorName: variant.color_name,
        previousQuantity,
        changeQuantity,
        newQuantity
      };
    });

    const result = adjustTransaction();

    return res.json({
      success: true,
      message: 'Stock updated successfully.',
      inventory: result
    });
  } catch (error) {
    console.error('Stock adjustment error:', error);

    return res.status(error.status || 500).json({
      success: false,
      message: error.status
        ? error.message
        : 'Unable to update stock.'
    });
  }
}

// Get inventory history for a variant
function getInventoryHistory(req, res) {
  try {
    const variantId = req.params.variantId;

    const variant = db.prepare(`
      SELECT
        pv.id,
        pv.sku,
        pv.size,
        pv.color_name,
        p.id AS product_id,
        p.name AS product_name
      FROM product_variants pv
      JOIN products p ON p.id = pv.product_id
      WHERE pv.id = ?
    `).get(variantId);

    if (!variant) {
      return res.status(404).json({
        success: false,
        message: 'Product variant not found.'
      });
    }

    const history = db.prepare(`
      SELECT
        il.id,
        il.change_quantity,
        il.previous_quantity,
        il.new_quantity,
        il.reason,
        il.created_at,
        u.id AS admin_id,
        u.full_name AS admin_name,
        u.email AS admin_email
      FROM inventory_logs il
      LEFT JOIN users u ON u.id = il.changed_by
      WHERE il.variant_id = ?
      ORDER BY il.created_at DESC, il.rowid DESC
    `).all(variantId);

    return res.json({
      success: true,
      product: {
        id: variant.product_id,
        name: variant.product_name
      },
      variant: {
        id: variant.id,
        sku: variant.sku,
        size: variant.size,
        colorName: variant.color_name
      },
      totalRecords: history.length,
      history
    });
  } catch (error) {
    console.error('Inventory history error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to retrieve inventory history.'
    });
  }
}

module.exports = {
  adjustStock,
  getInventoryHistory
};
