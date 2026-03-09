const express = require('express');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const db = require('./src/database');
const tutoringDb = require('./src/tutoring-database');
const facilityRoutes = require('./src/routes/facilities');
const tutoringRoutes = require('./src/routes/tutoring');
const calendarRoutes = require('./src/routes/calendar');
const eventsRoutes = require('./src/routes/events');
const embeddingsRoutes = require('./src/routes/embeddings');
const scraper = require('./src/scraper');
const { runEmbeddingPipeline } = require('./src/embeddings/embeddingPipeline');

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
  skip: (req) => req.ip === '::1' || req.ip === '127.0.0.1', // Skip rate limit for localhost
});

// Middleware
app.use(cors({
  origin: [
    'https://shinpark43.github.io',
    'http://localhost:5173',
    'http://localhost:3000',
  ],
  methods: ['GET', 'OPTIONS'],
}));
app.use(express.json({ limit: '10mb' })); // Add request size limit
app.use('/api/', limiter); // Apply rate limiting to API routes only

// Routes
app.use('/api/facilities', facilityRoutes);
app.use('/api/tutoring', tutoringRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/embeddings', embeddingsRoutes);

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
      dining: '/api/facilities/dining',
      ram_tram: '/api/facilities/ram_tram',
      tutoring: '/api/tutoring'
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
    // Initialize databases first
    console.log('📊 Initializing databases...');
    await db.init();
    await tutoringDb.init();
    
    // Daily scraper for facilities (library, recreation, dining, ram_tram)
    // Runs at midnight CST every day
    cron.schedule('0 0 * * *', async () => {
      console.log('🕐 Running daily facility scraper...');
      const facilities = ['library', 'recreation', 'dining', 'ram_tram'];
      
      for (const facility of facilities) {
        try {
          console.log(`📊 Scraping ${facility}...`);
          await scraper.scrapeSpecificFacility(facility);
          console.log(`✅ ${facility} scrape completed`);
        } catch (error) {
          console.error(`❌ ${facility} scrape failed:`, error);
        }
      }
      console.log('✅ Daily facility scrape completed');
    }, {
      timezone: "America/Chicago" // CST/CDT for Texas
    });

    // Weekly scraper for tutoring (runs every Sunday at midnight CST)
    // Tutoring schedules don't change frequently, so weekly is sufficient
    cron.schedule('0 0 * * 0', async () => {
      console.log('🕐 Running weekly tutoring scraper...');
      try {
        await scraper.scrapeSpecificFacility('tutoring');
        console.log('✅ Weekly tutoring scrape completed successfully');
      } catch (error) {
        console.error('❌ Weekly tutoring scrape failed:', error);
      }
    }, {
      timezone: "America/Chicago" // CST/CDT for Texas
    });

    // Weekly embedding pipeline — runs every Monday at 06:00 UTC (Sunday midnight CST)
    cron.schedule('0 6 * * 1', async () => {
      console.log('[Embeddings] Starting weekly embedding pipeline...');
      try {
        await runEmbeddingPipeline();
      } catch (error) {
        console.error('[Embeddings] Weekly pipeline failed:', error.message);
      }
    });

    // Run scraper on startup (optional - for testing)
    // Only scrapes daily facilities, not tutoring (to save time during dev)
    if (process.env.NODE_ENV !== 'production') {
      console.log('🚀 Running initial scrape (daily facilities only)...');
      const facilities = ['library', 'recreation', 'dining', 'ram_tram'];
      (async () => {
        for (const facility of facilities) {
          try {
            console.log(`📊 Scraping ${facility}...`);
            await scraper.scrapeSpecificFacility(facility);
          } catch (error) {
            console.error(`❌ ${facility} scrape failed:`, error);
          }
        }
        console.log('✅ Initial scrape completed');
      })();
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

    // Close database connections
    await db.close();
    await tutoringDb.close();
    console.log('✅ Database connections closed');

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