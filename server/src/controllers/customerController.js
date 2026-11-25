
const { z } = require('zod');
const crypto = require('crypto');
const db = require('../database/db');

const profileSchema = z.object({
  fullName: z.string().trim().min(2).max(100).optional(),
  phone: z.string().trim().max(30).nullable().optional()
}).refine(data => Object.keys(data).length > 0, {
  message: 'Provide at least one profile field.'
});

const addressSchema = z.object({
  recipientName: z.string().trim().min(2).max(100),
  phone: z.string().trim().min(5).max(30),
  line1: z.string().trim().min(3).max(200),
  line2: z.string().trim().max(200).nullable().optional(),
  city: z.string().trim().min(2).max(100),
  postalCode: z.string().trim().max(20).nullable().optional(),
  isDefault: z.boolean().optional()
});

const addressUpdateSchema = addressSchema.partial().refine(
  data => Object.keys(data).length > 0,
  { message: 'Provide at least one address field.' }
);

// Get customer profile
function getProfile(req, res) {
  const user = db.prepare(`
    SELECT id, full_name, email, phone, created_at
    FROM users
    WHERE id = ?
  `).get(req.user.id);

  if (!user) {
    return res.status(404).json({
      success: false,
      message: 'Customer not found.'
    });
  }

  return res.json({
    success: true,
    profile: user
  });
}

// Update customer profile
function updateProfile(req, res) {
  const validation = profileSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: 'Invalid profile information.',
      errors: validation.error.issues
    });
  }

  const data = validation.data;

  db.prepare(`
    UPDATE users
    SET
      full_name = COALESCE(?, full_name),
      phone = CASE WHEN ? = 1 THEN ? ELSE phone END
    WHERE id = ?
  `).run(
    data.fullName ?? null,
    Object.prototype.hasOwnProperty.call(data, 'phone') ? 1 : 0,
    data.phone ?? null,
    req.user.id
  );

  const profile = db.prepare(`
    SELECT id, full_name, email, phone, created_at
    FROM users
    WHERE id = ?
  `).get(req.user.id);

  return res.json({
    success: true,
    message: 'Profile updated successfully.',
    profile
  });
}

// Get customer addresses
function listAddresses(req, res) {
  const addresses = db.prepare(`
    SELECT *
    FROM addresses
    WHERE user_id = ?
    ORDER BY is_default DESC, created_at DESC
  `).all(req.user.id);

  return res.json({
    success: true,
    addresses
  });
}

// Add a delivery address
function createAddress(req, res) {
  const validation = addressSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: 'Invalid address information.',
      errors: validation.error.issues
    });
  }

  const data = validation.data;

  const createTransaction = db.transaction(() => {
    const addressCount = db.prepare(`
      SELECT COUNT(*) AS total
      FROM addresses
      WHERE user_id = ?
    `).get(req.user.id).total;

    const makeDefault = data.isDefault === true || addressCount === 0;

    if (makeDefault) {
      db.prepare(`
        UPDATE addresses
        SET is_default = 0
        WHERE user_id = ?
      `).run(req.user.id);
    }

    const addressId = crypto.randomUUID().replace(/-/g, '');

    db.prepare(`
      INSERT INTO addresses (
        id,
        user_id,
        recipient_name,
        phone,
        line1,
        line2,
        city,
        postal_code,
        is_default
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      addressId,
      req.user.id,
      data.recipientName,
      data.phone,
      data.line1,
      data.line2 ?? null,
      data.city,
      data.postalCode ?? null,
      makeDefault ? 1 : 0
    );

    return db.prepare(`
      SELECT *
      FROM addresses
      WHERE id = ?
    `).get(addressId);
  });

  try {
    const address = createTransaction();

    return res.status(201).json({
      success: true,
      message: 'Address added successfully.',
      address
    });
  } catch (error) {
    console.error('Create address error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to add address.'
    });
  }
}

// Update an existing address
function updateAddress(req, res) {
  const validation = addressUpdateSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: 'Invalid address information.',
      errors: validation.error.issues
    });
  }

  const data = validation.data;
  const addressId = req.params.addressId;

  const existing = db.prepare(`
    SELECT *
    FROM addresses
    WHERE id = ? AND user_id = ?
  `).get(addressId, req.user.id);

  if (!existing) {
    return res.status(404).json({
      success: false,
      message: 'Address not found.'
    });
  }

  const updated = {
    recipient_name: data.recipientName ?? existing.recipient_name,
    phone: data.phone ?? existing.phone,
    line1: data.line1 ?? existing.line1,
    line2: data.line2 === undefined ? existing.line2 : data.line2,
    city: data.city ?? existing.city,
    postal_code: data.postalCode === undefined
      ? existing.postal_code
      : data.postalCode
  };

  const updateTransaction = db.transaction(() => {
    if (data.isDefault === true) {
      db.prepare(`
        UPDATE addresses
        SET is_default = 0
        WHERE user_id = ?
      `).run(req.user.id);
    }

    db.prepare(`
      UPDATE addresses
      SET
        recipient_name = ?,
        phone = ?,
        line1 = ?,
        line2 = ?,
        city = ?,
        postal_code = ?,
        is_default = ?
      WHERE id = ? AND user_id = ?
    `).run(
      updated.recipient_name,
      updated.phone,
      updated.line1,
      updated.line2,
      updated.city,
      updated.postal_code,
      data.isDefault === true ? 1 : existing.is_default,
      addressId,
      req.user.id
    );

    return db.prepare(`
      SELECT *
      FROM addresses
      WHERE id = ? AND user_id = ?
    `).get(addressId, req.user.id);
  });

  const address = updateTransaction();

  return res.json({
    success: true,
    message: 'Address updated successfully.',
    address
  });
}

// Set an address as default
function setDefaultAddress(req, res) {
  const addressId = req.params.addressId;

  const address = db.prepare(`
    SELECT id
    FROM addresses
    WHERE id = ? AND user_id = ?
  `).get(addressId, req.user.id);

  if (!address) {
    return res.status(404).json({
      success: false,
      message: 'Address not found.'
    });
  }

  const transaction = db.transaction(() => {
    db.prepare(`
      UPDATE addresses
      SET is_default = 0
      WHERE user_id = ?
    `).run(req.user.id);

    db.prepare(`
      UPDATE addresses
      SET is_default = 1
      WHERE id = ? AND user_id = ?
    `).run(addressId, req.user.id);
  });

  transaction();

  return res.json({
    success: true,
    message: 'Default address updated successfully.'
  });
}

// Delete an address
function deleteAddress(req, res) {
  const result = db.prepare(`
    DELETE FROM addresses
    WHERE id = ? AND user_id = ?
  `).run(req.params.addressId, req.user.id);

  if (result.changes === 0) {
    return res.status(404).json({
      success: false,
      message: 'Address not found.'
    });
  }

  return res.json({
    success: true,
    message: 'Address deleted successfully.'
  });
}

module.exports = {
  getProfile,
  updateProfile,
  listAddresses,
  createAddress,
  updateAddress,
  setDefaultAddress,
  deleteAddress
};
