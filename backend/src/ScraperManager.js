const puppeteer = require('puppeteer');
const db = require('./database');

// Helper function to wait for a specified time
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

class ScraperManager {
  constructor() {
    this.browser = null;
    this.config = {
      headless: 'new',
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
      timeout: 30000
    };
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  }

  async getBrowser() {
    if (!this.browser) {
      console.log('🔧 Creating new browser instance...');
      this.browser = await puppeteer.launch(this.config);
    }
    return this.browser;
  }

  async scrapeAllFacilities() {
    console.log('🚀 Starting parallel facility hours scraping...');
    
    const results = {
      library: null,
      recreation: null,
      dining: null,
      total_records: 0,
      started_at: new Date().toISOString()
    };

    try {
      const browser = await this.getBrowser();
      
      // Run all scrapers in parallel for better performance
      const scraperPromises = [
        this.scrapeLibrary(browser).catch(error => ({ error: error.message, success: false })),
        this.scrapeRecreation(browser).catch(error => ({ error: error.message, success: false })),
        this.scrapeDining(browser).catch(error => ({ error: error.message, success: false }))
      ];

      const [libraryResult, recreationResult, diningResult] = await Promise.allSettled(scraperPromises);

      // Process results
      results.library = libraryResult.status === 'fulfilled' ? libraryResult.value : { error: libraryResult.reason.message, success: false };
      results.recreation = recreationResult.status === 'fulfilled' ? recreationResult.value : { error: recreationResult.reason.message, success: false };
      results.dining = diningResult.status === 'fulfilled' ? diningResult.value : { error: diningResult.reason.message, success: false };

      // Calculate totals
      results.total_records = 
        (results.library?.count || 0) + 
        (results.recreation?.count || 0) + 
        (results.dining?.count || 0);

      results.completed_at = new Date().toISOString();
      
      console.log(`✅ Parallel scraping completed! Total records: ${results.total_records}`);
      return results;

    } catch (error) {
      console.error('❌ Scraping failed:', error);
      results.error = error.message;
      results.failed_at = new Date().toISOString();
      throw error;
    }
  }

  async scrapeSpecificFacility(facilityType) {
    const validTypes = ['library', 'recreation', 'dining'];
    if (!validTypes.includes(facilityType)) {
      throw new Error(`Invalid facility type: ${facilityType}. Valid types are: ${validTypes.join(', ')}`);
    }

    console.log(`🎯 Scraping specific facility: ${facilityType}`);
    const browser = await this.getBrowser();
    
    switch (facilityType) {
      case 'library':
        return await this.scrapeLibrary(browser);
      case 'recreation':
        return await this.scrapeRecreation(browser);
      case 'dining':
        return await this.scrapeDining(browser);
      default:
        throw new Error(`Unsupported facility type: ${facilityType}`);
    }
  }

  async scrapeLibrary(browser) {
    console.log('🔍 Scraping library hours...');
    
    let page;
    try {
      db.logScrapeActivity('library', 'started', 'Beginning library hours scrape');
      
      page = await browser.newPage();
      await page.setUserAgent(this.userAgent);
      
      // Navigate to the library hours page
      await page.goto('https://www.angelo.edu/library/hours.php', { 
        waitUntil: 'networkidle2',
        timeout: this.config.timeout
      });
      
      // Wait for content with fallback selectors
      await this.waitForContent(page, [
        '.hours-of-operation-section',
        '.hours-container', 
        '.location-hours',
        'table'
      ]);
      
      // Wait for JavaScript to populate content
      await delay(8000);
      
      const hoursData = await this.extractLibraryHours(page);
      
      if (!hoursData || Object.keys(hoursData).length === 0) {
        throw new Error('No library hours data found on the page');
      }

      const libraryHours = this.formatLibraryHours(hoursData);
      
      await db.updateFacilityHours('library', libraryHours);
      db.logScrapeActivity('library', 'success', `Updated ${libraryHours.length} library hour records`);
      
      console.log('✅ Library hours scraped successfully');
      return { success: true, count: libraryHours.length };

    } catch (error) {
      console.error('❌ Library scraping failed:', error);
      db.logScrapeActivity('library', 'error', error.message);
      throw error;
    } finally {
      if (page) await page.close();
    }
  }

