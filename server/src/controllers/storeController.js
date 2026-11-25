
const db = require('../database/db');

const PUBLIC_SETTING_KEYS = [
  'store_name',
  'store_description',
  'currency',
  'delivery_fee',
  'free_delivery_threshold',
  'contact_email',
  'contact_phone',
  'announcement_bar',
  'instagram_url',
  'facebook_url'
];

function getPublicSettings(req, res) {
  try {
    const placeholders = PUBLIC_SETTING_KEYS.map(() => '?').join(', ');

    const rows = db.prepare(`
      SELECT key, value
      FROM store_settings
      WHERE key IN (${placeholders})
    `).all(...PUBLIC_SETTING_KEYS);

    const settings = Object.fromEntries(
      rows.map(row => [row.key, row.value])
    );

    return res.json({ success: true, settings });
  } catch (error) {
    console.error('Public store settings:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to load store settings.'
    });
  }
}

function getAdminSettings(req, res) {
  try {
    const rows = db.prepare(`
      SELECT key, value, updated_at
      FROM store_settings
      ORDER BY key ASC
    `).all();

    return res.json({
      success: true,
      settings: rows
    });
  } catch (error) {
    console.error('Admin store settings:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to load store settings.'
    });
  }
}

function updateStoreSettings(req, res) {
  try {
    const { settings } = req.body;

    if (
      !settings ||
      typeof settings !== 'object' ||
      Array.isArray(settings)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Provide a settings object.'
      });
    }

    const entries = Object.entries(settings);

    if (!entries.length || entries.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Provide between 1 and 50 settings.'
      });
    }

    for (const [key, value] of entries) {
      if (
        !/^[a-z][a-z0-9_]{1,59}$/.test(key) ||
        !['string', 'number', 'boolean'].includes(typeof value) ||
        String(value).length > 2000
      ) {
        return res.status(400).json({
          success: false,
          message: `Invalid setting: ${key}`
        });
      }

      if (
        key === 'delivery_fee' ||
        key === 'free_delivery_threshold'
      ) {
        if (!Number.isSafeInteger(Number(value)) || Number(value) < 0) {
          return res.status(400).json({
            success: false,
            message: `${key} must be a non-negative whole number.`
          });
        }
      }
    }

    const save = db.prepare(`
      INSERT INTO store_settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET
        value = excluded.value,
        updated_at = CURRENT_TIMESTAMP
    `);

    const saveAll = db.transaction(() => {
      for (const [key, value] of entries) {
        save.run(key, String(value));
      }
    });

    saveAll();

    return res.json({
      success: true,
      message: 'Store settings updated.'
    });
  } catch (error) {
    console.error('Update store settings:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to update store settings.'
    });
  }
}

module.exports = {
  getPublicSettings,
  getAdminSettings,
  updateStoreSettings
};
