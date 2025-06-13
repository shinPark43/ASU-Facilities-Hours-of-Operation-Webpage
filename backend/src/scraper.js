const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const axios = require('axios');
const db = require('./database');

// Puppeteer configuration for Railway deployment
const PUPPETEER_CONFIG = {
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--no-zygote',
    '--single-process',
    '--disable-gpu'
  ],
  headless: 'new',
  timeout: 30000
};

// Configuration for scraping
const SCRAPER_CONFIG = {
  timeout: 30000,
  headless: true,
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
};

// Helper function to wait for a specified time
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Library scraper - adapted from main.js
async function scrapeLibraryHours() {
  console.log('🔍 Scraping library hours...');
  
  let browser;
  try {
    db.logScrapeActivity('library', 'started', 'Beginning library hours scrape');

    browser = await puppeteer.launch({ 
      headless: SCRAPER_CONFIG.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });
    
    const page = await browser.newPage();
    await page.setUserAgent(SCRAPER_CONFIG.userAgent);
    
    // Navigate to the library hours page
    await page.goto('https://www.angelo.edu/library/hours.php', { 
      waitUntil: 'networkidle2',
      timeout: SCRAPER_CONFIG.timeout
    });
    
    // Wait for the hours content to load - try multiple selectors
    try {
      await page.waitForSelector('.hours-of-operation-section', { timeout: 5000 });
    } catch (e) {
      try {
        await page.waitForSelector('.hours-container', { timeout: 5000 });
      } catch (e) {
        try {
          await page.waitForSelector('.location-hours', { timeout: 5000 });
        } catch (e) {
          try {
            await page.waitForSelector('table', { timeout: 5000 });
          } catch (e) {
            // Proceed anyway if specific selectors not found
          }
        }
      }
    }
    
    // Wait a bit more for JavaScript to populate the content
    await delay(8000);
    
    // Extract the hours content with proper table parsing for library sections
    const hoursData = await page.evaluate(() => {
      const hoursDiv = document.querySelector('#hours');
      if (!hoursDiv) return null;
      
      // Look for tables within the hours div
      const tables = hoursDiv.querySelectorAll('table');
      if (tables.length > 0) {
        let libraryData = {};
        
        tables.forEach((table, tableIndex) => {
          const rows = table.querySelectorAll('tr');
          let headerDays = [];
          
          // First, extract the header row to get day names
          if (rows.length > 0) {
            const headerRow = rows[0];
            const headerCells = headerRow.querySelectorAll('td, th');
            
            for (let i = 1; i < headerCells.length; i++) {
              const headerText = headerCells[i].innerText.trim();
              let dayName = '';
              
              // Parse day names from headers
              if (headerText.toLowerCase().includes('sun')) dayName = 'Sunday';
              else if (headerText.toLowerCase().includes('mon')) dayName = 'Monday';
              else if (headerText.toLowerCase().includes('tue')) dayName = 'Tuesday';
              else if (headerText.toLowerCase().includes('wed')) dayName = 'Wednesday';
              else if (headerText.toLowerCase().includes('thu')) dayName = 'Thursday';
              else if (headerText.toLowerCase().includes('fri')) dayName = 'Friday';
              else if (headerText.toLowerCase().includes('sat')) dayName = 'Saturday';
              
              headerDays.push(dayName || `Day ${i}`);
            }
          }
          
          // Process each library section row
          for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
            const row = rows[rowIndex];
            const cells = row.querySelectorAll('td, th');
            
            if (cells.length > 1) {
              const sectionName = cells[0].innerText.trim();
              
              // Skip empty or header-like rows
              if (!sectionName || sectionName.toLowerCase().includes('hours of operation')) {
                continue;
              }
              
              // Clean up section name
              let cleanSectionName = sectionName;
              if (sectionName.toLowerCase().includes('library') && !sectionName.toLowerCase().includes('collection')) {
                cleanSectionName = 'Main Library';
              } else if (sectionName.toLowerCase().includes('it desk')) {
                cleanSectionName = 'IT Desk';
              } else if (sectionName.toLowerCase().includes('west texas collection')) {
                cleanSectionName = 'West Texas Collection';
              } else if (sectionName.toLowerCase().includes('reference')) {
                cleanSectionName = 'Reference Desk';
              } else if (sectionName.toLowerCase().includes('circulation')) {
                cleanSectionName = 'Circulation Desk';
              } else if (sectionName.toLowerCase().includes('special collections')) {
                cleanSectionName = 'Special Collections';
              }
              
              if (!libraryData[cleanSectionName]) {
                libraryData[cleanSectionName] = {};
              }
              
              // Extract hours for each day
              for (let cellIndex = 1; cellIndex < cells.length && cellIndex - 1 < headerDays.length; cellIndex++) {
                const hoursText = cells[cellIndex].innerText.trim();
                const dayName = headerDays[cellIndex - 1];
                
                if (dayName && hoursText) {
                  // More permissive parsing logic
                  let cleanHours = hoursText;
                  
                  // Check for closed status first
                  if (hoursText.toLowerCase().includes('closed') || 
                      hoursText.toLowerCase().includes('not open') ||
                      hoursText.trim() === '' ||
                      hoursText.trim() === '-' ||
                      hoursText.trim() === 'N/A') {
                    cleanHours = 'Closed';
                  }
                  // Check for time formats (more permissive)
                  else if (hoursText.includes('a.m.') || hoursText.includes('p.m.') || 
                           hoursText.includes('AM') || hoursText.includes('PM') ||
                           hoursText.includes('am') || hoursText.includes('pm')) {
                    cleanHours = hoursText; // Keep time format as is
                  }
                  // Check for any numbers (time patterns)
                  else if (hoursText.match(/\d+/)) {
                    cleanHours = hoursText; // Keep if it contains numbers
                  }
                  // If it has substantial text, keep it
                  else if (hoursText.length > 2) {
                    cleanHours = hoursText;
                  }
                  else {
                    cleanHours = 'Hours not available';
                  }
                  
                  libraryData[cleanSectionName][dayName] = cleanHours;
                }
              }
            }
          }
        });
        
        return libraryData;
      }
      
      return null;
    });

    if (!hoursData || Object.keys(hoursData).length === 0) {
      throw new Error('No library hours data found on the page');
    }

    // Convert the structured data to database format
    const libraryHours = [];
    for (const [sectionName, days] of Object.entries(hoursData)) {
      for (const [dayName, hoursText] of Object.entries(days)) {
        const isClosed = hoursText === 'Closed' || hoursText.toLowerCase().includes('closed');
        
        // Store the complete time string instead of trying to parse it
        // This matches the Electron app approach
        libraryHours.push({
          section_name: sectionName,
          day_of_week: dayName,
          open_time: isClosed ? null : hoursText,  // Store full text in open_time
          close_time: null,  // Leave close_time empty
          is_closed: isClosed
        });
      }
    }

    // Save to database
    await db.updateFacilityHours('library', libraryHours);
    db.logScrapeActivity('library', 'success', `Updated ${libraryHours.length} library hour records`);
    
    console.log('✅ Library hours scraped successfully');
    return { success: true, count: libraryHours.length };

  } catch (error) {
    console.error('❌ Library scraping failed:', error);
    db.logScrapeActivity('library', 'error', error.message);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Recreation center scraper - adapted from main.js
async function scrapeRecreationHours() {
  console.log('🔍 Scraping recreation center hours...');
  
  let browser;
  try {
    db.logScrapeActivity('recreation', 'started', 'Beginning recreation hours scrape');

    browser = await puppeteer.launch({ 
      headless: SCRAPER_CONFIG.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });
    
    const page = await browser.newPage();
    await page.setUserAgent(SCRAPER_CONFIG.userAgent);
    
    // Navigate to the gym hours page
    await page.goto('https://www.angelo.edu/life-on-campus/play/university-recreation/urec-hours-of-operation.php', { 
      waitUntil: 'networkidle2',
      timeout: SCRAPER_CONFIG.timeout
    });
    
    // Wait for the hours div to be present
    await page.waitForSelector('#hours', { timeout: 10000 });
    
    // Wait longer for the JavaScript to load the hours content
    await delay(8000);
    
    // Extract the hours table data with proper table parsing
    const hoursData = await page.evaluate(() => {
      const hoursDiv = document.querySelector('#hours');
      if (!hoursDiv) return null;
      
      // Look for tables within the hours div
      const tables = hoursDiv.querySelectorAll('table');
      if (tables.length > 0) {
        let gymData = {};
        
        tables.forEach(table => {
          const rows = table.querySelectorAll('tr');
          let headerDays = [];
          
          // Extract header row to get day names
          if (rows.length > 0) {
            const headerRow = rows[0];
            const headerCells = headerRow.querySelectorAll('td, th');
            
            for (let i = 1; i < headerCells.length; i++) {
              const headerText = headerCells[i].innerText.trim();
              let dayName = '';
              
              if (headerText.toLowerCase().includes('sun')) dayName = 'Sunday';
              else if (headerText.toLowerCase().includes('mon')) dayName = 'Monday';
              else if (headerText.toLowerCase().includes('tue')) dayName = 'Tuesday';
              else if (headerText.toLowerCase().includes('wed')) dayName = 'Wednesday';
              else if (headerText.toLowerCase().includes('thu')) dayName = 'Thursday';
              else if (headerText.toLowerCase().includes('fri')) dayName = 'Friday';
              else if (headerText.toLowerCase().includes('sat')) dayName = 'Saturday';
              
              headerDays.push(dayName || `Day ${i}`);
            }
          }
          
          // Process each facility row
          for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
            const row = rows[rowIndex];
            const cells = row.querySelectorAll('td, th');
            
            if (cells.length > 1) {
              const facilityName = cells[0].innerText.trim();
              
              // Skip empty or header-like rows
              if (!facilityName || facilityName.toLowerCase().includes('hours of operation')) {
                continue;
              }
              
              // Clean up facility name
              let cleanFacilityName = facilityName;
              if (facilityName.toLowerCase().includes('chp') || facilityName.toLowerCase().includes('fitness')) {
                cleanFacilityName = 'CHP (Fitness Center)';
              } else if (facilityName.toLowerCase().includes('swimming') || facilityName.toLowerCase().includes('pool')) {
                cleanFacilityName = 'Swimming Pool';
              } else if (facilityName.toLowerCase().includes('climbing') || facilityName.toLowerCase().includes('rock') || facilityName.toLowerCase().includes('wall')) {
                cleanFacilityName = 'Rock Wall';
              } else if (facilityName.toLowerCase().includes('lake')) {
                cleanFacilityName = 'Lake House';
              } else if (facilityName.toLowerCase().includes('intramural')) {
                cleanFacilityName = 'Intramural Complex';
              }
              
              if (!gymData[cleanFacilityName]) {
                gymData[cleanFacilityName] = {};
              }
              
              // Process each day column
              for (let cellIndex = 1; cellIndex < cells.length && cellIndex - 1 < headerDays.length; cellIndex++) {
                const dayName = headerDays[cellIndex - 1];
                const hoursText = cells[cellIndex].innerText.trim();
                
                if (dayName && hoursText) {
                  let cleanHours = hoursText
                    .replace(/\n/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();
                  
                  if (cleanHours.toLowerCase().includes('closed') || 
                      cleanHours.toLowerCase().includes('not available') || 
                      cleanHours === '' || 
                      cleanHours === '-') {
                    cleanHours = 'Closed';
                  }
                  
                  gymData[cleanFacilityName][dayName] = cleanHours;
                }
              }
            }
          }
        });
        
        return gymData;
      }
      return null;
    });

    if (!hoursData || Object.keys(hoursData).length === 0) {
      throw new Error('No recreation hours data found on the page');
    }

    // Convert to database format
    const recHours = [];
    for (const [facilityName, days] of Object.entries(hoursData)) {
      for (const [dayName, hoursText] of Object.entries(days)) {
        const isClosed = hoursText === 'Closed' || hoursText.toLowerCase().includes('closed');
        
        // Store the complete time string instead of trying to parse it
        recHours.push({
          section_name: facilityName,
          day_of_week: dayName,
          open_time: isClosed ? null : hoursText,  // Store full text in open_time
          close_time: null,  // Leave close_time empty
          is_closed: isClosed
        });
      }
    }

    await db.updateFacilityHours('recreation', recHours);
    db.logScrapeActivity('recreation', 'success', `Updated ${recHours.length} recreation hour records`);
    
    console.log('✅ Recreation hours scraped successfully');
    return { success: true, count: recHours.length };

  } catch (error) {
    console.error('❌ Recreation scraping failed:', error);
    db.logScrapeActivity('recreation', 'error', error.message);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Dining scraper - adapted from main.js
async function scrapeDiningHours() {
  console.log('🔍 Scraping dining hours...');
  
  let browser;
  try {
    db.logScrapeActivity('dining', 'started', 'Beginning dining hours scrape');

    browser = await puppeteer.launch({ 
      headless: SCRAPER_CONFIG.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });
    
    const page = await browser.newPage();
    
    // Set a common user agent
    await page.setUserAgent(SCRAPER_CONFIG.userAgent);
    
    // Navigate to the dining hours page
    await page.goto('https://dineoncampus.com/Angelo/hours-of-operation', { 
      waitUntil: 'networkidle0',
      timeout: 45000
    });
    
    // Wait for a specific key element of the table to ensure it's loaded
    try {
      await page.waitForSelector('td[data-label="Location"]', { timeout: 30000 });
    } catch (e) {
      console.error('Dining Hours: Could not find "td[data-label=\'Location\']" selector. Page structure might have changed or content is not loading.');
      throw new Error('Dining hours table content not found');
    }
    
    // Optional: A small delay just in case
    await delay(3000);
    
    // Extract the dining hours content
    const hoursData = await page.evaluate(() => {
      const firstLocationCell = document.querySelector('td[data-label="Location"]');
      if (!firstLocationCell) {
        return null;
      }

      const tableElement = firstLocationCell.closest('table');
      if (!tableElement) {
        return null;
      }
      
      let diningData = {};
      const rows = tableElement.querySelectorAll('tr');
      
      for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        const row = rows[rowIndex];
        const locationCell = row.querySelector('td[data-label="Location"]');
        
        if (locationCell) {
          const locationName = locationCell.innerText.trim();
          
          if (!locationName || locationName === '') continue;
          
          // Clean up location name
          let cleanLocationName = locationName;
          if (locationName.toLowerCase().includes('tea co')) {
            cleanLocationName = 'TEA Co';
          } else if (locationName.toLowerCase().includes('caf')) {
            cleanLocationName = 'The CAF';
          } else if (locationName.toLowerCase().includes('chick-fil-a')) {
            cleanLocationName = 'Chick-fil-A';
          } else if (locationName.toLowerCase().includes('starbucks')) {
            cleanLocationName = 'Starbucks';
          }
          
          if (!diningData[cleanLocationName]) {
            diningData[cleanLocationName] = {};
          }
          
          // Process day columns
          const dayCells = row.querySelectorAll('td[data-label]');
          dayCells.forEach(cell => {
            const dataLabel = cell.getAttribute('data-label');
            let dayName = '';
            
            // Map data labels to day names
            if (dataLabel && dataLabel.toLowerCase().includes('sun')) dayName = 'Sunday';
            else if (dataLabel && dataLabel.toLowerCase().includes('mon')) dayName = 'Monday';
            else if (dataLabel && dataLabel.toLowerCase().includes('tue')) dayName = 'Tuesday';
            else if (dataLabel && dataLabel.toLowerCase().includes('wed')) dayName = 'Wednesday';
            else if (dataLabel && dataLabel.toLowerCase().includes('thu')) dayName = 'Thursday';
            else if (dataLabel && dataLabel.toLowerCase().includes('fri')) dayName = 'Friday';
            else if (dataLabel && dataLabel.toLowerCase().includes('sat')) dayName = 'Saturday';
            
            if (dayName) {
              let hoursText = cell.innerText.trim();
              
              // Clean up hours text
              if (hoursText && hoursText !== 'Closed' && hoursText !== 'See website') {
                hoursText = hoursText
                  .replace(/(\d{1,2}:\d{2})a/g, '$1 AM')
                  .replace(/(\d{1,2}:\d{2})p/g, '$1 PM')
                  .replace(/\s*-\s*/g, ' - ');
              }
              
              diningData[cleanLocationName][dayName] = hoursText || 'Not available';
            }
          });
        }
      }
      
      return diningData;
    });

    if (!hoursData || Object.keys(hoursData).length === 0) {
      throw new Error('No dining hours data found on the page');
    }

    // Convert to database format
    const diningHours = [];
    for (const [locationName, days] of Object.entries(hoursData)) {
      for (const [dayName, hoursText] of Object.entries(days)) {
        const isClosed = hoursText === 'Closed' || hoursText.toLowerCase().includes('closed') || hoursText === 'Not available';
        let openTime = null;
        let closeTime = null;

        if (!isClosed) {
          // Dining uses AM/PM format that regex can handle well - parse separate times
          const timeMatch = hoursText.match(/(\d{1,2}:\d{2}\s*(?:[AP]M|a\.m\.|p\.m\.))\s*-\s*(\d{1,2}:\d{2}\s*(?:[AP]M|a\.m\.|p\.m\.))/i);
          if (timeMatch) {
            openTime = timeMatch[1].trim();
            closeTime = timeMatch[2].trim();
          }
        }

        diningHours.push({
          section_name: locationName,
          day_of_week: dayName,
          open_time: openTime,
          close_time: closeTime,
          is_closed: isClosed
        });
      }
    }

    await db.updateFacilityHours('dining', diningHours);
    db.logScrapeActivity('dining', 'success', `Updated ${diningHours.length} dining hour records`);
    
    console.log('✅ Dining hours scraped successfully');
    return { success: true, count: diningHours.length };

  } catch (error) {
    console.error('❌ Dining scraping failed:', error);
    db.logScrapeActivity('dining', 'error', error.message);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Utility function to create a browser instance
async function createBrowser() {
  return await puppeteer.launch({
    headless: SCRAPER_CONFIG.headless,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ]
  });
}

// Main scraper function that runs all scrapers
async function scrapeAllFacilities() {
  console.log('🚀 Starting facility hours scraping...');
  
  const results = {
    library: null,
    recreation: null,
    dining: null,
    total_records: 0,
    started_at: new Date().toISOString()
  };

  try {
    // Run all scrapers
    results.library = await scrapeLibraryHours();
    results.recreation = await scrapeRecreationHours();
    results.dining = await scrapeDiningHours();

    // Calculate totals
    results.total_records = 
      (results.library?.count || 0) + 
      (results.recreation?.count || 0) + 
      (results.dining?.count || 0);

    results.completed_at = new Date().toISOString();
    
    console.log(`✅ All facility hours scraped successfully! Total records: ${results.total_records}`);
    return results;

  } catch (error) {
    console.error('❌ Facility scraping failed:', error);
    results.error = error.message;
    results.failed_at = new Date().toISOString();
    throw error;
  }
}

// Scrape a specific facility type
async function scrapeSpecificFacility(facilityType) {
  const validTypes = ['library', 'recreation', 'dining'];
  if (!validTypes.includes(facilityType)) {
    throw new Error(`Invalid facility type: ${facilityType}. Valid types are: ${validTypes.join(', ')}`);
  }

  console.log(`🎯 Scraping specific facility: ${facilityType}`);
  
  switch (facilityType) {
    case 'library':
      return await scrapeLibraryHours();
    case 'recreation':
      return await scrapeRecreationHours();
    case 'dining':
      return await scrapeDiningHours();
    default:
      throw new Error(`Unsupported facility type: ${facilityType}`);
  }
}

module.exports = {
  scrapeAllFacilities,
  scrapeSpecificFacility,
  scrapeLibraryHours,
  scrapeRecreationHours,
  scrapeDiningHours,
  createBrowser
};