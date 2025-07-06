const ScraperManager = require('./ScraperManager');

// Global scraper manager instance for browser reuse
let scraperManager = null;

// Helper function to get or create scraper manager
function getScraperManager() {
  if (!scraperManager) {
    scraperManager = new ScraperManager();
  }
  return scraperManager;
}

// Library scraper - using optimized ScraperManager
async function scrapeLibraryHours() {
  const manager = getScraperManager();
  return await manager.scrapeLibrary(await manager.getBrowser());
}

// Recreation center scraper - using optimized ScraperManager
async function scrapeRecreationHours() {
  const manager = getScraperManager();
  return await manager.scrapeRecreation(await manager.getBrowser());
}

// Dining scraper - using optimized ScraperManager
async function scrapeDiningHours() {
  const manager = getScraperManager();
  return await manager.scrapeDining(await manager.getBrowser());
}

// Main scraper function using optimized ScraperManager with parallel execution
async function scrapeAllFacilities() {
  const manager = getScraperManager();
  try {
    return await manager.scrapeAllFacilities();
  } finally {
    // Keep browser open for potential reuse
  }
}

// Scrape a specific facility type using optimized ScraperManager
async function scrapeSpecificFacility(facilityType) {
  const manager = getScraperManager();
  return await manager.scrapeSpecificFacility(facilityType);
}

// Utility function to clean up resources
async function closeBrowser() {
  if (scraperManager) {
    await scraperManager.close();
    scraperManager = null;
  }
}

module.exports = {
  scrapeAllFacilities,
  scrapeSpecificFacility,
  scrapeLibraryHours,
  scrapeRecreationHours,
  scrapeDiningHours,
  closeBrowser,
  getScraperManager
};