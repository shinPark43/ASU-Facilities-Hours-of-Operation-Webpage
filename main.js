const { app, BrowserWindow } = require('electron');
const puppeteer = require('puppeteer');

// Helper function to wait for a specified time
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to format hours text
function formatHoursText(rawText) {
  if (!rawText || rawText.includes('not found') || rawText.includes('Error')) {
    return rawText;
  }
  
  // Clean up the text and format it nicely
  let formatted = rawText
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/\n+/g, '\n') // Replace multiple newlines with single newline
    .trim();
  
  // Try to format day-by-day if it contains day names
  if (formatted.includes('Monday') || formatted.includes('Mon')) {
    // Split by days and format each line
    const dayPattern = /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon|Tue|Wed|Thu|Fri|Sat|Sun)/gi;
    const lines = formatted.split('\n').filter(line => line.trim());
    
    let formattedLines = [];
    for (let line of lines) {
      if (dayPattern.test(line)) {
        // This line contains a day, format it nicely
        line = line.replace(/(\w+day)/gi, '**$1**'); // Bold the day names
        formattedLines.push(line.trim());
      } else if (line.trim() && !line.includes('*')) {
        // This might be hours info, add it to the previous line or as new line
        formattedLines.push(line.trim());
      }
    }
    
    if (formattedLines.length > 0) {
      return formattedLines.join('\n');
    }
  }
  
  return formatted;
}

