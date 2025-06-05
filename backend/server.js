const express = require('express');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron');
require('dotenv').config();

const db = require('./src/database');
const facilityRoutes = require('./src/routes/facilities');
const scraper = require('./src/scraper');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/facilities', facilityRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    database: 'connected'
  });
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

// Async startup function
async function startServer() {
  try {
    // Initialize database first
    console.log('📊 Initializing database...');
    await db.init();
    
    // Schedule scraper to run daily at 00:01 AM
    cron.schedule('1 0 * * *', () => {
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
    app.listen(PORT, () => {
      console.log(`🚀 ASU Facilities API server running on port ${PORT}`);
      console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
      console.log(`📍 API docs: http://localhost:${PORT}/`);
    });

  } catch (error) {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  }
}

// Start the server
startServer(); 