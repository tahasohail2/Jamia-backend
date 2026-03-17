const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  try {
    // Extract token from HTTP-only cookie
    const token = req.cookies.adminToken;

    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Attach user to request
    req.user = {
      id: decoded.id,
      username: decoded.username
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    return res.status(401).json({ message: 'Invalid token' });
  }
};

module.exports = authMiddleware;
