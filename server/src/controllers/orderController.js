
const crypto = require('crypto');
const db = require('../database/db');

const {
  sendAdminNotification
} = require('../services/notificationService');

// ==========================================
// ORDER NUMBER
// ==========================================

function makeOrderNumber() {
  const date = new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, '');

  const random = crypto
    .randomBytes(3)
    .toString('hex')
    .toUpperCase();

  return `AUR-${date}-${random}`;
}

// ==========================================
// CHECKOUT
// ==========================================

async function checkout(req, res) {
  try {
    const { addressId, couponCode, notes } = req.body;

    if (typeof addressId !== 'string' || !addressId) {
      return res.status(400).json({
        success: false,
        message: 'Please select a shipping address.'
      });
    }

    if (
      couponCode !== undefined &&
      couponCode !== null &&
      typeof couponCode !== 'string'
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coupon code.'
      });
    }

    const normalizedCouponCode =
      typeof couponCode === 'string' && couponCode.trim()
        ? couponCode.trim().toUpperCase()
        : null;

    const address = db.prepare(`
      SELECT
        recipient_name,
        phone,
        line1,
        line2,
        city,
        postal_code
      FROM addresses
      WHERE id = ? AND user_id = ?
    `).get(addressId, req.user.id);

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Shipping address not found.'
      });
    }

    const user = db.prepare(`
      SELECT id, full_name, email, phone
      FROM users
      WHERE id = ?
    `).get(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Customer account not found.'
      });
    }

    const cart = db.prepare(`
      SELECT id
      FROM carts
      WHERE user_id = ?
    `).get(req.user.id);

    if (!cart) {
      return res.status(400).json({
        success: false,
        message: 'Your cart is empty.'
      });
    }

    const items = db.prepare(`
      SELECT
        ci.product_id,
        ci.variant_id,
        ci.quantity,
        p.name,
        p.price,
        p.status,
        pv.size,
        pv.color_name,
        pv.stock_quantity,
        pv.is_active
      FROM cart_items ci
      JOIN products p ON p.id = ci.product_id
      JOIN product_variants pv ON pv.id = ci.variant_id
      WHERE ci.cart_id = ?
    `).all(cart.id);

    if (!items.length) {
      return res.status(400).json({
        success: false,
        message: 'Your cart is empty.'
      });
    }

    for (const item of items) {
      if (
        item.status !== 'published' ||
        !item.is_active ||
        item.stock_quantity < item.quantity
      ) {
        return res.status(400).json({
          success: false,
          message: `${item.name} is unavailable or has insufficient stock.`
        });
      }
    }

    const subtotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    if (!Number.isSafeInteger(subtotal)) {
      return res.status(400).json({
        success: false,
        message: 'Unable to calculate order subtotal.'
      });
    }

    const deliverySetting = db.prepare(`
      SELECT value
      FROM store_settings
      WHERE key = 'delivery_fee'
    `).get();

    const configuredDeliveryFee = deliverySetting
      ? Math.max(0, Number(deliverySetting.value) || 0)
      : 500;

    const deliveryFee = subtotal >= 25000
      ? 0
      : configuredDeliveryFee;

    const orderId = crypto.randomUUID().replace(/-/g, '');
    const orderNumber = makeOrderNumber();

    let discount = 0;
    let total = subtotal + deliveryFee;

    // ==========================================
    // DATABASE TRANSACTION
    // ==========================================

    const createOrder = db.transaction(() => {
      let coupon = null;
      discount = 0;

      if (normalizedCouponCode) {
        coupon = db.prepare(`
          SELECT *
          FROM coupons
          WHERE code = ? COLLATE NOCASE
            AND is_active = 1
            AND (
              starts_at IS NULL
              OR datetime(starts_at) <= datetime('now')
            )
            AND (
              expires_at IS NULL
              OR datetime(expires_at) >= datetime('now')
            )
            AND (
              usage_limit IS NULL
              OR used_count < usage_limit
            )
        `).get(normalizedCouponCode);

        if (!coupon) {
          throw new Error(
            'Coupon is invalid, expired, or no longer available.'
          );
        }

        if (subtotal < coupon.minimum_order) {
          throw new Error(
            `Minimum order is PKR ${coupon.minimum_order}.`
          );
        }

        discount = coupon.discount_type === 'percentage'
          ? Math.floor(
              subtotal * coupon.discount_value / 100
            )
          : Math.min(
              subtotal,
              coupon.discount_value
            );

        const usage = db.prepare(`
          UPDATE coupons
          SET used_count = used_count + 1
          WHERE id = ?
            AND is_active = 1
            AND (
              usage_limit IS NULL
              OR used_count < usage_limit
            )
            AND (
              starts_at IS NULL
              OR datetime(starts_at) <= datetime('now')
            )
            AND (
              expires_at IS NULL
              OR datetime(expires_at) >= datetime('now')
            )
        `).run(coupon.id);

        if (!usage.changes) {
          throw new Error(
            'Coupon is no longer available. Please try again.'
          );
        }
      }

      total = subtotal - discount + deliveryFee;

      if (!Number.isSafeInteger(total) || total < 0) {
        throw new Error('Unable to calculate order total.');
      }

      db.prepare(`
        INSERT INTO orders (
          id,
          order_number,
          user_id,
          customer_name,
          email,
          phone,
          shipping_address,
          payment_method,
          payment_status,
          subtotal,
          delivery_fee,
          discount_total,
          total,
          notes
        )
        VALUES (
          ?, ?, ?, ?, ?, ?, ?, 'cod', 'unpaid',
          ?, ?, ?, ?, ?
        )
      `).run(
        orderId,
        orderNumber,
        user.id,
        address.recipient_name,
        user.email,
        address.phone || user.phone || '',
        JSON.stringify(address),
        subtotal,
        deliveryFee,
        discount,
        total,
        typeof notes === 'string'
          ? notes.trim().slice(0, 1000)
          : null
      );

      const insertItem = db.prepare(`
        INSERT INTO order_items (
          id,
          order_id,
          product_id,
          variant_id,
          product_name,
          size,
          color_name,
          unit_price,
          quantity,
          line_total
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const updateStock = db.prepare(`
        UPDATE product_variants
        SET stock_quantity = stock_quantity - ?
        WHERE id = ?
          AND stock_quantity >= ?
          AND is_active = 1
      `);

      const insertLog = db.prepare(`
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
      `);

      for (const item of items) {
        const stockUpdate = updateStock.run(
          item.quantity,
          item.variant_id,
          item.quantity
        );

        if (!stockUpdate.changes) {
          throw new Error(
            `Insufficient stock for ${item.name}.`
          );
        }

        insertItem.run(
          crypto.randomUUID().replace(/-/g, ''),
          orderId,
          item.product_id,
          item.variant_id,
          item.name,
          item.size,
          item.color_name,
          item.price,
          item.quantity,
          item.price * item.quantity
        );

        insertLog.run(
          crypto.randomUUID().replace(/-/g, ''),
          item.variant_id,
          -item.quantity,
          item.stock_quantity,
          item.stock_quantity - item.quantity,
          `Order ${orderNumber}`,
          user.id
        );
      }

      db.prepare(`
        DELETE FROM cart_items
        WHERE cart_id = ?
      `).run(cart.id);
    });

    createOrder();

    const order = db.prepare(`
      SELECT *
      FROM orders
      WHERE id = ?
    `).get(orderId);

    // ==========================================
    // ONESIGNAL ADMIN NOTIFICATION
    // ==========================================

    try {
      const admins = db.prepare(`
        SELECT id
        FROM users
        WHERE role IN ('admin', 'staff')
          AND is_active = 1
      `).all();

      const notificationResults = await Promise.allSettled(
        admins.map(admin =>
          sendAdminNotification({
            adminId: admin.id,
            title: 'New Order Received!',
            message: `Order ${orderNumber} received. Total: PKR ${total.toLocaleString('en-PK')}`,
            type: 'new_order',
            data: {
              orderId,
              orderNumber,
              total,
              screen: 'orders'
            }
          })
        )
      );

      notificationResults.forEach(result => {
        if (result.status === 'rejected') {
          console.error(
            'Admin notification failed:',
            result.reason
          );
        }
      });

    } catch (notificationError) {
      console.error(
        'Order notification error:',
        notificationError
      );
    }

    // ==========================================
    // CHECKOUT RESPONSE
    // ==========================================

    return res.status(201).json({
      success: true,
      message: 'Order placed successfully.',
      order
    });

  } catch (error) {
    console.error('Checkout:', error);

    return res.status(400).json({
      success: false,
      message: error.message || 'Unable to place order.'
    });
  }
}

// ==========================================
// CUSTOMER ORDER HISTORY
// ==========================================

function listMyOrders(req, res) {
  try {
    const orders = db.prepare(`
      SELECT *
      FROM orders
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(req.user.id);

    return res.json({
      success: true,
      orders
    });

  } catch (error) {
    console.error('My orders:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to load your orders.'
    });
  }
}

