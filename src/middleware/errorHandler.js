// Handle PostgreSQL-specific errors
const handleDatabaseError = (error) => {
  // Unique constraint violation (duplicate CNIC)
  if (error.code === '23505') {
    // Extract CNIC value from error detail if available
    const cnicMatch = error.detail?.match(/\(cnic\)=\(([^)]+)\)/);
    const cnicValue = cnicMatch ? cnicMatch[1] : 'unknown';
    
    return {
      status: 409,
      message: `A record with CNIC ${cnicValue} already exists`,
      details: { 
        field: 'cnic', 
        constraint: 'unique',
        value: cnicValue
      }
    };
  }
  
  // Connection errors
  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    return {
      status: 500,
      message: 'Database connection failed',
      details: { code: error.code }
    };
  }
  
  // Default database error
  return {
    status: 500,
    message: 'Database operation failed',
    details: {}
  };
};

// Global error handler middleware
const errorHandler = (err, req, res, next) => {
  // Log error details
  console.error(`[${new Date().toISOString()}] Error:`, {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body
  });
  
  // Handle database errors
  if (err.code) {
    const dbError = handleDatabaseError(err);
    return res.status(dbError.status).json({
      status: 'error',
      message: dbError.message,
      details: dbError.details
    });
  }
  
  // Handle custom errors with status property
  if (err.status) {
    return res.status(err.status).json({
      status: 'error',
      message: err.message || 'An error occurred',
      details: err.details || {}
    });
  }
  
  // Default server error
  res.status(500).json({
    status: 'error',
    message: err.message || 'Internal server error',
    details: {}
  });
};

// Not found handler
const notFoundHandler = (req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route not found',
    details: {
      path: req.path,
      method: req.method
    }
  });
};

module.exports = {
  errorHandler,
  notFoundHandler,
  handleDatabaseError
};
