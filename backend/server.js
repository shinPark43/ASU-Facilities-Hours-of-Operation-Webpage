const express = require('express');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const db = require('./src/database');
const facilityRoutes = require('./src/routes/facilities');
const scraper = require('./src/scraper');

const app = express();
const PORT = process.env.PORT || 3001;

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests',
    message: 'You have made too many requests. Please try again later.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Add request size limit
app.use('/api/', limiter); // Apply rate limiting to API routes only

// Routes
app.use('/api/facilities', facilityRoutes);

// Enhanced health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    await db.getAllFacilities();
    
    const memoryUsage = process.memoryUsage();
    
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      database: 'connected',
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime(),
      memory: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024 * 100) / 100 + ' MB',
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100 + ' MB',
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024 * 100) / 100 + ' MB'
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error.message
    });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'ASU Facilities Hours API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      facilities: '/api/facilities',
      library: '/api/facilities/library',
      recreation: '/api/facilities/recreation',
      dining: '/api/facilities/dining'
    }
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    message: error.message 
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not found',
    message: 'The requested endpoint does not exist'
  });
});

// Global server instance for graceful shutdown
let server;

// Async startup function
async function startServer() {
  try {
    // Initialize database first
    console.log('📊 Initializing database...');
    await db.init();
    
    // Schedule scraper to run daily at 10:00 AM Texas time
    cron.schedule('0 10 * * *', () => {
      console.log('🕐 Running scheduled scraper...');
      scraper.scrapeAllFacilities()
        .then(() => {
          console.log('✅ Scheduled scrape completed successfully');
        })
        .catch((error) => {
          console.error('❌ Scheduled scrape failed:', error);
        });
    }, {
      timezone: "America/Chicago" // CST/CDT for Texas
    });

    // Run scraper on startup (optional - for testing)
    if (process.env.NODE_ENV !== 'production') {
      console.log('🚀 Running initial scrape...');
      scraper.scrapeAllFacilities()
        .catch((error) => {
          console.error('❌ Initial scrape failed:', error);
        });
    }

    // Start the server
    server = app.listen(PORT, () => {
      console.log(`🚀 ASU Facilities API server running on port ${PORT}`);
      console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
      console.log(`📍 API docs: http://localhost:${PORT}/`);
    });

    // Handle server startup errors
    server.on('error', (error) => {
      console.error('❌ Server error:', error);
      process.exit(1);
    });

  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
}

// Graceful shutdown handling
async function gracefulShutdown(signal) {
  console.log(`\n🔄 Received ${signal}. Graceful shutdown initiated...`);
  
  try {
    // Close HTTP server
    if (server) {
      await new Promise((resolve) => {
        server.close(resolve);
      });
      console.log('✅ HTTP server closed');
    }

    // Close browser instances
    await scraper.closeBrowser();
    console.log('✅ Browser instances closed');

    // Close database connection
    await db.close();
    console.log('✅ Database connection closed');

    console.log('🎉 Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

// Register shutdown handlers
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

// Start the server
startServer(); 