// ==========================================
// CUSTOMER SINGLE ORDER
// ==========================================

function getMyOrder(req, res) {
  try {
    const order = db.prepare(`
      SELECT *
      FROM orders
      WHERE id = ? AND user_id = ?
    `).get(req.params.id, req.user.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.'
      });
    }

    const items = db.prepare(`
      SELECT *
      FROM order_items
      WHERE order_id = ?
    `).all(order.id);

    return res.json({
      success: true,
      order: {
        ...order,
        items
      }
    });

  } catch (error) {
    console.error('Get customer order:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to load order.'
    });
  }
}

// ==========================================
// ADMIN ALL ORDERS WITH ITEMS
// ==========================================

function listAllOrders(req, res) {
  try {
    const orders = db.prepare(`
      SELECT *
      FROM orders
      ORDER BY created_at DESC
    `).all();

    const getItems = db.prepare(`
      SELECT
        id,
        order_id,
        product_id,
        variant_id,
        product_name,
        size,
        color_name,
        unit_price,
        quantity,
        line_total
      FROM order_items
      WHERE order_id = ?
    `);

    const ordersWithItems = orders.map(order => ({
      ...order,
      items: getItems.all(order.id)
    }));

    return res.json({
      success: true,
      orders: ordersWithItems
    });

  } catch (error) {
    console.error('List orders:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to load orders.'
    });
  }
}

