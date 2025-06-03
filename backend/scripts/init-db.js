#!/usr/bin/env node

/**
 * Database initialization script
 * Run this to initialize the SQLite database with default facilities and structure
 */

const path = require('path');
const fs = require('fs');

// Make sure we can find the database module
const dbModule = path.join(__dirname, '..', 'src', 'database.js');
if (!fs.existsSync(dbModule)) {
  console.error('❌ Database module not found at:', dbModule);
  process.exit(1);
}

const db = require('../src/database');

async function initializeDatabase() {
  console.log('🚀 Initializing ASU Facilities Database...');
  
  try {
    // Initialize database
    db.init();
    
    console.log('✅ Database initialized successfully!');
    console.log('📊 Database includes:');
    console.log('  - Facilities table with default ASU facilities');
    console.log('  - Facility hours table for storing operating hours');
    console.log('  - Scrape log table for tracking scraping activities');
    
    // Get and display current facilities
    const facilities = db.getAllFacilities();
    console.log(`📍 Default facilities loaded: ${facilities.length}`);
    facilities.forEach(facility => {
      console.log(`  - ${facility.name} (${facility.type})`);
    });
    
    console.log('\n🎯 Next steps:');
    console.log('  1. Start the server: npm start');
    console.log('  2. Test API endpoints: http://localhost:3001');
    console.log('  3. Run scraper: npm run scrape');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
}

// Run the initialization
if (require.main === module) {
  initializeDatabase();
}

module.exports = { initializeDatabase }; 