  async scrapeRecreation(browser) {
    console.log('🔍 Scraping recreation center hours...');
    
    let page;
    try {
      db.logScrapeActivity('recreation', 'started', 'Beginning recreation hours scrape');
      
      page = await browser.newPage();
      await page.setUserAgent(this.userAgent);
      
      await page.goto('https://www.angelo.edu/life-on-campus/play/university-recreation/urec-hours-of-operation.php', { 
        waitUntil: 'networkidle2',
        timeout: this.config.timeout
      });
      
      await page.waitForSelector('#hours', { timeout: 10000 });
      await delay(8000);
      
      const hoursData = await this.extractRecreationHours(page);
      
      if (!hoursData || Object.keys(hoursData).length === 0) {
        throw new Error('No recreation hours data found on the page');
      }

      const recHours = this.formatRecreationHours(hoursData);
      
      await db.updateFacilityHours('recreation', recHours);
      db.logScrapeActivity('recreation', 'success', `Updated ${recHours.length} recreation hour records`);
      
      console.log('✅ Recreation hours scraped successfully');
      return { success: true, count: recHours.length };

    } catch (error) {
      console.error('❌ Recreation scraping failed:', error);
      db.logScrapeActivity('recreation', 'error', error.message);
      throw error;
    } finally {
      if (page) await page.close();
    }
  }

  async scrapeDining(browser) {
    console.log('🔍 Scraping dining hours...');
    
    let page;
    try {
      db.logScrapeActivity('dining', 'started', 'Beginning dining hours scrape');
      
      page = await browser.newPage();
      await page.setUserAgent(this.userAgent);
      
      await page.goto('https://dineoncampus.com/Angelo/hours-of-operation', { 
        waitUntil: 'networkidle0',
        timeout: 45000
      });
      
      try {
        await page.waitForSelector('td[data-label="Location"]', { timeout: 30000 });
      } catch (e) {
        throw new Error('Dining hours table content not found');
      }
      
      await delay(3000);
      
      const hoursData = await this.extractDiningHours(page);
      
      if (!hoursData || Object.keys(hoursData).length === 0) {
        throw new Error('No dining hours data found on the page');
      }

      const diningHours = this.formatDiningHours(hoursData);
      
      await db.updateFacilityHours('dining', diningHours);
      db.logScrapeActivity('dining', 'success', `Updated ${diningHours.length} dining hour records`);
      
      console.log('✅ Dining hours scraped successfully');
      return { success: true, count: diningHours.length };

    } catch (error) {
      console.error('❌ Dining scraping failed:', error);
      db.logScrapeActivity('dining', 'error', error.message);
      throw error;
    } finally {
      if (page) await page.close();
    }
  }

