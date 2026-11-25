
const { z } = require('zod');
const db = require('../database/db');

// Show the exact database module loaded by this controller
console.log(
  'CATEGORY CONTROLLER DATABASE MODULE:',
  require.resolve('../database/db')
);

// Check which database file this connection is using
try {
  const databaseInfo = db.prepare('PRAGMA database_list').all();
  console.log('CATEGORY CONTROLLER DATABASE FILE:', databaseInfo);
} catch (error) {
  console.error('DATABASE PATH CHECK ERROR:', error.message);
}

const categorySchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z.string().trim().min(2).max(120).optional(),
  description: z.string().max(2000).nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  parentId: z.string().nullable().optional()
});

function createSlug(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// Build nested categories while keeping the original flat list.
function buildCategoryTree(categories) {
  const categoryMap = new Map();

  categories.forEach(category => {
    categoryMap.set(category.id, {
      ...category,
      children: []
    });
  });

  const roots = [];

  categoryMap.forEach(category => {
    if (category.parent_id && categoryMap.has(category.parent_id)) {
      categoryMap.get(category.parent_id).children.push(category);
    } else {
      roots.push(category);
    }
  });

  return roots;
}

// Check whether a parent exists and prevent circular relationships.
function validateParent(parentId, categoryId = null) {
  if (!parentId) return true;

  const parent = db.prepare(
    'SELECT id FROM categories WHERE id = ?'
  ).get(parentId);

  if (!parent) return false;

  if (categoryId) {
    const descendant = db.prepare(`
      WITH RECURSIVE descendants(id) AS (
        SELECT id
        FROM categories
        WHERE parent_id = ?

        UNION ALL

        SELECT c.id
        FROM categories c
        INNER JOIN descendants d ON c.parent_id = d.id
      )
      SELECT id
      FROM descendants
      WHERE id = ?
    `).get(categoryId, parentId);

    if (descendant || parentId === categoryId) {
      return false;
    }
  }

  return true;
}

// PUBLIC: Get active categories
function listPublicCategories(req, res) {
  try {
    // Diagnostic: Check Summer Collection directly
    const summerDebug = db.prepare(`
      SELECT id, name, is_active, parent_id
      FROM categories
      WHERE id = ?
    `).get('summer_collection_restored');

    console.log('SUMMER FROM CONTROLLER:', summerDebug);

    // Diagnostic: Count all categories
    const totalCategories = db.prepare(
      'SELECT COUNT(*) AS total FROM categories'
    ).get();

    console.log(
      'TOTAL CATEGORIES FROM CONTROLLER:',
      totalCategories
    );

    const categories = db.prepare(`
      SELECT
        c.id,
        c.name,
        c.slug,
        c.description,
        c.image_url,
        c.parent_id,
        c.sort_order,
        COUNT(p.id) AS product_count
      FROM categories c
      LEFT JOIN products p
        ON p.category_id = c.id
        AND p.status = 'published'
      WHERE c.is_active = 1
      GROUP BY c.id
      ORDER BY c.sort_order ASC, c.name ASC
    `).all();

    console.log(
      'SUMMER IN PUBLIC API:',
      categories.find(category => category.id === 'summer_collection_restored')
    );

    console.log('PUBLIC CATEGORY COUNT:', categories.length);

    return res.json({
      success: true,
      categories,
      categoryTree: buildCategoryTree(categories)
    });
  } catch (error) {
    console.error('Public categories error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to load categories.'
    });
  }
}

// ADMIN: Get all categories
function listAdminCategories(req, res) {
  try {
    const categories = db.prepare(`
      SELECT
        c.*,
        COUNT(p.id) AS product_count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.id
      GROUP BY c.id
      ORDER BY c.sort_order ASC, c.name ASC
    `).all();

    return res.json({
      success: true,
      categories,
      categoryTree: buildCategoryTree(categories)
    });
  } catch (error) {
    console.error('Admin categories error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to load categories.'
    });
  }
}

// ADMIN: Create category
function createCategory(req, res) {
  const validation = categorySchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: 'Invalid category information.',
      errors: validation.error.flatten().fieldErrors
    });
  }

  const data = validation.data;
  const slug = createSlug(data.slug || data.name);
  const parentId = data.parentId || null;

  try {
    if (parentId && !validateParent(parentId)) {
      return res.status(400).json({
        success: false,
        message: 'Selected parent category does not exist.'
      });
    }

    db.prepare(`
      INSERT INTO categories (
        name,
        slug,
        description,
        image_url,
        is_active,
        sort_order,
        parent_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.name,
      slug,
      data.description || null,
      data.imageUrl || null,
      data.isActive === false ? 0 : 1,
      data.sortOrder ?? 0,
      parentId
    );

    const category = db.prepare(
      'SELECT * FROM categories WHERE slug = ?'
    ).get(slug);

    return res.status(201).json({
      success: true,
      message: 'Category created successfully.',
      category
    });
  } catch (error) {
    console.error('Create category error:', error);

    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({
        success: false,
        message: 'A category with this slug already exists.'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Unable to create category.'
    });
  }
}

// ADMIN: Update category
function updateCategory(req, res) {
  const validation = categorySchema.partial().safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: 'Invalid category information.',
      errors: validation.error.flatten().fieldErrors
    });
  }

  const data = validation.data;

  try {
    const existing = db.prepare(
      'SELECT * FROM categories WHERE id = ?'
    ).get(req.params.id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Category not found.'
      });
    }

    if (data.parentId !== undefined && data.parentId !== null) {
      if (!validateParent(data.parentId, req.params.id)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid parent category. Circular category relationships are not allowed.'
        });
      }
    }

    const fields = [];
    const values = [];

    const fieldMap = {
      name: 'name',
      description: 'description',
      imageUrl: 'image_url',
      isActive: 'is_active',
      sortOrder: 'sort_order',
      parentId: 'parent_id'
    };

    for (const [key, column] of Object.entries(fieldMap)) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        fields.push(`${column} = ?`);

        let value = data[key];

        if (key === 'isActive') value = value ? 1 : 0;
        if (key === 'imageUrl') value = value || null;
        if (key === 'parentId') value = value || null;

        values.push(value);
      }
    }

    if (data.slug !== undefined || data.name !== undefined) {
      fields.push('slug = ?');
      values.push(
        createSlug(data.slug || data.name || existing.name)
      );
    }

    if (fields.length) {
      db.prepare(`
        UPDATE categories
        SET ${fields.join(', ')}
        WHERE id = ?
      `).run(...values, req.params.id);
    }

    const category = db.prepare(
      'SELECT * FROM categories WHERE id = ?'
    ).get(req.params.id);

    return res.json({
      success: true,
      message: 'Category updated successfully.',
      category
    });
  } catch (error) {
    console.error('Update category error:', error);

    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({
        success: false,
        message: 'A category with this slug already exists.'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Unable to update category.'
    });
  }
}

// ADMIN: Delete category
function deleteCategory(req, res) {
  try {
    const result = db.prepare(
      'DELETE FROM categories WHERE id = ?'
    ).run(req.params.id);

    if (!result.changes) {
      return res.status(404).json({
        success: false,
        message: 'Category not found.'
      });
    }

    return res.json({
      success: true,
      message: 'Category deleted successfully.'
    });
  } catch (error) {
    console.error('Delete category error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to delete category.'
    });
  }
}

module.exports = {
  listPublicCategories,
  listAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory
};
