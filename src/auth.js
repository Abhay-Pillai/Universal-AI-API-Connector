const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const COOKIE_NAME = 'apihub_token';

function signToken(payload) {
  return jwt.sign(payload, SECRET, { expiresIn: '7d' });
}

function setAuthCookie(res, payload) {
  const token = signToken(payload);
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}

function clearAuthCookie(res) {
  res.clearCookie(COOKIE_NAME);
}

// Middleware: protects /api/admin/* routes. Requires a valid signed cookie.
function requireAdmin(req, res, next) {
  const token = req.cookies && req.cookies[COOKIE_NAME];
  if (!token) return res.status(401).json({ success: false, error: 'Not authenticated' });
  try {
    const decoded = jwt.verify(token, SECRET);
    req.admin = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ success: false, error: 'Session expired or invalid' });
  }
}

module.exports = { setAuthCookie, clearAuthCookie, requireAdmin, COOKIE_NAME };
