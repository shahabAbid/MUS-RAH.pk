
const bcrypt = require('bcryptjs');
const db = require('./db');

function createAdmin() {
  const fullName = process.env.ADMIN_NAME?.trim();
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!fullName || !email || !password) {
    throw new Error('Admin details are missing from environment variables.');
  }

  if (fullName.length < 2 || fullName.length > 100) {
    throw new Error('Admin name must be between 2 and 100 characters.');
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Please provide a valid admin email.');
  }

  if (password.length < 12 || password.length > 72) {
    throw new Error('Admin password must be 12–72 characters.');
  }

  const existingAdmin = db.prepare(`
    SELECT id FROM users
    WHERE role = 'admin'
    LIMIT 1
  `).get();

  if (existingAdmin) {
    throw new Error(
      'An admin account already exists. Setup is only allowed once.'
    );
  }

  const passwordHash = bcrypt.hashSync(password, 12);

  db.prepare(`
    INSERT INTO users (
      full_name,
      email,
      password_hash,
      role,
      is_active
    )
    VALUES (?, ?, ?, 'admin', 1)
  `).run(fullName, email, passwordHash);

  console.log('Admin account created successfully.');
  console.log(`Admin email: ${email}`);
}

try {
  createAdmin();
} catch (error) {
  console.error('Admin setup failed:', error.message);
  process.exitCode = 1;
} finally {
  db.close();
}
