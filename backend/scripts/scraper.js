#!/usr/bin/env node

/**
 * Standalone scraper script
 * Can be run independently or by GitHub Actions to scrape and update facility hours
 */

const path = require('path');
const fs = require('fs');

// Make sure we can find the required modules
const scraperModule = path.join(__dirname, '..', 'src', 'scraper.js');
const dbModule = path.join(__dirname, '..', 'src', 'database.js');

if (!fs.existsSync(scraperModule)) {
  console.error('❌ Scraper module not found at:', scraperModule);
  process.exit(1);
}

if (!fs.existsSync(dbModule)) {
  console.error('❌ Database module not found at:', dbModule);
  process.exit(1);
}

const scraper = require('../src/scraper');
const db = require('../src/database');
const tutoringDb = require('../src/tutoring-database');

async function runScraper() {
  console.log('🚀 Starting ASU Facilities Hours Scraper...');
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);
  
  try {
    // Always initialize databases first
    console.log('📊 Initializing databases...');
    await db.init();
    await tutoringDb.init();
    
    // Get command line arguments
    const args = process.argv.slice(2);
    const facilityType = args[0]; // Optional: specific facility type
    
    let results;
    
    if (facilityType) {
      console.log(`🎯 Scraping specific facility: ${facilityType}`);
      results = await scraper.scrapeSpecificFacility(facilityType);
      console.log(`✅ ${facilityType} scraping completed:`, results);
    } else {
      console.log('🎯 Scraping all facilities...');
      results = await scraper.scrapeAllFacilities();
      console.log('✅ All facilities scraping completed:', results);
    }
    
    // Display summary
    console.log('\n📊 Scraping Summary:');
    console.log(`  Started: ${results.started_at || 'N/A'}`);
    console.log(`  Completed: ${results.completed_at || 'N/A'}`);
    console.log(`  Total Records: ${results.total_records || results.count || 0}`);
    
    if (results.library) {
      console.log(`  Library: ${results.library.count} records`);
    }
    if (results.recreation) {
      console.log(`  Recreation: ${results.recreation.count} records`);
    }
    if (results.dining) {
      console.log(`  Dining: ${results.dining.count} records`);
    }
    
    console.log('\n🎉 Scraping completed successfully!');
    
    // Close database connections
    await db.close();
    await tutoringDb.close();
    
  } catch (error) {
    console.error('❌ Scraping failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Display usage information
function showUsage() {
  console.log(`
🔧 ASU Facilities Hours Scraper

Usage:
  npm run scrape                 # Scrape all facilities
  npm run scrape library         # Scrape library only
  npm run scrape recreation      # Scrape recreation center only
  npm run scrape dining          # Scrape dining facilities only

Examples:
  node scripts/scraper.js
  node scripts/scraper.js library
  node scripts/scraper.js recreation
  node scripts/scraper.js dining
`);
}

// Handle command line arguments
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  showUsage();
  process.exit(0);
}

// Run the scraper
if (require.main === module) {
  runScraper().catch(error => {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  });
}

module.exports = { runScraper }; 