// ==========================================
// ADMIN SINGLE ORDER WITH ITEMS
// ==========================================

function getAdminOrder(req, res) {
  try {
    const order = db.prepare(`
      SELECT *
      FROM orders
      WHERE id = ?
    `).get(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.'
      });
    }

    const items = db.prepare(`
      SELECT *
      FROM order_items
      WHERE order_id = ?
    `).all(order.id);

    return res.json({
      success: true,
      order: {
        ...order,
        items
      }
    });

  } catch (error) {
    console.error('Admin get order:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to load order.'
    });
  }
}

// ==========================================
// ADMIN UPDATE ORDER STATUS
// ==========================================

function updateOrderStatus(req, res) {
  try {
    const allowedStatuses = [
      'pending',
      'confirmed',
      'processing',
      'shipped',
      'delivered',
      'cancelled',
      'returned'
    ];

    const { status } = req.body;

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order status.'
      });
    }

    const updateOrder = db.transaction(() => {
      const order = db.prepare(`
        SELECT id, order_number, status
        FROM orders
        WHERE id = ?
      `).get(req.params.id);

      if (!order) {
        throw new Error('ORDER_NOT_FOUND');
      }

      if (order.status === status) {
        return {
          unchanged: true,
          previousStatus: order.status
        };
      }

      if (order.status === 'cancelled') {
        throw new Error('CANCELLED_ORDER_LOCKED');
      }

      const cancellableStatuses = [
        'pending',
        'confirmed',
        'processing'
      ];

      if (
        status === 'cancelled' &&
        !cancellableStatuses.includes(order.status)
      ) {
        throw new Error('ORDER_CANNOT_BE_CANCELLED');
      }

      // Restore stock when an order is cancelled.
      if (status === 'cancelled') {
        const items = db.prepare(`
          SELECT variant_id, quantity
          FROM order_items
          WHERE order_id = ?
        `).all(order.id);

        const getVariant = db.prepare(`
          SELECT stock_quantity
          FROM product_variants
          WHERE id = ?
        `);

        const restoreStock = db.prepare(`
          UPDATE product_variants
          SET stock_quantity = stock_quantity + ?
          WHERE id = ?
        `);

        const insertLog = db.prepare(`
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
        `);

        for (const item of items) {
          if (!item.variant_id) {
            continue;
          }

          const variant = getVariant.get(item.variant_id);

          if (!variant) {
            continue;
          }

          const previousQuantity = variant.stock_quantity;
          const newQuantity = previousQuantity + item.quantity;

          const result = restoreStock.run(
            item.quantity,
            item.variant_id
          );

          if (!result.changes) {
            throw new Error('STOCK_RESTORATION_FAILED');
          }

          insertLog.run(
            crypto.randomUUID().replace(/-/g, ''),
            item.variant_id,
            item.quantity,
            previousQuantity,
            newQuantity,
            `Stock restored from cancelled order ${order.order_number}`,
            req.user.id
          );
        }
      }

      db.prepare(`
        UPDATE orders
        SET
          status = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(status, order.id);

      return {
        unchanged: false,
        previousStatus: order.status
      };
    });

    const result = updateOrder();

    return res.json({
      success: true,
      message: result.unchanged
        ? 'Order already has this status.'
        : status === 'cancelled'
          ? 'Order cancelled and stock restored.'
          : 'Order status updated.',
      order: {
        id: req.params.id,
        previousStatus: result.previousStatus,
        status
      }
    });

  } catch (error) {
    if (error.message === 'ORDER_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        message: 'Order not found.'
      });
    }

    if (error.message === 'CANCELLED_ORDER_LOCKED') {
      return res.status(400).json({
        success: false,
        message: 'A cancelled order cannot be reopened.'
      });
    }

    if (error.message === 'ORDER_CANNOT_BE_CANCELLED') {
      return res.status(400).json({
        success: false,
        message: 'Only pending, confirmed, or processing orders can be cancelled.'
      });
    }

    console.error('Update order status:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to update order status.'
    });
  }
}

// ==========================================
// ADMIN BULK DELETE CANCELLED ORDERS
// ==========================================

function deleteCancelledOrders(req, res) {
  try {
    const { orderIds } = req.body;

    // Validate request
    if (
      !Array.isArray(orderIds) ||
      orderIds.length === 0 ||
      orderIds.length > 100
    ) {
      return res.status(400).json({
        success: false,
        message: 'Provide between 1 and 100 order IDs.'
      });
    }

    // Remove duplicate IDs
    const ids = [
      ...new Set(
        orderIds.map(id =>
          typeof id === 'string' ? id.trim() : id
        )
      )
    ];

    if (
      ids.some(
        id => typeof id !== 'string' || !id
      )
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order IDs.'
      });
    }

    const deleteOrders = db.transaction(() => {
      const placeholders = ids.map(() => '?').join(',');

      // Check all selected orders
      const selectedOrders = db.prepare(`
        SELECT id, status
        FROM orders
        WHERE id IN (${placeholders})
      `).all(...ids);

      if (selectedOrders.length !== ids.length) {
        throw new Error(
          'One or more selected orders were not found.'
        );
      }

      // Only cancelled orders can be deleted
      const invalidOrders = selectedOrders.filter(
        order =>
          String(order.status).toLowerCase() !== 'cancelled'
      );

      if (invalidOrders.length > 0) {
        throw new Error(
          'Only cancelled orders can be permanently deleted.'
        );
      }

      // Delete orders.
      // order_items are automatically deleted through ON DELETE CASCADE.
      const result = db.prepare(`
        DELETE FROM orders
        WHERE id IN (${placeholders})
          AND LOWER(status) = 'cancelled'
      `).run(...ids);

      if (result.changes !== ids.length) {
        throw new Error(
          'Could not delete all selected orders.'
        );
      }

      return result.changes;
    });

    const deletedCount = deleteOrders();

    return res.status(200).json({
      success: true,
      message: `${deletedCount} cancelled order(s) permanently deleted.`,
      deletedCount
    });

  } catch (error) {
    console.error('Delete cancelled orders:', error);

    return res.status(400).json({
      success: false,
      message:
        error.message ||
        'Unable to delete cancelled orders.'
    });
  }
}

// ==========================================
// EXPORT CONTROLLERS
// ==========================================

module.exports = {
  checkout,
  listMyOrders,
  getMyOrder,
  listAllOrders,
  getAdminOrder,
  updateOrderStatus,
  deleteCancelledOrders
};
