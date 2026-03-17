const express = require('express');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const { testConnection, closePool } = require('./config/database');
const { testCloudinaryConnection } = require('./config/cloudinary');
const corsMiddleware = require('./middleware/cors');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const recordsRouter = require('./routes/records');
const authRouter = require('./routes/auth');
const adminRouter = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(corsMiddleware);

// Routes
app.use('/api/records', recordsRouter);
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString() 
  });
});

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Test database connection (non-blocking)
    console.log(`[${new Date().toISOString()}] Starting server...`);
    const connected = await testConnection();
    
    if (!connected) {
      console.warn('⚠️  Database connection failed, but server will start anyway.');
      console.warn('⚠️  The database will reconnect automatically on first request.');
      console.warn('⚠️  This is normal for Neon free tier (database sleeps after inactivity).\n');
    }

    // Test Cloudinary connection
    testCloudinaryConnection();

    // Start listening
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`[${new Date().toISOString()}] Server running on port ${PORT}`);
      console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`  Health check: http://localhost:${PORT}/health`);
      console.log(`  Listening on: 0.0.0.0:${PORT}`);
      if (!connected) {
        console.log(`  ⚠️  Database will connect on first request`);
      }
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      console.log(`\n[${new Date().toISOString()}] ${signal} received. Shutting down gracefully...`);
      console.log(`  If you didn't press Ctrl+C, check for conflicting processes.`);
      
      server.close(async () => {
        console.log(`[${new Date().toISOString()}] HTTP server closed`);
        await closePool();
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        console.error(`[${new Date().toISOString()}] Forced shutdown after timeout`);
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
    // Log that server is ready
    console.log(`\n✅ Server is ready! Press Ctrl+C to stop.\n`);

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Failed to start server:`, error);
    process.exit(1);
  }
};

// Start the server
startServer();

module.exports = app;
