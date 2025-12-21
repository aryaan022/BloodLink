const { verifyToken } = require('../utils/jwt');

// Middleware to verify JWT token
const verifyAuth = (req, res, next) => {
  try {
    // Get token from cookies or Authorization header
    const token = req.cookies?.token || req.headers?.authorization?.split(' ')[1];

    if (!token) {
      console.log('[AUTH] No token provided - Request:', {
        cookies: req.cookies,
        authHeader: req.headers?.authorization ? 'Present' : 'Missing',
        path: req.path,
        method: req.method
      });
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const decoded = verifyToken(token);
    console.log('[AUTH] Token verified successfully for user:', decoded.userId, 'Type:', decoded.userType);
    req.user = decoded;
    next();
  } catch (error) {
    console.log('[AUTH] Token verification failed:', error.message);
    return res.status(401).json({ success: false, message: error.message });
  }
};

// Middleware to verify user type
const verifyUserType = (allowedTypes) => {
  return (req, res, next) => {
    if (!allowedTypes.includes(req.user.userType)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Invalid user type.' 
      });
    }
    next();
  };
};

// Middleware to verify admin access
const verifyAdmin = (req, res, next) => {
  try {
    console.log('[ADMIN] Checking admin access for user:', req.user?.userId, 'Type:', req.user?.userType);
    
    if (!req.user || req.user.userType !== 'admin') {
      console.log('[ADMIN] Access denied - user is not admin');
      return res.status(403).json({ 
        success: false, 
        message: 'Access denied. Admin privileges required.' 
      });
    }
    
    console.log('[ADMIN] Admin verification passed for user:', req.user.userId);
    next();
  } catch (error) {
    console.log('[ADMIN] Admin verification error:', error.message);
    return res.status(403).json({ success: false, message: 'Admin verification failed' });
  }
};

module.exports = { verifyAuth, verifyUserType, verifyAdmin };
