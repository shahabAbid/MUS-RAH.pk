const { z } = require('zod');
const db = require('../database/db');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { toAbsoluteUrl, toStoredPath } = require('../utils/imageUrl');

const uploadDirectory = path.join(__dirname, '../../uploads/products');

const productSchema = z.object({
  name: z.string().trim().min(2).max(200),
  slug: z.string().trim().min(2).max(220).optional(),
  description: z.string().max(10000).nullable().optional(),
  price: z.number().int().nonnegative(),
  compareAtPrice: z.number().int().nonnegative().nullable().optional(),
  categoryId: z.string().nullable().optional(),
  isFeatured: z.boolean().optional(),
  status: z.enum(['draft', 'published', 'archived']).optional(),
  images: z.array(z.object({
    // Accepts full URLs (from clients) or stored paths
    imageUrl: z.string().min(1),
    altText: z.string().max(255).optional()
  })).optional(),
  tags: z.array(z.string().trim().min(1).max(50)).optional(),
  variants: z.array(z.object({
    sku: z.string().trim().max(100).nullable().optional(),
    size: z.string().trim().max(50).nullable().optional(),
    colorName: z.string().trim().max(100).nullable().optional(),
    colorHex: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
    stockQuantity: z.number().int().nonnegative().optional()
  })).optional()
});

const updateProductSchema = productSchema.partial();

