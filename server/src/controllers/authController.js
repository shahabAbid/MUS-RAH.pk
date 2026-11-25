
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const db = require('../database/db');

const {
  generateSessionToken,
  hashToken
} = require('../utils/auth');

const COOKIE_NAME = 'MUSEHRA_session';
const SESSION_DAYS = 7;

const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(72),
  phone: z.string().trim().max(30).optional()
});

const loginSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(1).max(72)
});

function setSessionCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000
  });
}

function createSession(userId) {
  const token = generateSessionToken();

  const expiresAt = new Date(
    Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  db.prepare(`
    INSERT INTO sessions (user_id, token_hash, expires_at)
    VALUES (?, ?, ?)
  `).run(userId, hashToken(token), expiresAt);

  return token;
}

function findUser(email) {
  return db.prepare(`
    SELECT id, full_name, email, password_hash, role, is_active
    FROM users
    WHERE email = ?
  `).get(email.toLowerCase());
}

function validCredentials(user, password) {
  return Boolean(
    user &&
    user.is_active &&
    bcrypt.compareSync(password, user.password_hash)
  );
}

function publicUser(user) {
  return {
    id: user.id,
    fullName: user.full_name,
    email: user.email,
    role: user.role
  };
}

// CUSTOMER REGISTRATION
function register(req, res) {
  const validation = registerSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: 'Please check your registration details.',
      errors: validation.error.flatten().fieldErrors
    });
  }

  const { fullName, email, password, phone } = validation.data;
  const normalizedEmail = email.toLowerCase();

  const existingUser = findUser(normalizedEmail);

  if (existingUser) {
    return res.status(409).json({
      success: false,
      message: 'An account with this email already exists.'
    });
  }

  try {
    const passwordHash = bcrypt.hashSync(password, 12);

    db.prepare(`
      INSERT INTO users (full_name, email, password_hash, phone, role)
      VALUES (?, ?, ?, ?, 'customer')
    `).run(fullName, normalizedEmail, passwordHash, phone || null);

    const user = findUser(normalizedEmail);
    const token = createSession(user.id);

    setSessionCookie(res, token);

    return res.status(201).json({
      success: true,
      message: 'Your account has been created.',
      user: publicUser(user)
    });
  } catch (error) {
    console.error('Registration error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to create your account.'
    });
  }
}

// CUSTOMER / WEBSITE LOGIN
function login(req, res) {
  const validation = loginSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: 'Please enter a valid email and password.'
    });
  }

  const { email, password } = validation.data;
  const user = findUser(email);

  if (!validCredentials(user, password)) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password.'
    });
  }

  try {
    const token = createSession(user.id);
    setSessionCookie(res, token);

    return res.json({
      success: true,
      message: 'Login successful.',
      user: publicUser(user)
    });
  } catch (error) {
    console.error('Login error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to log in.'
    });
  }
}

// ADMIN / STAFF MOBILE LOGIN
function adminLogin(req, res) {
  const validation = loginSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: 'Please enter a valid email and password.'
    });
  }

  const { email, password } = validation.data;
  const user = findUser(email);

  if (!validCredentials(user, password)) {
    return res.status(401).json({
      success: false,
      message: 'Invalid email or password.'
    });
  }

  if (!['admin', 'staff'].includes(user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required.'
    });
  }

  try {
    const token = createSession(user.id);

    // Stable OneSignal identity for this admin/staff account
    const externalId = `MUSEHRA-admin-${user.id}`;

    return res.json({
      success: true,
      message: 'Admin login successful.',
      token,
      user: {
        ...publicUser(user),
        externalId
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to log in.'
    });
  }
}

// CURRENT USER
function me(req, res) {
  return res.json({
    success: true,
    user: {
      id: req.user.id,
      fullName: req.user.full_name,
      email: req.user.email,
      role: req.user.role
    }
  });
}

// LOGOUT
function logout(req, res) {
  const authHeader = req.headers.authorization || '';
  const bearerToken = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : null;

  const token = bearerToken || req.cookies?.[COOKIE_NAME];

  if (token) {
    db.prepare(`
      DELETE FROM sessions WHERE token_hash = ?
    `).run(hashToken(token));
  }

  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  });

  return res.json({
    success: true,
    message: 'Logged out successfully.'
  });
}

module.exports = {
  register,
  login,
  adminLogin,
  me,
  logout
};
