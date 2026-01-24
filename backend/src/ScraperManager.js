const puppeteer = require('puppeteer');
const db = require('./database');
const tutoringDb = require('./tutoring-database');

// Helper function to wait for a specified time
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Helper function to validate a time range
 * @param {string} startTime - e.g., "1:00 p.m."
 * @param {string} endTime - e.g., "8:00 p.m."
 * @returns {boolean} - true if the range is valid (start < end)
 */
const isValidTimeRange = (startTime, endTime) => {
  const toMinutes = (timeStr) => {
    if (!timeStr) return 0;
    const lower = timeStr.toLowerCase();
    const isPM = lower.includes('p');
    
    // Normalize time format before parsing
    let [hours, minutes] = lower
      .replace(/\s*(a\.?m\.?|p\.?m\.?)/, '')
      .trim()
      .split(':')
      .map(n => parseInt(n, 10));

    if (isNaN(hours) || isNaN(minutes)) return 0;

    // Convert to 24-hour format
    if (isPM && hours < 12) {
      hours += 12;
    }
    if (!isPM && hours === 12) { // Handle 12 a.m. (midnight)
      hours = 0;
    }
    return hours * 60 + minutes;
  };

  return toMinutes(startTime) < toMinutes(endTime);
};

// Retry utility function with exponential backoff
const retryWithBackoff = async (operation, operationName, maxRetries = 2, baseDelay = 1000) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      const isLastAttempt = attempt === maxRetries;
      
      if (isLastAttempt) {
        console.error(`❌ ${operationName} failed after ${maxRetries} attempts:`, error.message);
        throw error;
      }
      
      const delay = baseDelay * Math.pow(2, attempt - 1); // 1s, 2s, 4s...
      console.warn(`⚠️ ${operationName} failed (attempt ${attempt}/${maxRetries}), retrying in ${delay/1000}s...`);
      console.warn(`   Error: ${error.message}`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

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
    console.log('🚀 Starting serial facility hours scraping...');
    
    const results = {
      library: null,
      recreation: null,
      dining: null,
      ram_tram: null,
      tutoring: null,
      total_records: 0,
      started_at: new Date().toISOString()
    };

    try {
      const browser = await this.getBrowser();
      
      // Run all scrapers in serial with retry logic to avoid database transaction conflicts
      console.log('📚 Scraping library...');
      try {
        results.library = await retryWithBackoff(
          () => this.scrapeLibrary(browser),
          'Library scraping'
        );
      } catch (error) {
        results.library = { error: error.message, success: false };
      }

      console.log('🏃 Scraping recreation center...');
      try {
        results.recreation = await retryWithBackoff(
          () => this.scrapeRecreation(browser),
          'Recreation scraping'
        );
      } catch (error) {
        results.recreation = { error: error.message, success: false };
      }

      console.log('🍽️ Scraping dining facilities...');
      try {
        results.dining = await retryWithBackoff(
          () => this.scrapeDining(browser),
          'Dining scraping'
        );
      } catch (error) {
        results.dining = { error: error.message, success: false };
      }

      console.log('🚌 Scraping Ram Tram schedule...');
      try {
        results.ram_tram = await retryWithBackoff(
          () => this.scrapeRamTram(browser),
          'Ram Tram scraping'
        );
      } catch (error) {
        results.ram_tram = { error: error.message, success: false };
      }

      console.log('📖 Scraping tutoring schedule...');
      try {
        results.tutoring = await retryWithBackoff(
          () => this.scrapeTutoring(browser),
          'Tutoring scraping'
        );
      } catch (error) {
        results.tutoring = { error: error.message, success: false };
      }

      // Calculate totals
      results.total_records = 
        (results.library?.count || 0) + 
        (results.recreation?.count || 0) + 
        (results.dining?.count || 0) +
        (results.ram_tram?.count || 0) +
        (results.tutoring?.sessions_count || 0);

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
    const validTypes = ['library', 'recreation', 'dining', 'ram_tram', 'tutoring'];
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
      case 'ram_tram':
        return await this.scrapeRamTram(browser);
      case 'tutoring':
        return await this.scrapeTutoring(browser);
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
      
      await page.goto('https://new.dineoncampus.com/Angelo/hours-of-operation', { 
        waitUntil: 'networkidle0',
        timeout: 45000
      });
      
      try {
        // Wait for the new website structure to load - based on actual HTML structure
        await page.waitForSelector('td[data-v-25acc09a], [data-v-25acc09a], table', { timeout: 30000 });
      } catch (e) {
        throw new Error('Dining hours content not found - new website structure may have changed');
      }
      
      await delay(3000);
      
      // Sunday-specific navigation: If today is Sunday, click next week arrow
      // This ensures we get the week that contains today's Sunday data
      await this.handleSundayWeekNavigation(page);
      
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

  async scrapeRamTram(browser) {
    console.log('🔍 Scraping Ram Tram schedule.');

    let page;
    try {
      db.logScrapeActivity('ram_tram', 'started', 'Beginning Ram Tram scrape');

      page = await browser.newPage();
      await page.setUserAgent(this.userAgent);

      await page.goto('https://www.angelo.edu/life-on-campus/live/parking-and-transportation/ram-tram.php', {
        waitUntil: 'networkidle2',
        timeout: this.config.timeout
      });

      await delay(3000);

      const ramTramData = await this.extractRamTramHours(page);
      
      if (!ramTramData || Object.keys(ramTramData).length === 0) {
        throw new Error('No Ram Tram hours data found on the page');
      }

      const tramHours = this.formatRamTramHours(ramTramData);
      
      await db.updateFacilityHours('ram_tram', tramHours);
      db.logScrapeActivity('ram_tram', 'success', `Updated ${tramHours.length} ram tram hour records`);
      console.log('✅ Ram Tram hours scraped successfully');
      return { success: true, count: tramHours.length };

    } catch (error) {
      console.error('❌ Ram tram scraping failed:', error);
      db.logScrapeActivity('ram_tram', 'error', error.message);
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
      let diningData = {};
      
      console.log('Extracting dining hours from unified-hours-table structure...');
      
      // Look for ALL tables with unified-hours-table class (there are multiple!)
      const tables = document.querySelectorAll('table.unified-hours-table');
      
      if (tables.length === 0) {
        console.log('No unified-hours-table found - website structure may have changed');
        return {};
      }
      
      console.log('Found', tables.length, 'unified-hours-table tables');
      
      // Day name mappings
      const dayMappings = {
        'sun': 'Sunday', 'mon': 'Monday', 'tue': 'Tuesday', 
        'wed': 'Wednesday', 'thu': 'Thursday', 'fri': 'Friday', 'sat': 'Saturday'
      };
      
      // Process each table
      tables.forEach((table, tableIndex) => {
        console.log('Processing table', tableIndex);
        
        // Find header row to map day columns
        const thead = table.querySelector('thead');
        let dayColumns = {};
        
        if (thead) {
          const headerCells = thead.querySelectorAll('th, td');
          headerCells.forEach((cell, index) => {
            const cellText = cell.textContent?.trim().toLowerCase() || '';
            for (const [abbrev, fullDay] of Object.entries(dayMappings)) {
              if (cellText.includes(abbrev)) {
                dayColumns[index] = fullDay;
                break;
              }
            }
          });
        }
        
        // Process tbody - new structure has pairs of rows: location-name-row + hours-row
        const tbody = table.querySelector('tbody');
        if (!tbody) {
          console.log('No tbody found in table', tableIndex);
          return;
        }
        
        const rows = tbody.querySelectorAll('tr');
        console.log('Table', tableIndex, '- Found rows:', rows.length);
        
        let currentLocation = null;
        
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          
          // Check if this is a location-name-row
          if (row.classList.contains('location-name-row')) {
            // Extract location name from the link or h3
            const locationLink = row.querySelector('a');
            const locationH3 = row.querySelector('h3');
            
            if (locationLink) {
              currentLocation = locationLink.textContent?.trim() || '';
            } else if (locationH3) {
              currentLocation = locationH3.textContent?.trim() || '';
            }
            
            if (currentLocation) {
              console.log('Found location:', currentLocation);
              if (!diningData[currentLocation]) {
                diningData[currentLocation] = {};
              }
            }
          }
          // Check if this is a hours-row
          else if (row.classList.contains('hours-row') && currentLocation) {
            console.log('Processing hours for:', currentLocation);
            
            // Get all cells in the hours row
            const cells = row.querySelectorAll('td');
            
          cells.forEach((cell, cellIndex) => {
            // Map data cell index to header index (header has "Location" at index 0, data doesn't)
            const headerIndex = cellIndex + 1;
            const dayName = dayColumns[headerIndex];
            if (!dayName) return;
            
            // Check if location is closed - look for "Closed" text or ban icon
            const closedSpan = cell.querySelector('span[aria-label*="Closed"]');
            const banIcon = cell.querySelector('svg[data-icon="ban"]');
            
            if (closedSpan || banIcon) {
              diningData[currentLocation][dayName] = 'Closed';
              return;
            }
            
            // Try to get hours from aria-label first (most reliable)
            const ariaLabelSpans = cell.querySelectorAll('span[aria-label]');
            let hoursFound = false;
            
            for (const span of ariaLabelSpans) {
              const ariaLabel = span.getAttribute('aria-label') || '';
              if (ariaLabel.toLowerCase().includes('closed')) {
                diningData[currentLocation][dayName] = 'Closed';
                hoursFound = true;
                break;
              }
              
              // Extract time from aria-label (format: "Location Day: 11:00a - 1:00p")
              const colonSpaceIndex = ariaLabel.indexOf(': ');
              if (colonSpaceIndex > 0) {
                let timeText = ariaLabel.substring(colonSpaceIndex + 2).trim();
                
                // Look for time patterns
                const timePattern = /(\d{1,2}:\d{2})\s*([APap]\.?[Mm]?\.?)\s*-\s*(\d{1,2}:\d{2})\s*([APap]\.?[Mm]?\.?)/gi;
                const timeMatches = Array.from(timeText.matchAll(timePattern));
                
                if (timeMatches.length > 0) {
                  const uniqueRanges = new Set();
                  
                  timeMatches.forEach(match => {
                    const startHour = match[1];
                    const startPeriod = match[2].toLowerCase();
                    const endHour = match[3];
                    const endPeriod = match[4].toLowerCase();
                    
                    const startAMPM = startPeriod.startsWith('a') ? 'AM' : 'PM';
                    const endAMPM = endPeriod.startsWith('a') ? 'AM' : 'PM';
                    
                    const timeRange = `${startHour} ${startAMPM} - ${endHour} ${endAMPM}`;
                    uniqueRanges.add(timeRange);
                  });
                  
                  if (uniqueRanges.size > 0) {
                    diningData[currentLocation][dayName] = Array.from(uniqueRanges).join('\n');
                    hoursFound = true;
                    break;
                  }
                }
              }
            }
            
            // Fallback: if no aria-label hours found, try cell text
            if (!hoursFound) {
              const cellText = cell.textContent?.trim() || '';
              
              if (cellText.toLowerCase().includes('closed') || !cellText) {
                diningData[currentLocation][dayName] = 'Closed';
              } else {
                diningData[currentLocation][dayName] = 'Not available';
              }
            }
          });
          }
        }
      });
      
      console.log('Extraction complete. Found locations:', Object.keys(diningData));
      return diningData;
    });
  }

  async extractRamTramHours(page) {
    return await page.evaluate(() => {
      // Look for the schedule table
      const tables = document.querySelectorAll('table');
      let scheduleTable = null;
      
      // Find the table that contains Fall information
      for (const table of tables) {
        const tableText = table.innerText.toLowerCase();
        if (tableText.includes('fall')) {
          scheduleTable = table;
          break;
        }
      }
      
      if (!scheduleTable) {
        console.log('No schedule table found');
        return null;
      }
      
      const rows = scheduleTable.querySelectorAll('tr');
      let ramTramData = {};
      let headerRow = null;
      let fallRow = null;
      
      // Find the header row and the Fall row
      for (const row of rows) {
        const rowText = row.innerText;
        
        // Find header row (contains day names)
        const dayPatterns = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const hasDayName = dayPatterns.some(day => rowText.toLowerCase().includes(day));
        if (hasDayName) {
          headerRow = row;
        }
        
        // Find Fall row
        if (rowText.includes('Fall')) {
          fallRow = row;
        }
      }
      
      if (!headerRow || !fallRow) {
        console.log('Header row or Fall row not found');
        return null;
      }
      
      // Get header cells to determine which days are available
      const headerCells = headerRow.querySelectorAll('td, th');
      const fallCells = fallRow.querySelectorAll('td, th');
      
      // Initialize all days as closed
      const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
      allDays.forEach(day => {
        ramTramData[day] = 'Closed';
      });
      
      // Check each header cell to see which days are available
      for (let i = 0; i < headerCells.length; i++) {
        const headerText = headerCells[i].innerText.toLowerCase();
        const fallText = fallCells[i] ? fallCells[i].innerText.trim() : '';
        
        // Determine which day this column represents - check for any day of the week
        let dayName = null;
        const dayMappings = {
          'monday': 'Monday',
          'tuesday': 'Tuesday', 
          'wednesday': 'Wednesday',
          'thursday': 'Thursday',
          'friday': 'Friday',
          'saturday': 'Saturday',
          'sunday': 'Sunday'
        };
        
        // Check if this header contains any day name
        for (const [dayKey, dayValue] of Object.entries(dayMappings)) {
          if (headerText.includes(dayKey)) {
            dayName = dayValue;
            break;
          }
        }
        
      // If found a day and there's content in the Fall row, set the hours
        if (dayName && fallText && fallText !== '') {
          // Extract route information
          let routeInfo = '';
          if (fallText.toLowerCase().includes('gold route')) {
            routeInfo = 'Gold Route';
          } else if (fallText.toLowerCase().includes('blue route')) {
            routeInfo = 'Blue Route';
          }
          
          // Clean up the text (remove route names, keep just the time)
          let cleanText = fallText;
          cleanText = cleanText.replace(/gold route|blue route/gi, '').trim();
          
          // If the text still has content after cleaning, use it
          if (cleanText && cleanText !== '') {
            // Store both time and route info
            ramTramData[dayName] = {
              time: cleanText,
              route: routeInfo
            };
          }
        }
      }
      
      return ramTramData;
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
    const seenEntries = new Set(); // Track unique entries to avoid duplicates
    
    for (const [locationName, days] of Object.entries(hoursData)) {
      for (const [dayName, hoursText] of Object.entries(days)) {
        // Create unique key to prevent duplicates
        const entryKey = `${locationName}|${dayName}|${hoursText}`;
        if (seenEntries.has(entryKey)) {
          continue; // Skip duplicate entries
        }
        seenEntries.add(entryKey);
        
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
              
              // Validate the time range before adding it
              if (isValidTimeRange(openTime, closeTime)) {
                diningHours.push({
                  section_name: locationName,
                  day_of_week: dayName,
                  open_time: openTime,
                  close_time: closeTime,
                  is_closed: false
                });
              }
            });
          } else {
            diningHours.push({
              section_name: locationName,
              day_of_week: dayName,
              open_time: hoursText,
              close_time: null,
              is_closed: false
            });
          }
        }
      }
    }
    return diningHours;
  }

  formatRamTramHours(hoursData) {
    const ramTramHours = [];
    for (const [dayName, dayData] of Object.entries(hoursData)) {
      const isClosed = dayData === 'Closed' || (typeof dayData === 'string' && dayData.toLowerCase().includes('closed'));
      
      if (isClosed) {
        ramTramHours.push({
          section_name: 'Ram Tram',
          day_of_week: dayName,
          open_time: null,
          close_time: null,
          is_closed: true,
          route: null
        });
      } else {
        // Handle new data structure with route info
        let hoursText, routeInfo;
        
        if (typeof dayData === 'object' && dayData.time) {
          hoursText = dayData.time;
          routeInfo = dayData.route;
        } else {
          // Fallback for old string format
          hoursText = dayData;
          routeInfo = null;
        }
        
        // Extract time range for Ram Tram
        const timeRangeRegex = /(\d{1,2}:\d{2}\s*(?:[APap]\.?[Mm]?\.?))\s*-\s*(\d{1,2}:\d{2}\s*(?:[APap]\.?[Mm]?\.?))/gi;
        const timeMatch = timeRangeRegex.exec(hoursText);
        
        if (timeMatch) {
          const openTime = timeMatch[1].trim();
          const closeTime = timeMatch[2].trim();
          
          ramTramHours.push({
            section_name: 'Ram Tram',
            day_of_week: dayName,
            open_time: openTime,
            close_time: closeTime,
            is_closed: false,
            route: routeInfo
          });
        } else {
          // If no time range found, store the raw text
          ramTramHours.push({
            section_name: 'Ram Tram',
            day_of_week: dayName,
            open_time: hoursText,
            close_time: null,
            is_closed: false,
            route: routeInfo
          });
        }
      }
    }
    return ramTramHours;
  }

  async scrapeTutoring(browser) {
    console.log('🔍 Scraping tutoring hours...');
    
    let page;
    try {
      tutoringDb.logScrapeActivity('started', 'Beginning tutoring hours scrape');
      
      page = await browser.newPage();
      await page.setUserAgent(this.userAgent);
      
      await page.goto('https://www.angelo.edu/current-students/freshman-college/academic-tutoring.php', {
        waitUntil: 'networkidle2',
        timeout: this.config.timeout
      });
      
      // Wait for accordion content to load
      await this.waitForContent(page, [
        '.lw_accordion',
        'section.lw_accordion_block',
        'table'
      ]);
      
      await delay(3000);
      
      const tutoringData = await this.extractTutoringHours(page);
      
      if (!tutoringData || Object.keys(tutoringData).length === 0) {
        throw new Error('No tutoring hours data found on the page');
      }

      // Also scrape Math Lab hours
      console.log('🔍 Scraping Math Lab hours...');
      const mathLabData = await this.scrapeMathLab(browser);
      
      // Merge Math Lab data with tutoring data
      const mergedData = { ...tutoringData };
      if (mathLabData && Object.keys(mathLabData).length > 0) {
        Object.assign(mergedData, mathLabData);
        console.log('✅ Math Lab hours merged with tutoring data');
      }

      // Sort subjects alphabetically
      const sortedData = {};
      Object.keys(mergedData).sort((a, b) => a.localeCompare(b)).forEach(key => {
        sortedData[key] = mergedData[key];
      });

      const formattedData = this.formatTutoringHours(sortedData);
      
      // Update tutoring database
      const counts = await tutoringDb.updateTutoringData(formattedData);
      tutoringDb.logScrapeActivity('success', `Updated tutoring data`, counts);
      
      console.log('✅ Tutoring hours scraped successfully');
      return { 
        success: true, 
        subjects_count: counts.subjects_count,
        courses_count: counts.courses_count,
        sessions_count: counts.sessions_count
      };

    } catch (error) {
      console.error('❌ Tutoring scraping failed:', error);
      tutoringDb.logScrapeActivity('error', error.message);
      throw error;
    } finally {
      if (page) await page.close();
    }
  }

  async scrapeMathLab(browser) {
    console.log('🔍 Scraping Math Lab hours from dedicated page...');
    
    let page;
    try {
      page = await browser.newPage();
      await page.setUserAgent(this.userAgent);
      
      await page.goto('https://www.angelo.edu/current-students/freshman-college/math-lab.php', {
        waitUntil: 'networkidle2',
        timeout: this.config.timeout
      });
      
      await delay(2000);
      
      const mathLabData = await page.evaluate(() => {
        const data = {};
        
        // Find the table with Math Lab hours
        const tables = document.querySelectorAll('table');
        let mathLabTable = null;
        
        for (const table of tables) {
          const caption = table.querySelector('caption');
          const tableText = table.innerText.toLowerCase();
          if (caption?.innerText.toLowerCase().includes('math lab') || 
              tableText.includes('math lab') ||
              tableText.includes('sun') && tableText.includes('mon')) {
            mathLabTable = table;
            break;
          }
        }
        
        if (!mathLabTable) {
          console.log('Math Lab table not found');
          return null;
        }
        
        // Parse the table - it has days as columns
        const rows = mathLabTable.querySelectorAll('tr');
        if (rows.length < 2) return null;
        
        // Get header row (days)
        const headerCells = rows[0].querySelectorAll('td, th');
        const days = [];
        const dayMappings = {
          'sun': 'Sunday', 'mon': 'Monday', 'tue': 'Tuesday',
          'wed': 'Wednesday', 'thu': 'Thursday', 'fri': 'Friday', 'sat': 'Saturday'
        };
        
        headerCells.forEach(cell => {
          const text = cell.innerText.toLowerCase().trim();
          for (const [abbrev, fullDay] of Object.entries(dayMappings)) {
            if (text.includes(abbrev)) {
              days.push(fullDay);
              break;
            }
          }
        });
        
        // Get hours row
        const hoursRow = rows[1];
        const hoursCells = hoursRow.querySelectorAll('td, th');
        
        const sessions = [];
        hoursCells.forEach((cell, index) => {
          if (index < days.length) {
            const hoursText = cell.innerText.trim();
            const day = days[index];
            
            if (hoursText.toLowerCase() === 'closed' || !hoursText) {
              // Skip closed days
            } else {
              sessions.push({
                day: day,
                time: hoursText,
                location: 'Porter Henderson Library, Room 328'
              });
            }
          }
        });
        
        if (sessions.length > 0) {
          data['Math Lab'] = {
            'Math Lab (Drop-in Help)': sessions
          };
        }
        
        return data;
      });
      
      console.log('✅ Math Lab hours extracted');
      return mathLabData;
      
    } catch (error) {
      console.error('⚠️ Math Lab scraping failed (continuing without it):', error.message);
      return null;
    } finally {
      if (page) await page.close();
    }
  }

  async extractTutoringHours(page) {
    return await page.evaluate(() => {
      const tutoringData = {};
      
      // Get all accordion sections (subjects)
      const sections = document.querySelectorAll('section.lw_accordion_block');
      
      console.log('Found', sections.length, 'accordion sections');
      
      sections.forEach(section => {
        // Get subject name from h4
        const subjectTitle = section.querySelector('h4.lw_accordion_block_title');
        let subjectName = subjectTitle?.textContent?.trim() || 'Unknown';
        
        // Clean up subject name (remove extra whitespace, arrows, etc.)
        subjectName = subjectName.replace(/\s+/g, ' ').trim();
        
        // Skip if it looks like a header or navigation element
        if (subjectName.toLowerCase().includes('hours of operation') || 
            subjectName.toLowerCase().includes('schedule')) {
          return;
        }
        
        // Get all course tables within this subject
        const contentDiv = section.querySelector('.lw_accordion_block_content');
        if (!contentDiv) return;
        
        const tables = contentDiv.querySelectorAll('div.tableWrap table, table');
        
        console.log('Subject:', subjectName, '- Found', tables.length, 'tables');
        
        tables.forEach(table => {
          // Get course name from caption
          const caption = table.querySelector('caption');
          let courseName = caption?.textContent?.trim() || '';
          
          // Clean up course name (remove &nbsp; and extra spaces)
          courseName = courseName.replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
          
          if (!courseName) return;
          
          // Get all hour rows - check both tbody and thead (some subjects have data in thead)
          // Also get rows directly from table in case there's no tbody/thead wrapper
          let rows = table.querySelectorAll('tbody tr');
          if (rows.length === 0) {
            // Fallback: get all tr elements and filter out header rows
            rows = table.querySelectorAll('tr');
          }
          const courseHours = [];
          let lastValidDay = ''; // Track the last valid day for rows with empty day cells
          
          rows.forEach(row => {
            // Skip header rows (rows with th elements)
            if (row.querySelector('th')) return;
            
            const cells = row.querySelectorAll('td');
            if (cells.length >= 3) {
              let day = cells[0]?.textContent?.trim() || '';
              const time = cells[1]?.textContent?.trim() || '';
              const location = cells[2]?.textContent?.trim() || '';
              
              // Clean up day value - handle &nbsp; (non-breaking space) and empty values
              day = day.replace(/\u00A0/g, '').trim();
              
              // If day is empty but we have time/location, use the last valid day
              // This handles cases like Upswing rows that continue from previous day
              if (!day && (time || location)) {
                day = lastValidDay || 'Online'; // Use last day, or 'Online' as fallback
              }
              
              // Update last valid day if current day is valid
              if (day && day !== 'Online') {
                lastValidDay = day;
              }
              
              // Add if we have at least a day and some content
              if (day && (time || location)) {
                courseHours.push({
                  day: day,
                  time: time || 'TBA',
                  location: location || 'TBA'
                });
              }
            }
          });
          
          // Store with subject grouping
          if (!tutoringData[subjectName]) {
            tutoringData[subjectName] = {};
          }
          
          // Handle multiple courses with same name by merging sessions
          if (tutoringData[subjectName][courseName]) {
            tutoringData[subjectName][courseName] = [
              ...tutoringData[subjectName][courseName],
              ...courseHours
            ];
          } else {
            tutoringData[subjectName][courseName] = courseHours;
          }
        });
      });
      
      console.log('Extraction complete. Found subjects:', Object.keys(tutoringData));
      return tutoringData;
    });
  }

  formatTutoringHours(tutoringData) {
    // The data is already in the correct format from extraction
    // Just ensure we have valid structure
    const formatted = {};
    
    for (const [subjectName, courses] of Object.entries(tutoringData)) {
      if (!subjectName || subjectName === 'Unknown') continue;
      
      formatted[subjectName] = {};
      
      for (const [courseName, sessions] of Object.entries(courses)) {
        if (!courseName) continue;
        
        // Filter out empty or invalid sessions
        const validSessions = sessions.filter(session => 
          session.day && session.day !== ''
        );
        
        if (validSessions.length > 0) {
          formatted[subjectName][courseName] = validSessions;
        }
      }
      
      // Remove subject if no valid courses
      if (Object.keys(formatted[subjectName]).length === 0) {
        delete formatted[subjectName];
      }
    }
    
    return formatted;
  }

  async handleSundayWeekNavigation(page) {
    const today = new Date();
    const isSunday = today.getDay() === 0; // 0 = Sunday
    
    if (!isSunday) {
      console.log('📅 Not Sunday, using default week display');
      return;
    }
    
    console.log('📅 Today is Sunday - navigating to current week that contains today');
    
    try {
      // Use the exact selector from the screenshot: button.btn-next
      const clicked = await page.evaluate(() => {
        const nextButton = document.querySelector('button.btn-next');
        
        if (nextButton && nextButton.offsetParent !== null && !nextButton.disabled) {
          console.log('Found and clicking button.btn-next');
          nextButton.click();
          return true;
        }
        
        console.log('button.btn-next not found or not clickable');
        return false;
      });
      
      if (clicked) {
        console.log('✅ Successfully clicked next week arrow (button.btn-next)');
        await delay(3000); // Wait for page to update
      } else {
        console.log('⚠️ Could not find or click button.btn-next - continuing with default week');
      }
      
    } catch (error) {
      console.log('⚠️ Error during Sunday navigation:', error.message);
      // Continue with default week if navigation fails
    }
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