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
      ram_tram: null,
      total_records: 0,
      started_at: new Date().toISOString()
    };

    try {
      const browser = await this.getBrowser();
      
      // Run all scrapers in parallel for better performance
      const scraperPromises = [
        this.scrapeLibrary(browser).catch(error => ({ error: error.message, success: false })),
        this.scrapeRecreation(browser).catch(error => ({ error: error.message, success: false })),
        this.scrapeDining(browser).catch(error => ({ error: error.message, success: false })),
        this.scrapeRamTram(browser).catch(error => ({ error: error.message, success: false }))
      ];

      const [libraryResult, recreationResult, diningResult, ramTramResult] = await Promise.allSettled(scraperPromises);

      // Process results
      results.library = libraryResult.status === 'fulfilled' ? libraryResult.value : { error: libraryResult.reason.message, success: false };
      results.recreation = recreationResult.status === 'fulfilled' ? recreationResult.value : { error: recreationResult.reason.message, success: false };
      results.dining = diningResult.status === 'fulfilled' ? diningResult.value : { error: diningResult.reason.message, success: false };
      results.ram_tram = ramTramResult.status === 'fulfilled' ? ramTramResult.value : { error: ramTramResult.reason.message, success: false };

      // Calculate totals
      results.total_records = 
        (results.library?.count || 0) + 
        (results.recreation?.count || 0) + 
        (results.dining?.count || 0) +
        (results.ram_tram?.count || 0);

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
      case 'ram_tram':
        return await this.scrapeRamTram(browser);
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
      
      console.log('Extracting dining hours from new website structure...');
      
      // Look for the main dining hours table
      const tables = document.querySelectorAll('table');
      console.log('Found tables:', tables.length);
      
      if (tables.length === 0) {
        console.log('No tables found - website structure may have changed');
        return {};
      }
      
      // Find all dining tables by looking for tables with restaurant/dining content
      let diningTables = [];
      
      for (const table of tables) {
        const tableText = table.textContent || '';
        const rows = table.querySelectorAll('tr');
        
        // Look for any table containing dining hours (more generic approach)
        const hasDiningContent = tableText.includes('Closed') && 
                                (tableText.includes(':') || tableText.includes('AM') || tableText.includes('PM')) &&
                                rows.length > 3;
        
        if (hasDiningContent) {
          diningTables.push({ table: table, rows: rows.length });
          console.log('Found dining table with', rows.length, 'rows');
        }
      }
      
      if (diningTables.length === 0) {
        console.log('Could not find any dining hours tables');
        return {};
      }
      
      console.log('Processing', diningTables.length, 'dining tables');
      
      // Process each dining table
      diningTables.forEach((tableInfo, tableIndex) => {
        const { table: diningTable, rows: rowCount } = tableInfo;
        console.log('Processing table', tableIndex + 1, 'with', rowCount, 'rows');
        
        const rows = diningTable.querySelectorAll('tr');
      
      // Find header row with day names
      let headerRow = null;
      let dayColumns = {};
      
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const cells = row.querySelectorAll('td, th');
        
        // Check if this row contains day abbreviations
        let foundDays = 0;
        cells.forEach((cell, cellIndex) => {
          const cellText = cell.textContent?.trim().toLowerCase() || '';
          const dayMappings = {
            'sun': 'Sunday', 'mon': 'Monday', 'tue': 'Tuesday', 
            'wed': 'Wednesday', 'thu': 'Thursday', 'fri': 'Friday', 'sat': 'Saturday'
          };
          
          for (const [abbrev, fullDay] of Object.entries(dayMappings)) {
            if (cellText.includes(abbrev)) {
              dayColumns[cellIndex] = fullDay;
              foundDays++;
              break;
            }
          }
        });
        
        if (foundDays >= 3) { // Found at least 3 days, likely the header row
          headerRow = row;
          console.log('Found header row with day columns:', dayColumns);
          break;
        }
      }
      
      if (!headerRow || Object.keys(dayColumns).length === 0) {
        console.log('Could not find header row with day columns');
        return {};
      }
      
      // Process each data row
      for (let i = 0; i < rows.length; i++) {
        if (rows[i] === headerRow) continue; // Skip header
        
        const row = rows[i];
        const cells = row.querySelectorAll('td, th');
        
        if (cells.length === 0) continue;
        
        // Extract location name from first cell
        const locationName = cells[0]?.textContent?.trim() || '';
        if (!locationName) continue;
        
        // Check if this is a restaurant row
        const restaurantPatterns = /^(Just Baked|Bella|Starbucks|Chick-fil-A|Subway|Einstein|TEA Co|The CAF|Roscoe|Tu Taco|Ranch|Market|Sushi)/i;
        if (!restaurantPatterns.test(locationName)) {
          console.log('Skipping non-restaurant row:', locationName);
          continue;
        }
        
        console.log('Processing restaurant:', locationName);
        
        // Clean and standardize location name
        let cleanLocationName = locationName;
        if (locationName.toLowerCase().includes('just baked') || locationName.toLowerCase().includes('bistro')) {
          cleanLocationName = 'Just Baked Smart Bistro';
        } else if (locationName.toLowerCase().includes('bella')) {
          cleanLocationName = "Bella's Blends";
        } else if (locationName.toLowerCase().includes('tea co')) {
          cleanLocationName = 'TEA Co';
        } else if (locationName.toLowerCase().includes('caf')) {
          cleanLocationName = 'The CAF';
        } else if (locationName.toLowerCase().includes('chick-fil-a')) {
          cleanLocationName = 'Chick-fil-A';
        } else if (locationName.toLowerCase().includes('starbucks')) {
          cleanLocationName = 'Starbucks';
        } else if (locationName.toLowerCase().includes('einstein') || locationName.toLowerCase().includes('bagel')) {
          cleanLocationName = 'Einstein Bros Bagels';
        } else if (locationName.toLowerCase().includes('roscoe')) {
          cleanLocationName = "Roscoe's Den";
        } else if (locationName.toLowerCase().includes('subway')) {
          cleanLocationName = 'Subway';
        } else if (locationName.toLowerCase().includes('tu taco') || locationName.toLowerCase().includes('taco')) {
          cleanLocationName = 'Tu Taco';
        } else if (locationName.toLowerCase().includes('ranch') || locationName.toLowerCase().includes('smokehouse')) {
          cleanLocationName = 'Ranch Smokehouse';
        } else if (locationName.toLowerCase().includes('market')) {
          cleanLocationName = 'Market';
        } else if (locationName.toLowerCase().includes('sushi')) {
          cleanLocationName = 'Sushi';
        }
        
        // Initialize location data
        diningData[cleanLocationName] = {};
        
        // Extract hours for each day
        Object.entries(dayColumns).forEach(([columnIndex, dayName]) => {
          const cellIndex = parseInt(columnIndex);
          const cell = cells[cellIndex];
          
          if (!cell) {
            diningData[cleanLocationName][dayName] = 'Not available';
            return;
          }
          
          let hoursText = cell.textContent?.trim() || '';
          console.log(`Raw hours for ${cleanLocationName} ${dayName}:`, JSON.stringify(hoursText));
          
          // Clean up the hours text
          if (!hoursText || hoursText === '' || hoursText === '-' || hoursText.toLowerCase().includes('closed')) {
            hoursText = 'Closed';
          } else {
            // Handle different cell formats:
            // Main table: "Mon8/257:30a - 9:00p7:30a - 9:00p" (duplicated)
            // Additional table: "Mon8/2511:00a - 2:00p7:00p - 11:00p11:00a - 2:00p7:00p - 11:00p" (separated hours)
            
            // First, remove date information (like "Mon8/25", "Tue8/26", etc.)
            hoursText = hoursText.replace(/^[A-Za-z]{3}\d{1,2}\/\d{1,2}/, '');
            
            // Extract all time range patterns
            const timePattern = /(\d{1,2}:\d{2}[ap])\s*-\s*(\d{1,2}:\d{2}[ap])/gi;
            const timeMatches = Array.from(hoursText.matchAll(timePattern));
            
            if (timeMatches.length > 0) {
              // Convert each time range to proper format
              const timeRanges = timeMatches.map(match => {
                const startTime = match[1].replace('a', ' AM').replace('p', ' PM');
                const endTime = match[2].replace('a', ' AM').replace('p', ' PM');
                return startTime + ' - ' + endTime;
              });
              
              // For locations like Roscoe's Den with separated hours (lunch + dinner)
              // Remove duplicates and join unique ranges
              const uniqueRanges = [...new Set(timeRanges)];
              hoursText = uniqueRanges.join(', ');
              
            } else {
              // If no time pattern found, check if it contains "Closed"
              if (hoursText.toLowerCase().includes('closed')) {
                hoursText = 'Closed';
              } else {
                hoursText = 'Not available';
              }
            }
          }
          
          diningData[cleanLocationName][dayName] = hoursText;
        });
        
      }
      
      }); // End of diningTables.forEach
      
      // Processing complete - all tables (main + additional) have been processed
      
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

  async close() {
    if (this.browser) {
      console.log('🔄 Closing browser instance...');
      await this.browser.close();
      this.browser = null;
    }
  }
}

module.exports = ScraperManager;