  // Helper method to wait for content with multiple fallback selectors
  async waitForContent(page, selectors) {
    for (const selector of selectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        return;
      } catch (e) {
        continue;
      }
    }
    // Proceed anyway if no specific selectors found
  }

  // Extract methods (keeping the existing logic but modularized)
  async extractLibraryHours(page) {
    return await page.evaluate(() => {
      const hoursDiv = document.querySelector('#hours');
      if (!hoursDiv) return null;
      
      const tables = hoursDiv.querySelectorAll('table');
      if (tables.length > 0) {
        let libraryData = {};
        
        tables.forEach((table) => {
          const rows = table.querySelectorAll('tr');
          let headerDays = [];
          
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
          
          for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
            const row = rows[rowIndex];
            const cells = row.querySelectorAll('td, th');
            
            if (cells.length > 1) {
              const sectionName = cells[0].innerText.trim();
              
              if (!sectionName || sectionName.toLowerCase().includes('hours of operation')) {
                continue;
              }
              
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
              
              for (let cellIndex = 1; cellIndex < cells.length && cellIndex <= headerDays.length; cellIndex++) {
                const hoursText = cells[cellIndex].innerText.trim();
                const dayName = headerDays[cellIndex - 1];
                
                if (dayName && hoursText) {
                  let cleanHours = hoursText;
                  
                  if (hoursText.toLowerCase().includes('closed') || 
                      hoursText.toLowerCase().includes('not open') ||
                      hoursText.trim() === '' ||
                      hoursText.trim() === '-' ||
                      hoursText.trim() === 'N/A') {
                    cleanHours = 'Closed';
                  } else if (hoursText.includes('a.m.') || hoursText.includes('p.m.') || 
                           hoursText.includes('AM') || hoursText.includes('PM') ||
                           hoursText.includes('am') || hoursText.includes('pm')) {
                    cleanHours = hoursText;
                  } else if (hoursText.match(/\d+/)) {
                    cleanHours = hoursText;
                  } else if (hoursText.length > 2) {
                    cleanHours = hoursText;
                  } else {
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
  }

  async extractRecreationHours(page) {
    return await page.evaluate(() => {
      const hoursDiv = document.querySelector('#hours');
      if (!hoursDiv) return null;
      
      const tables = hoursDiv.querySelectorAll('table');
      if (tables.length > 0) {
        let gymData = {};
        
        tables.forEach(table => {
          const rows = table.querySelectorAll('tr');
          let headerDays = [];
          
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
          
          for (let rowIndex = 1; rowIndex < rows.length; rowIndex++) {
            const row = rows[rowIndex];
            const cells = row.querySelectorAll('td, th');
            
            if (cells.length > 1) {
              const facilityName = cells[0].innerText.trim();
              
              if (!facilityName || facilityName.toLowerCase().includes('hours of operation')) {
                continue;
              }
              
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
  }

  async extractDiningHours(page) {
    return await page.evaluate(() => {
      const firstLocationCell = document.querySelector('td[data-label="Location"]');
      if (!firstLocationCell) return null;

      const tableElement = firstLocationCell.closest('table');
      if (!tableElement) return null;
      
      let diningData = {};
      const rows = tableElement.querySelectorAll('tr');
      
      for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        const row = rows[rowIndex];
        const locationCell = row.querySelector('td[data-label="Location"]');
        
        if (locationCell) {
          const locationName = locationCell.innerText.trim();
          
          if (!locationName || locationName === '') continue;
          
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
          
          const dayCells = row.querySelectorAll('td[data-label]');
          dayCells.forEach(cell => {
            const dataLabel = cell.getAttribute('data-label');
            let dayName = '';
            
            if (dataLabel && dataLabel.toLowerCase().includes('sun')) dayName = 'Sunday';
            else if (dataLabel && dataLabel.toLowerCase().includes('mon')) dayName = 'Monday';
            else if (dataLabel && dataLabel.toLowerCase().includes('tue')) dayName = 'Tuesday';
            else if (dataLabel && dataLabel.toLowerCase().includes('wed')) dayName = 'Wednesday';
            else if (dataLabel && dataLabel.toLowerCase().includes('thu')) dayName = 'Thursday';
            else if (dataLabel && dataLabel.toLowerCase().includes('fri')) dayName = 'Friday';
            else if (dataLabel && dataLabel.toLowerCase().includes('sat')) dayName = 'Saturday';
            
            if (dayName) {
              let hoursText = cell.innerText.trim();
              
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
  }

  // Format methods for each facility type
  formatLibraryHours(hoursData) {
    const libraryHours = [];
    for (const [sectionName, days] of Object.entries(hoursData)) {
      for (const [dayName, hoursText] of Object.entries(days)) {
        const isClosed = hoursText === 'Closed' || hoursText.toLowerCase().includes('closed');
        
        libraryHours.push({
          section_name: sectionName,
          day_of_week: dayName,
          open_time: isClosed ? null : hoursText,
          close_time: null,
          is_closed: isClosed
        });
      }
    }
    return libraryHours;
  }

  formatRecreationHours(hoursData) {
    const recHours = [];
    for (const [facilityName, days] of Object.entries(hoursData)) {
      for (const [dayName, hoursText] of Object.entries(days)) {
        const isClosed = hoursText === 'Closed' || hoursText.toLowerCase().includes('closed');
        
        recHours.push({
          section_name: facilityName,
          day_of_week: dayName,
          open_time: isClosed ? null : hoursText,
          close_time: null,
          is_closed: isClosed
        });
      }
    }
    return recHours;
  }

  formatDiningHours(hoursData) {
    const diningHours = [];
    for (const [locationName, days] of Object.entries(hoursData)) {
      for (const [dayName, hoursText] of Object.entries(days)) {
        const isClosed = hoursText === 'Closed' || hoursText.toLowerCase().includes('closed') || hoursText === 'Not available';

        if (isClosed) {
          diningHours.push({
            section_name: locationName,
            day_of_week: dayName,
            open_time: null,
            close_time: null,
            is_closed: true
          });
        } else {
          // Extract all time ranges for this day
          const timeRangeRegex = /(\d{1,2}:\d{2}\s*(?:[APap]\.?[Mm]?\.?))\s*-\s*(\d{1,2}:\d{2}\s*(?:[APap]\.?[Mm]?\.?))/gi;
          const timeMatches = Array.from(hoursText.matchAll(timeRangeRegex));
          
          if (timeMatches.length > 0) {
            timeMatches.forEach(match => {
              const openTime = match[1].trim();
              const closeTime = match[2].trim();
              
              diningHours.push({
                section_name: locationName,
                day_of_week: dayName,
                open_time: openTime,
                close_time: closeTime,
                is_closed: false
              });
            });
          } else {
            diningHours.push({
              section_name: locationName,
              day_of_week: dayName,
              open_time: null,
              close_time: null,
              is_closed: false
            });
          }
        }
      }
    }
    return diningHours;
  }

  async close() {
    if (this.browser) {
      console.log('🔄 Closing browser instance...');
      await this.browser.close();
      this.browser = null;
    }
  }
}

module.exports = ScraperManager;