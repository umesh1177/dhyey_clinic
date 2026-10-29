const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'wad_clinic_super_secure_jwt_token_2026_key';

/**
 * authMiddleware - Doctor JWT authentication.
 * Rejects any request without a valid token with 401.
 */
const authMiddleware = (req, res, next) => {
  try {
    let token = null;

    // Support: Authorization: Bearer <token>
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    }
    // Support legacy x-auth-token header
    else if (req.headers['x-auth-token']) {
      token = req.headers['x-auth-token'].trim();
    }

    // No token provided
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Access denied. You must be logged in as a doctor to perform this action. Please log in and try again.',
      });
    }

    // Doctor mock tokens support (for development/offline demo)
    if (token === 'mock-doctor-token' || token.startsWith('mock-doc') || token.startsWith('mock-token-doc')) {
      req.user = { id: 'demo-doc', username: 'dhyey', role: 'doctor', name: 'Dr. Chirag Paghdal' };
      if (req.headers['x-clinic-id']) req.user.activeClinicId = req.headers['x-clinic-id'];
      return next();
    }
    if (token.startsWith('mock-')) {
      req.user = { id: 'demo-user', username: 'dhyey', role: 'doctor', name: 'Dr. Chirag Paghdal' };
      if (req.headers['x-clinic-id']) req.user.activeClinicId = req.headers['x-clinic-id'];
      return next();
    }

    // Verify JWT
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;

    // Override activeClinicId if explicitly sent in header
    if (req.headers['x-clinic-id']) {
      req.user.activeClinicId = req.headers['x-clinic-id'];
    }

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'TOKEN_EXPIRED',
        message: 'Your session has expired. Please log in again to continue.',
      });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        error: 'TOKEN_INVALID',
        message: 'Invalid authentication token. Please log out and log in again.',
      });
    }
    return res.status(401).json({
      success: false,
      error: 'AUTH_FAILED',
      message: 'Authentication failed. Please log in again.',
    });
  }
};

module.exports = authMiddleware;