async function fetchLibraryHours() {
  let browser;
  try {
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    // Navigate to the library hours page
    await page.goto('https://www.angelo.edu/library/hours.php', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
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
            console.log('No specific hours selector found, proceeding anyway');
          }
        }
      }
    }
    
    // Wait a bit more for JavaScript to populate the content
    await delay(8000); // Increased wait time for external site
    
    // Extract the hours content with proper table parsing for library sections
    const hoursContent = await page.evaluate(() => {
      const hoursDiv = document.querySelector('#hours');
      if (!hoursDiv) return 'Hours not found';
      
      // Look for tables within the hours div
      const tables = hoursDiv.querySelectorAll('table');
      if (tables.length > 0) {
        let libraryData = {};
        
        tables.forEach(table => {
          const rows = table.querySelectorAll('tr');
          let headerDays = [];
          
          // First, extract the header row to get day names
          if (rows.length > 0) {
            const headerRow = rows[0];
            const headerCells = headerRow.querySelectorAll('td, th');
            
            for (let i = 1; i < headerCells.length; i++) {
              const headerText = headerCells[i].innerText.trim();
              let dayName = '';
              
              // Parse day names from headers like "Tuesday 5/27" or "Intersession TUE 5/27"
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
                cleanSectionName = 'Library';
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
              for (let cellIndex = 1; cellIndex < cells.length && cellIndex <= headerDays.length; cellIndex++) {
                const hoursText = cells[cellIndex].innerText.trim();
                const dayName = headerDays[cellIndex - 1];
                
                if (dayName && hoursText) {
                  // Clean up the hours text
                  let cleanHours = hoursText;
                  if (hoursText.toLowerCase().includes('closed')) {
                    cleanHours = 'Closed';
                  } else if (hoursText.includes('a.m.') || hoursText.includes('p.m.')) {
                    cleanHours = hoursText; // Keep time format as is
                  } else if (hoursText.match(/\d/)) {
                    cleanHours = hoursText; // Keep if it contains numbers
                  } else {
                    cleanHours = 'See details';
                  }
                  
                  libraryData[cleanSectionName][dayName] = cleanHours;
                }
              }
            }
          }
        });
        
        // Convert library data to formatted string
        let result = '';
        for (let section in libraryData) {
          result += `${section}:\n`;
          const dayOrder = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          
          for (let day of dayOrder) {
            const hours = libraryData[section][day] || 'Not available';
            result += `${day}: ${hours}\n`;
          }
          result += '\n';
        }
        
        console.log('Formatted library data:', JSON.stringify(result));
        return result.trim();
      }
      
      // Fallback: try to get structured data from other elements
      const hoursContent = hoursDiv.innerText.trim();
      return hoursContent || 'Library hours could not be loaded';
    });
    
    // Log the raw content for debugging
    console.log('Raw library hours content:', hoursContent);
    
    return hoursContent || 'Library hours could not be loaded';
    
  } catch (error) {
    console.error('Error fetching library hours:', error);
    return 'Error loading library hours. Please check the website directly.';
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function fetchGymHours() {
  let browser;
  try {
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    // Navigate to the gym hours page
    await page.goto('https://www.angelo.edu/life-on-campus/play/university-recreation/urec-hours-of-operation.php', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Wait for the hours div to be present
    await page.waitForSelector('#hours', { timeout: 10000 });
    
    // Wait longer for the JavaScript to load the hours content
    await delay(8000); // Increased wait time for JS to execute
    
    // Extract the hours table data with proper table parsing
    const hoursContent = await page.evaluate(() => {
      const hoursDiv = document.querySelector('#hours');
      if (!hoursDiv) return 'Hours container not found';
      
      // Look for tables within the hours div
      const tables = hoursDiv.querySelectorAll('table');
      if (tables.length > 0) {
        let facilityData = {};
        
        tables.forEach(table => {
          const rows = table.querySelectorAll('tr');
          let headerDays = [];
          
          // First, extract the header row to get day names
          if (rows.length > 0) {
            const headerRow = rows[0];
            const headerCells = headerRow.querySelectorAll('td, th');
            
            for (let i = 1; i < headerCells.length; i++) {
              const headerText = headerCells[i].innerText.trim();
              let dayName = '';
              
              // Parse day names from headers like "Tuesday 5/27"
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
              if (facilityName.toLowerCase().includes('chp')) {
                cleanFacilityName = 'CHP (Fitness Center)';
              } else if (facilityName.toLowerCase().includes('swimming')) {
                cleanFacilityName = 'Swimming Pool';
              } else if (facilityName.toLowerCase().includes('climbing')) {
                cleanFacilityName = 'Climbing Gym';
              } else if (facilityName.toLowerCase().includes('lake')) {
                cleanFacilityName = 'Lake House';
              } else if (facilityName.toLowerCase().includes('intramural')) {
                cleanFacilityName = 'Intramural Complex';
              }
              
              if (!facilityData[cleanFacilityName]) {
                facilityData[cleanFacilityName] = {};
              }
              
              // Extract hours for each day
              for (let cellIndex = 1; cellIndex < cells.length && cellIndex <= headerDays.length; cellIndex++) {
                const hoursText = cells[cellIndex].innerText.trim();
                const dayName = headerDays[cellIndex - 1];
                
                if (dayName && hoursText) {
                  // Clean up the hours text
                  let cleanHours = hoursText;
                  if (hoursText.toLowerCase().includes('closed')) {
                    cleanHours = 'Closed';
                  } else if (hoursText.includes('Noon')) {
                    cleanHours = hoursText; // Keep as is
                  } else if (hoursText.match(/\d/)) {
                    cleanHours = hoursText; // Keep if it contains numbers
                  } else {
                    cleanHours = 'See details';
                  }
                  
                  facilityData[cleanFacilityName][dayName] = cleanHours;
                }
              }
            }
          }
        });
        
        // Convert facility data to formatted string
        let result = '';
        for (let facility in facilityData) {
          result += `${facility}:\n`;
          const dayOrder = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          
          for (let day of dayOrder) {
            const hours = facilityData[facility][day] || 'Not available';
            result += `${day}: ${hours}\n`;
          }
          result += '\n';
        }
        
        console.log('Formatted facility data:', JSON.stringify(result));
        return result.trim();
      }
      
      // Fallback: return raw text
      const rawText = hoursDiv.innerText || hoursDiv.textContent || '';
      return rawText.trim() || 'Hours table not loaded yet. Please check the website directly.';
    });
    
    // Log the raw content for debugging
    console.log('Raw gym hours content:', hoursContent);
    
    return hoursContent || 'Gym hours could not be loaded';
    
  } catch (error) {
    console.error('Error fetching gym hours:', error);
    return 'Error loading gym hours. Please check the website directly.';
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function fetchDiningHours() {
  let browser;
  try {
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    // Set a common user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Navigate to the dining hours page
    await page.goto('https://dineoncampus.com/Angelo/hours-of-operation', { 
      waitUntil: 'networkidle0', // Wait for network to be idle
      timeout: 45000 // Increased timeout for page load
    });
    
    // Wait for a specific key element of the table to ensure it's loaded
    try {
      await page.waitForSelector('td[data-label="Location"]', { timeout: 30000 }); // Wait up to 30s
      console.log("Dining Hours: Found 'td[data-label=\"Location\"]', proceeding to scrape.");
    } catch (e) {
      console.error('Dining Hours: Could not find "td[data-label=\'Location\']" selector. Page structure might have changed or content is not loading.');
      const pageContent = await page.content();
      // Log the beginning of the page content for debugging
      console.log("Dumping dining page HTML (first 5000 chars):\n", pageContent.substring(0, 5000));
      return 'Dining hours table content (td[data-label=\'Location\']) not found. Please check website or console logs.';
    }
    
    // Optional: A small delay just in case, though networkidle0 and waitForSelector should cover most cases.
    await delay(3000); 
    
    // Extract the dining hours content
    const hoursContent = await page.evaluate(() => {
      const firstLocationCell = document.querySelector('td[data-label="Location"]');
      if (!firstLocationCell) {
        // This should not happen if waitForSelector above succeeded
        return 'Error: td[data-label="Location"] disappeared before evaluation phase.';
      }

      const tableElement = firstLocationCell.closest('table');
      if (!tableElement) {
        return 'Error: Could not find parent table for dining hours data based on td[data-label="Location"].';
      }
      
      let diningData = {};
      const rows = tableElement.querySelectorAll('tr');
      
      for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
        const row = rows[rowIndex];
        const locationCell = row.querySelector('td[data-label="Location"]');
        
        if (locationCell) {
          const locationSpan = locationCell.querySelector('span'); // Location name is within a span
          const locationName = locationSpan ? locationSpan.innerText.trim() : locationCell.innerText.trim();
          
          if (!locationName) continue;
          
          let cleanLocationName = locationName;
            // Standardize location names
            if (locationName.toLowerCase().includes('tea co')) cleanLocationName = 'TEA Co';
            else if (locationName.toLowerCase().includes('caf')) cleanLocationName = 'The CAF';
            else if (locationName.toLowerCase().includes('einstein')) cleanLocationName = 'Einstein Bros Bagels';
            else if (locationName.toLowerCase().includes('roscoe')) cleanLocationName = "Roscoe's Den";
            else if (locationName.toLowerCase().includes('starbucks')) cleanLocationName = 'Starbucks';
            else if (locationName.toLowerCase().includes('chick')) cleanLocationName = 'Chick-Fil-A';
            else if (locationName.toLowerCase().includes('subway')) cleanLocationName = 'Subway';
            else if (locationName.toLowerCase().includes('taco')) cleanLocationName = 'Tu Taco';
            else if (locationName.toLowerCase().includes('ranch')) cleanLocationName = 'Ranch Smokehouse';
            else if (locationName.toLowerCase().includes('market')) cleanLocationName = 'Market';
            else if (locationName.toLowerCase().includes('sushi')) cleanLocationName = 'Sushi';

          if (!diningData[cleanLocationName]) {
            diningData[cleanLocationName] = {};
          }
          
          const dayCells = row.querySelectorAll('td[data-label]');
          dayCells.forEach(cell => {
            const dataLabel = cell.getAttribute('data-label');
            if (dataLabel.toLowerCase() === 'location') return; // Skip the location cell itself

            let dayName = '';
            if (dataLabel.toLowerCase().includes('sun')) dayName = 'Sunday';
            else if (dataLabel.toLowerCase().includes('mon')) dayName = 'Monday';
            else if (dataLabel.toLowerCase().includes('tue')) dayName = 'Tuesday';
            else if (dataLabel.toLowerCase().includes('wed')) dayName = 'Wednesday';
            else if (dataLabel.toLowerCase().includes('thu')) dayName = 'Thursday';
            else if (dataLabel.toLowerCase().includes('fri')) dayName = 'Friday';
            else if (dataLabel.toLowerCase().includes('sat')) dayName = 'Saturday';
            
            if (dayName) {
              let hoursText = '';
              const closedSpan = cell.querySelector('span[class*="closed"]');
              if (closedSpan) {
                hoursText = 'Closed';
              } else {
                let timeStrings = [];
                const allText = cell.innerText.trim();
                const timePattern = /\d{1,2}:\d{2}[ap]\s*-\s*\d{1,2}:\d{2}[ap]/g;
                let match;
                while ((match = timePattern.exec(allText)) !== null) {
                  timeStrings.push(match[0]);
                }
                if (timeStrings.length === 0) {
                  const singleTimePattern = /\d{1,2}:\d{2}[ap]/g;
                  const singleTimes = [];
                  while ((match = singleTimePattern.exec(allText)) !== null) {
                    singleTimes.push(match[0]);
                  }
                  if (singleTimes.length >= 2) {
                    for (let i = 0; i < singleTimes.length; i += 2) {
                      if (singleTimes[i + 1]) {
                        timeStrings.push(`${singleTimes[i]} - ${singleTimes[i + 1]}`);
                      }
                    }
                  } else if (singleTimes.length === 1) {
                    timeStrings.push(singleTimes[0]);
                  }
                }
                if (timeStrings.length > 0) {
                  hoursText = timeStrings.join(', ');
                } else {
                  if (allText.toLowerCase().includes('closed') || allText.trim() === '') {
                    hoursText = 'Closed';
                  } else {
                    const meaningfulText = allText.replace(/\s+/g, ' ').trim();
                    if (meaningfulText && !meaningfulText.toLowerCase().includes('location')) {
                      hoursText = meaningfulText;
                    } else {
                      hoursText = 'See website';
                    }
                  }
                }
              }
              
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
      
      let result = '';
      const locationsWithData = Object.keys(diningData).filter(name => 
        Object.keys(diningData[name]).length > 0
      );
      
      if (locationsWithData.length === 0) {
          return 'No dining data parsed from table, even though table structure was found.';
      }

      for (let location of locationsWithData) {
        result += `${location}:\n`;
        const dayOrder = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        for (let day of dayOrder) {
          const hours = diningData[location][day] || 'Not available';
          result += `${day}: ${hours}\n`;
        }
        result += '\n';
      }
      console.log('Formatted dining data from evaluate:', JSON.stringify(result));
      return result.trim();
    });
    
    console.log('Raw dining hours content from fetchDiningHours:', hoursContent);
    return hoursContent || 'Dining hours could not be loaded or parsed.';
    
  } catch (error) {
    console.error('Error fetching dining hours:', error);
    return 'Error loading dining hours. Please check the website directly.';
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

async function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  win.loadFile('index.html');

  // Show loading message first
  win.webContents.on('did-finish-load', () => {
    win.webContents.send('hours', { 
      libraryHours: 'Loading library hours...', 
      gymHours: 'Loading gym hours...',
      diningHours: 'Loading dining hours...'
    });
  });

  // Fetch hours data in parallel
  try {
    const [libraryHours, gymHours, diningHours] = await Promise.all([
      fetchLibraryHours(),
      fetchGymHours(),
      fetchDiningHours()
    ]);

    // Send the actual data once loaded
    win.webContents.send('hours', { libraryHours, gymHours, diningHours });
  } catch (error) {
    console.error('Error fetching hours:', error);
    win.webContents.send('hours', { 
      libraryHours: 'Error loading library hours', 
      gymHours: 'Error loading gym hours',
      diningHours: 'Error loading dining hours'
    });
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
}); 