function createSlug(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Uploaded files are stored as paths only, so the host never gets
// baked into the database.
function getUploadedImageUrls(req) {
  return (req.files || []).map(file => ({
    imageUrl: `/uploads/products/${file.filename}`,
    altText: ''
  }));
}

// Convert any full URLs sent by a client into stored paths
function normalizeIncomingImages(data) {
  if (data.images) {
    data.images = data.images.map(image => ({
      ...image,
      imageUrl: toStoredPath(image.imageUrl)
    }));
  }

  return data;
}

function removeUploadedFiles(files = []) {
  for (const file of files) {
    try {
      if (file.path && fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    } catch (error) {
      console.error('Image cleanup error:', error);
    }
  }
}

function removeStoredImageUrls(imageUrls = []) {
  for (const imageUrl of imageUrls) {
    try {
      // Works for both full URLs and bare paths
      const parsedUrl = new URL(imageUrl, 'http://placeholder');
      const prefix = '/uploads/products/';

      if (!parsedUrl.pathname.startsWith(prefix)) continue;

      const filename = path.basename(parsedUrl.pathname);

      if (!/^[a-f0-9-]{36}\.(jpg|jpeg|png|webp|avif)$/i.test(filename)) {
        continue;
      }

      const filePath = path.join(uploadDirectory, filename);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error('Stored image cleanup error:', error);
    }
  }
}

// Get one complete product from the database
function getProduct(req, productId) {
  const product = db.prepare(`
    SELECT
      p.*,
      c.name AS category_name,
      c.slug AS category_slug
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.id = ?
  `).get(productId);

  if (!product) return null;

  const images = db.prepare(`
    SELECT id, image_url, alt_text, sort_order
    FROM product_images
    WHERE product_id = ?
    ORDER BY sort_order ASC
  `).all(productId).map(image => ({
    ...image,
    image_url: toAbsoluteUrl(req, image.image_url)
  }));

  const tags = db.prepare(`
    SELECT tag FROM product_tags
    WHERE product_id = ?
  `).all(productId).map(item => item.tag);

  const variants = db.prepare(`
    SELECT
      id, sku, size, color_name, color_hex,
      stock_quantity, is_active
    FROM product_variants
    WHERE product_id = ?
  `).all(productId);

  return {
    ...product,
    images,
    tags,
    variants
  };
}

// PUBLIC: List published products
function listProducts(req, res) {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      50,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 12)
    );

    const offset = (page - 1) * limit;
    const conditions = ["p.status = 'published'"];
    const params = [];

    if (req.query.category) {
      conditions.push('c.slug = ?');
      params.push(req.query.category);
    }

    if (req.query.search) {
      conditions.push('(p.name LIKE ? OR p.description LIKE ?)');
      const search = `%${String(req.query.search).trim()}%`;
      params.push(search, search);
    }

    if (req.query.featured === 'true') {
      conditions.push('p.is_featured = 1');
    }

    const where = conditions.join(' AND ');

    const sortOptions = {
      newest: 'p.created_at DESC',
      price_low: 'p.price ASC',
      price_high: 'p.price DESC',
      name: 'p.name ASC'
    };

    const orderBy = sortOptions[req.query.sort] || sortOptions.newest;

    const products = db.prepare(`
      SELECT p.*, c.name AS category_name, c.slug AS category_slug,
        (SELECT image_url FROM product_images
         WHERE product_id = p.id
         ORDER BY sort_order ASC LIMIT 1) AS main_image
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE ${where}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset);

    const total = db.prepare(`
      SELECT COUNT(*) AS total
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      WHERE ${where}
    `).get(...params).total;

    return res.json({
      success: true,
      products: products.map(product => ({
        ...product,
        main_image: toAbsoluteUrl(req, product.main_image)
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('List products error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to load products.'
    });
  }
}

// PUBLIC: Get one published product
function getPublicProduct(req, res) {
  try {
    const product = db.prepare(`
      SELECT id FROM products
      WHERE (id = ? OR slug = ?)
        AND status = 'published'
    `).get(req.params.identifier, req.params.identifier);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.'
      });
    }

    return res.json({
      success: true,
      product: getProduct(req, product.id)
    });
  } catch (error) {
    console.error('Get product error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to load product.'
    });
  }
}

// ADMIN: List ALL products with complete details
function listAdminProducts(req, res) {
  try {
    const productIds = db.prepare(`
      SELECT id
      FROM products
      ORDER BY created_at DESC
    `).all();

    const products = productIds.map(({ id }) => getProduct(req, id));

    return res.json({
      success: true,
      products
    });
  } catch (error) {
    console.error('Admin products error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to load admin products.'
    });
  }
}

// Parse multipart JSON fields
function parseProductBody(body, isUpdate = false) {
  const jsonFields = isUpdate
    ? ['images', 'tags']
    : ['images', 'tags', 'variants'];

  for (const field of jsonFields) {
    if (typeof body[field] === 'string') {
      body[field] = JSON.parse(body[field]);
    }
  }

  if (typeof body.isFeatured === 'string') {
    body.isFeatured = body.isFeatured === 'true';
  }

  for (const field of ['price', 'compareAtPrice']) {
    if (typeof body[field] === 'string') {
      body[field] = body[field] === '' && field === 'compareAtPrice'
        ? null
        : Number(body[field]);
    }
  }

  if (typeof body.categoryId === 'string' && body.categoryId === '') {
    body.categoryId = null;
  }

  return body;
}

// ADMIN: Create product
function createProduct(req, res) {
  let data;

  try {
    const body = parseProductBody({ ...req.body });
    const validation = productSchema.safeParse(body);

    if (!validation.success) {
      removeUploadedFiles(req.files);

      return res.status(400).json({
        success: false,
        message: 'Invalid product information.',
        errors: validation.error.flatten().fieldErrors
      });
    }

    data = normalizeIncomingImages(validation.data);
  } catch (error) {
    removeUploadedFiles(req.files);

    return res.status(400).json({
      success: false,
      message: 'Invalid JSON in images, tags, or variants.'
    });
  }

  const slug = createSlug(data.slug || data.name);

  if (!slug) {
    removeUploadedFiles(req.files);

    return res.status(400).json({
      success: false,
      message: 'Please provide a valid product name or slug.'
    });
  }

  const uploadedImages = getUploadedImageUrls(req);

  try {
    const create = db.transaction(() => {
      const productId = crypto.randomUUID().replace(/-/g, '');

      db.prepare(`
        INSERT INTO products (
          id, category_id, name, slug, description, price,
          compare_at_price, is_featured, status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        productId,
        data.categoryId || null,
        data.name,
        slug,
        data.description || null,
        data.price,
        data.compareAtPrice ?? null,
        data.isFeatured ? 1 : 0,
        data.status || 'draft'
      );

      const insertImage = db.prepare(`
        INSERT INTO product_images (
          product_id, image_url, alt_text, sort_order
        )
        VALUES (?, ?, ?, ?)
      `);

      const allImages = [
        ...(data.images || []),
        ...uploadedImages
      ];

      allImages.forEach((image, index) => {
        insertImage.run(
          productId,
          image.imageUrl,
          image.altText || null,
          index
        );
      });

      const insertTag = db.prepare(`
        INSERT OR IGNORE INTO product_tags (product_id, tag)
        VALUES (?, ?)
      `);

      (data.tags || []).forEach(tag => {
        insertTag.run(productId, tag);
      });

      const insertVariant = db.prepare(`
        INSERT INTO product_variants (
          product_id, sku, size, color_name,
          color_hex, stock_quantity
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      (data.variants || []).forEach(variant => {
        insertVariant.run(
          productId,
          variant.sku || null,
          variant.size || null,
          variant.colorName || null,
          variant.colorHex || null,
          variant.stockQuantity ?? 0
        );
      });

      return productId;
    });

    const productId = create();

    return res.status(201).json({
      success: true,
      message: 'Product created successfully.',
      product: getProduct(req, productId)
    });
  } catch (error) {
    removeUploadedFiles(req.files);
    console.error('Create product error:', error);

    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({
        success: false,
        message: 'A product with this slug or SKU already exists.'
      });
    }

    if (error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
      return res.status(400).json({
        success: false,
        message: 'The selected category does not exist.'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Unable to create product.'
    });
  }
}

// ADMIN: Update product
function updateProduct(req, res) {
  let data;

  try {
    const body = parseProductBody({ ...req.body }, true);
    const validation = updateProductSchema.safeParse(body);

    if (!validation.success) {
      removeUploadedFiles(req.files);

      return res.status(400).json({
        success: false,
        message: 'Invalid product information.',
        errors: validation.error.flatten().fieldErrors
      });
    }

    data = normalizeIncomingImages(validation.data);
  } catch (error) {
    removeUploadedFiles(req.files);

    return res.status(400).json({
      success: false,
      message: 'Invalid JSON in images or tags.'
    });
  }

  const uploadedImages = getUploadedImageUrls(req);
  let oldImageUrls = [];

  try {
    const update = db.transaction(() => {
      const existing = db.prepare(
        'SELECT id, name FROM products WHERE id = ?'
      ).get(req.params.id);

      if (!existing) {
        const error = new Error('Product not found.');
        error.status = 404;
        throw error;
      }

      const fields = [];
      const values = [];

      const fieldMap = {
        name: 'name',
        description: 'description',
        price: 'price',
        compareAtPrice: 'compare_at_price',
        categoryId: 'category_id',
        isFeatured: 'is_featured',
        status: 'status'
      };

      for (const [key, column] of Object.entries(fieldMap)) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          fields.push(`${column} = ?`);

          let value = data[key];

          if (key === 'isFeatured') value = value ? 1 : 0;
          if (key === 'categoryId') value = value || null;

          values.push(value);
        }
      }

      if (data.slug !== undefined || data.name !== undefined) {
        fields.push('slug = ?');
        values.push(createSlug(data.slug || data.name || existing.name));
      }

      if (fields.length) {
        fields.push('updated_at = CURRENT_TIMESTAMP');

        db.prepare(`
          UPDATE products SET ${fields.join(', ')}
          WHERE id = ?
        `).run(...values, req.params.id);
      }

      const shouldReplaceImages =
        data.images !== undefined || uploadedImages.length > 0;

      if (shouldReplaceImages) {
        // Compare images by their stored path, so old rows saved with a
        // full URL (any host) still match the path sent by the client.
        const currentImages = db.prepare(`
          SELECT id, image_url, alt_text, sort_order
          FROM product_images
          WHERE product_id = ?
          ORDER BY sort_order ASC
        `).all(req.params.id).map(image => ({
          ...image,
          key: toStoredPath(image.image_url)
        }));

        const requestedImages = data.images || [];

        const requestedKeys = data.images === undefined
          ? new Set(currentImages.map(image => image.key))
          : new Set(requestedImages.map(image => image.imageUrl));

        const retainedImages = currentImages.filter(
          image => requestedKeys.has(image.key)
        );

        const retainedKeys = new Set(
          retainedImages.map(image => image.key)
        );

        const imagesToInsert = [
          ...requestedImages.filter(
            image => !retainedKeys.has(image.imageUrl)
          ),
          ...uploadedImages
        ];

        const finalImages = [
          ...retainedImages.map(image => ({
            imageUrl: image.key, // saved as a path from now on
            altText: image.alt_text || ''
          })),
          ...imagesToInsert
        ];

        oldImageUrls = currentImages
          .filter(image => !requestedKeys.has(image.key))
          .map(image => image.image_url);

        db.prepare(
          'DELETE FROM product_images WHERE product_id = ?'
        ).run(req.params.id);

        const insertImage = db.prepare(`
          INSERT INTO product_images (
            product_id, image_url, alt_text, sort_order
          )
          VALUES (?, ?, ?, ?)
        `);

        finalImages.forEach((image, index) => {
          insertImage.run(
            req.params.id,
            image.imageUrl,
            image.altText || null,
            index
          );
        });
      }

      if (data.tags !== undefined) {
        db.prepare(
          'DELETE FROM product_tags WHERE product_id = ?'
        ).run(req.params.id);

        const insertTag = db.prepare(`
          INSERT OR IGNORE INTO product_tags (product_id, tag)
          VALUES (?, ?)
        `);

        data.tags.forEach(tag => insertTag.run(req.params.id, tag));
      }

      // Preserve existing variants and inventory history.
    });

    update();

    if (oldImageUrls.length) {
      const stillUsed = new Set(
        db.prepare(`
          SELECT image_url FROM product_images
          WHERE product_id = ?
        `).all(req.params.id).map(item => toStoredPath(item.image_url))
      );

      removeStoredImageUrls(
        oldImageUrls.filter(url => !stillUsed.has(toStoredPath(url)))
      );
    }

    return res.json({
      success: true,
      message: 'Product updated successfully.',
      product: getProduct(req, req.params.id)
    });
  } catch (error) {
    removeUploadedFiles(req.files);
    console.error('Update product error:', error);

    if (error.status === 404) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({
        success: false,
        message: 'The product slug or SKU is already in use.'
      });
    }

    if (error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
      return res.status(400).json({
        success: false,
        message: 'The selected category does not exist.'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Unable to update product.'
    });
  }
}

// ADMIN: Delete product
function deleteProduct(req, res) {
  try {
    const imageUrls = db.prepare(`
      SELECT image_url FROM product_images
      WHERE product_id = ?
    `).all(req.params.id).map(item => item.image_url);

    const result = db.prepare(
      'DELETE FROM products WHERE id = ?'
    ).run(req.params.id);

    if (!result.changes) {
      return res.status(404).json({
        success: false,
        message: 'Product not found.'
      });
    }

    removeStoredImageUrls(imageUrls);

    return res.json({
      success: true,
      message: 'Product deleted successfully.'
    });
  } catch (error) {
    console.error('Delete product error:', error);

    if (error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
      return res.status(409).json({
        success: false,
        message: 'This product has inventory history and cannot be deleted. Archive it instead.'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Unable to delete product.'
    });
  }
}

module.exports = {
  listProducts,
  getPublicProduct,
  listAdminProducts,
  createProduct,
  updateProduct,
  deleteProduct
};