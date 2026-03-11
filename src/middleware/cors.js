const cors = require('cors');

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    // In development mode, allow all requests
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === undefined) {
      return callback(null, true);
    }
    
    // Allow requests with no origin (like mobile apps, Postman, or curl)
    if (!origin) {
      return callback(null, true);
    }
    
    // Allowed origins for production
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:5173',
      'http://localhost:5174'
    ];
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 204
};

module.exports = cors(corsOptions);
