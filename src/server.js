const express = require('express');
require('dotenv').config();

const { testConnection, closePool } = require('./config/database');
const corsMiddleware = require('./middleware/cors');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const recordsRouter = require('./routes/records');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(corsMiddleware);

// Routes
app.use('/api/records', recordsRouter);

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
    // Test database connection
    const connected = await testConnection();
    
    if (!connected) {
      console.error('Failed to connect to database. Exiting...');
      process.exit(1);
    }

    // Start listening
    const server = app.listen(PORT, () => {
      console.log(`[${new Date().toISOString()}] Server running on port ${PORT}`);
      console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`  Health check: http://localhost:${PORT}/health`);
    });

    // Graceful shutdown
    const shutdown = async (signal) => {
      console.log(`\n[${new Date().toISOString()}] ${signal} received. Shutting down gracefully...`);
      
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

  } catch (error) {
    console.error(`[${new Date().toISOString()}] Failed to start server:`, error);
    process.exit(1);
  }
};

// Start the server
startServer();

module.exports = app;
