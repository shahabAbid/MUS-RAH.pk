const db = require('../database/db');
const { hashToken } = require('../utils/auth');

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const bearerToken = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : null;

  const token = bearerToken || req.cookies?.MUSEHRA_session;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Please log in first.'
    });
  }

  const session = db.prepare(`
    SELECT
      sessions.id AS session_id,
      users.id,
      users.full_name,
      users.email,
      users.role,
      users.is_active
    FROM sessions
    JOIN users ON users.id = sessions.user_id
    WHERE sessions.token_hash = ?
      AND sessions.expires_at > ?
  `).get(hashToken(token), new Date().toISOString());

  if (!session || !session.is_active) {
    if (!bearerToken) {
      res.clearCookie('MUSEHRA_session');
    }

    return res.status(401).json({
      success: false,
      message: 'Your session is invalid or expired.'
    });
  }

  req.user = session;
  req.sessionToken = token;
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user || !['admin', 'staff'].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required.'
    });
  }

  next();
}

module.exports = {
  requireAuth,
  requireAdmin
};