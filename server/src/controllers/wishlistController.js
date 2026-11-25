
const db = require('../database/db');

function listWishlist(req, res) {
  try {
    const products = db.prepare(`
      SELECT
        p.id,
        p.name,
        p.slug,
        p.description,
        p.price,
        p.compare_at_price,
        p.is_featured,
        (
          SELECT pi.image_url
          FROM product_images pi
          WHERE pi.product_id = p.id
          ORDER BY pi.sort_order ASC
          LIMIT 1
        ) AS image_url,
        w.created_at AS added_at
      FROM wishlists w
      JOIN products p ON p.id = w.product_id
      WHERE w.user_id = ?
        AND p.status = 'published'
      ORDER BY w.created_at DESC
    `).all(req.user.id);

    return res.json({ success: true, products });
  } catch (error) {
    console.error('List wishlist:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to load wishlist.'
    });
  }
}

function addToWishlist(req, res) {
  try {
    const { productId } = req.body;

    if (!productId || typeof productId !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'A valid productId is required.'
      });
    }

    const product = db.prepare(`
      SELECT id FROM products
      WHERE id = ? AND status = 'published'
    `).get(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.'
      });
    }

    db.prepare(`
      INSERT OR IGNORE INTO wishlists (user_id, product_id)
      VALUES (?, ?)
    `).run(req.user.id, productId);

    return res.status(201).json({
      success: true,
      message: 'Product added to wishlist.'
    });
  } catch (error) {
    console.error('Add wishlist:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to add product to wishlist.'
    });
  }
}

function removeFromWishlist(req, res) {
  try {
    const result = db.prepare(`
      DELETE FROM wishlists
      WHERE user_id = ? AND product_id = ?
    `).run(req.user.id, req.params.productId);

    if (!result.changes) {
      return res.status(404).json({
        success: false,
        message: 'Wishlist item not found.'
      });
    }

    return res.json({
      success: true,
      message: 'Product removed from wishlist.'
    });
  } catch (error) {
    console.error('Remove wishlist:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to remove wishlist item.'
    });
  }
}

module.exports = {
  listWishlist,
  addToWishlist,
  removeFromWishlist
};
