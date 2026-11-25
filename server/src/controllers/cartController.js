
const crypto = require('crypto');
const db = require('../database/db');

function getOrCreateCart(userId) {
  let cart = db.prepare(
    'SELECT id FROM carts WHERE user_id = ?'
  ).get(userId);

  if (!cart) {
    const id = crypto.randomUUID().replace(/-/g, '');

    db.prepare(`
      INSERT INTO carts (id, user_id)
      VALUES (?, ?)
    `).run(id, userId);

    cart = { id };
  }

  return cart;
}

function getCartItems(cartId) {
  return db.prepare(`
    SELECT
      ci.id,
      ci.product_id,
      ci.variant_id,
      ci.quantity,
      p.name AS product_name,
      p.slug,
      p.price,
      p.status,
      pv.sku,
      pv.size,
      pv.color_name,
      pv.color_hex,
      pv.stock_quantity,
      (
        SELECT pi.image_url
        FROM product_images pi
        WHERE pi.product_id = p.id
        ORDER BY pi.sort_order
        LIMIT 1
      ) AS image_url
    FROM cart_items ci
    JOIN products p ON p.id = ci.product_id
    JOIN product_variants pv ON pv.id = ci.variant_id
    WHERE ci.cart_id = ?
    ORDER BY ci.created_at DESC
  `).all(cartId);
}

function getCart(req, res) {
  try {
    const cart = getOrCreateCart(req.user.id);
    const items = getCartItems(cart.id);

    const validItems = items.filter(item =>
      item.status === 'published'
    );

    const subtotal = validItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    return res.json({
      success: true,
      items: validItems,
      subtotal,
      itemCount: validItems.reduce(
        (sum, item) => sum + item.quantity,
        0
      )
    });
  } catch (error) {
    console.error('Get cart:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to load cart.'
    });
  }
}

function addToCart(req, res) {
  try {
    const { productId, variantId, quantity = 1 } = req.body;

    if (
      typeof productId !== 'string' ||
      typeof variantId !== 'string' ||
      !Number.isSafeInteger(quantity) ||
      quantity < 1 ||
      quantity > 99
    ) {
      return res.status(400).json({
        success: false,
        message: 'Valid productId, variantId and quantity are required.'
      });
    }

    const variant = db.prepare(`
      SELECT
        pv.id,
        pv.product_id,
        pv.stock_quantity,
        pv.is_active,
        p.status
      FROM product_variants pv
      JOIN products p ON p.id = pv.product_id
      WHERE pv.id = ? AND pv.product_id = ?
    `).get(variantId, productId);

    if (!variant || variant.status !== 'published' || !variant.is_active) {
      return res.status(404).json({
        success: false,
        message: 'Product variant is unavailable.'
      });
    }

    const cart = getOrCreateCart(req.user.id);

    const existing = db.prepare(`
      SELECT id, quantity
      FROM cart_items
      WHERE cart_id = ? AND variant_id = ?
    `).get(cart.id, variantId);

    const newQuantity = (existing?.quantity || 0) + quantity;

    if (newQuantity > variant.stock_quantity) {
      return res.status(400).json({
        success: false,
        message: 'Requested quantity exceeds available stock.',
        availableStock: variant.stock_quantity
      });
    }

    if (existing) {
      db.prepare(`
        UPDATE cart_items
        SET quantity = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(newQuantity, existing.id);
    } else {
      db.prepare(`
        INSERT INTO cart_items
          (id, cart_id, product_id, variant_id, quantity)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        crypto.randomUUID().replace(/-/g, ''),
        cart.id,
        productId,
        variantId,
        quantity
      );
    }

    return res.status(201).json({
      success: true,
      message: 'Product added to cart.'
    });
  } catch (error) {
    console.error('Add to cart:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to add product to cart.'
    });
  }
}

function updateCartItem(req, res) {
  try {
    const quantity = req.body.quantity;

    if (
      !Number.isSafeInteger(quantity) ||
      quantity < 1 ||
      quantity > 99
    ) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be between 1 and 99.'
      });
    }

    const item = db.prepare(`
      SELECT ci.id, pv.stock_quantity, pv.is_active, p.status
      FROM cart_items ci
      JOIN carts c ON c.id = ci.cart_id
      JOIN product_variants pv ON pv.id = ci.variant_id
      JOIN products p ON p.id = ci.product_id
      WHERE ci.id = ? AND c.user_id = ?
    `).get(req.params.itemId, req.user.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Cart item not found.'
      });
    }

    if (
      item.status !== 'published' ||
      !item.is_active ||
      quantity > item.stock_quantity
    ) {
      return res.status(400).json({
        success: false,
        message: 'Requested quantity is unavailable.',
        availableStock: item.stock_quantity
      });
    }

    db.prepare(`
      UPDATE cart_items
      SET quantity = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(quantity, item.id);

    return res.json({
      success: true,
      message: 'Cart quantity updated.'
    });
  } catch (error) {
    console.error('Update cart:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to update cart.'
    });
  }
}

function removeCartItem(req, res) {
  try {
    const result = db.prepare(`
      DELETE FROM cart_items
      WHERE id = ?
        AND cart_id IN (
          SELECT id FROM carts WHERE user_id = ?
        )
    `).run(req.params.itemId, req.user.id);

    if (!result.changes) {
      return res.status(404).json({
        success: false,
        message: 'Cart item not found.'
      });
    }

    return res.json({
      success: true,
      message: 'Item removed from cart.'
    });
  } catch (error) {
    console.error('Remove cart item:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to remove cart item.'
    });
  }
}

function clearCart(req, res) {
  try {
    db.prepare(`
      DELETE FROM cart_items
      WHERE cart_id IN (
        SELECT id FROM carts WHERE user_id = ?
      )
    `).run(req.user.id);

    return res.json({
      success: true,
      message: 'Cart cleared.'
    });
  } catch (error) {
    console.error('Clear cart:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to clear cart.'
    });
  }
}

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart
};
