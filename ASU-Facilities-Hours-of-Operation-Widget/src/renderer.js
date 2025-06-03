const { ipcRenderer } = require('electron');

// Helper function to format hours for display
function formatHoursForDisplay(hoursText) {
  if (!hoursText || hoursText.includes('Loading') || hoursText.includes('Error')) {
    return hoursText;
  }
  
  console.log('Raw hours text received:', hoursText);
  
  // Clean up the text first but preserve line breaks
  let cleanText = hoursText
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/\r/g, '\n')   // Normalize line endings
    .trim();
  
  console.log('Cleaned text:', cleanText);
  
  let formattedHtml = '';
  
  // Check if this contains multiple facilities (structured format from main.js)
  if (cleanText.includes('CHP') || cleanText.includes('Swimming Pool') || cleanText.includes('Climbing') || cleanText.includes('Lake House') || cleanText.includes('Intramural')) {
    
    console.log('Detected gym facilities data');
    
    // Parse the structured format: "Facility:\nDay: Hours\nDay: Hours\n\n"
    const facilityBlocks = cleanText.split('\n\n').filter(block => block.trim());
    
    console.log('Facility blocks found:', facilityBlocks.length, facilityBlocks);
    
    // If we have facility blocks, parse them directly
    if (facilityBlocks.length > 0) {
      let facilities = {};
      
      for (let block of facilityBlocks) {
        const lines = block.split('\n').filter(line => line.trim());
        if (lines.length === 0) continue;
        
        // First line should be the facility name (ending with :)
        const facilityLine = lines[0];
        if (!facilityLine.includes(':')) continue;
        
        const facilityName = facilityLine.replace(':', '').trim();
        facilities[facilityName] = {};
        
        // Process the day:hours lines
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line.includes(':')) {
            const colonIndex = line.indexOf(':');
            const day = line.substring(0, colonIndex).trim();
            const hours = line.substring(colonIndex + 1).trim();
            facilities[facilityName][day] = hours;
          }
        }
      }
      
      console.log('Parsed facilities from blocks:', facilities);
      
      // Generate tabbed interface
      const facilitiesWithData = Object.keys(facilities).filter(name => Object.keys(facilities[name]).length > 0);
      
      console.log('Facilities with data:', facilitiesWithData);
      
      if (facilitiesWithData.length > 0) {
        // Create tabs
        formattedHtml += '<div class="facility-tabs gym-tabs">';
        facilitiesWithData.forEach((facilityName, index) => {
          const tabId = facilityName.toLowerCase().replace(/[^a-z0-9]/g, '-');
          const shortName = facilityName.replace(' (Fitness Center)', '').replace(' Complex', '');
          const isActive = index === 0 ? 'active' : '';
          formattedHtml += `
            <div class="facility-tab ${isActive}" data-facility="gym-${tabId}" data-group="gym">
              ${shortName}
            </div>
          `;
        });
        formattedHtml += '</div>';
        
        // Create content for each facility
        facilitiesWithData.forEach((facilityName, index) => {
          const tabId = facilityName.toLowerCase().replace(/[^a-z0-9]/g, '-');
          const isActive = index === 0 ? 'active' : '';
          const facilityData = facilities[facilityName];
          
          formattedHtml += `
            <div class="facility-content ${isActive}" id="gym-${tabId}" data-group="gym">
              <div class="facility-section">
                <h3 class="facility-name">${facilityName}</h3>
                <div class="facility-hours">
          `;
          
          const dayOrder = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          for (let day of dayOrder) {
            const hours = facilityData[day] || 'Not available';
            formattedHtml += `
              <div class="hours-row">
                <span class="day-name">${day}</span>
                <span class="hours-time">${hours}</span>
              </div>
            `;
          }
          
          formattedHtml += `
                </div>
              </div>
            </div>
          `;
        });
        
        console.log('Generated tabbed HTML from blocks');
        return formattedHtml;
      }
    }
    
    // If the above parsing didn't work, try alternative parsing for the messy format
    if (!formattedHtml) {
      console.log('Block parsing failed, trying alternative method');
      
      // Handle the case where all data is in one line but contains facility names
      const facilityNames = ['CHP (Fitness Center)', 'Swimming Pool', 'Climbing Gym', 'Lake House', 'Intramural Complex'];
      let currentFacility = '';
      let facilities = {};
      
      // Initialize facilities
      facilityNames.forEach(name => {
        facilities[name] = {};
      });
      
      // Split by facility names and parse
      let remainingText = cleanText;
      
      for (let facilityName of facilityNames) {
        const facilityIndex = remainingText.indexOf(facilityName);
        if (facilityIndex !== -1) {
          // Find the next facility or end of string
          let nextFacilityIndex = remainingText.length;
          for (let otherFacility of facilityNames) {
            if (otherFacility !== facilityName) {
              const otherIndex = remainingText.indexOf(otherFacility, facilityIndex + facilityName.length);
              if (otherIndex !== -1 && otherIndex < nextFacilityIndex) {
                nextFacilityIndex = otherIndex;
              }
            }
          }
          
          // Extract the text for this facility
          const facilityText = remainingText.substring(facilityIndex + facilityName.length, nextFacilityIndex);
          
          console.log(`Facility: ${facilityName}, Text: ${facilityText}`);
          
          // Parse day:hour pairs from this facility's text
          const dayPattern = /(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday):\s*([^A-Z]*?)(?=\s*(?:Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday):|$)/g;
          let match;
          
          while ((match = dayPattern.exec(facilityText)) !== null) {
            const day = match[1];
            const hours = match[2].trim();
            facilities[facilityName][day] = hours;
            console.log(`Parsed: ${day} = ${hours}`);
          }
        }
      }
      
      console.log('Parsed facilities data:', facilities);
      
      // Generate tabbed interface for facilities that have data
      const facilitiesWithData = facilityNames.filter(name => Object.keys(facilities[name]).length > 0);
      
      console.log('Facilities with data:', facilitiesWithData);
      
      if (facilitiesWithData.length > 0) {
        // Create tabs
        formattedHtml += '<div class="facility-tabs gym-tabs">';
        facilitiesWithData.forEach((facilityName, index) => {
          const tabId = facilityName.toLowerCase().replace(/[^a-z0-9]/g, '-');
          const shortName = facilityName.replace(' (Fitness Center)', '').replace(' Complex', '');
          const isActive = index === 0 ? 'active' : '';
          formattedHtml += `
            <div class="facility-tab ${isActive}" data-facility="gym-${tabId}" data-group="gym">
              ${shortName}
            </div>
          `;
        });
        formattedHtml += '</div>';
        
        // Create content for each facility
        facilitiesWithData.forEach((facilityName, index) => {
          const tabId = facilityName.toLowerCase().replace(/[^a-z0-9]/g, '-');
          const isActive = index === 0 ? 'active' : '';
          const facilityData = facilities[facilityName];
          
          formattedHtml += `
            <div class="facility-content ${isActive}" id="gym-${tabId}" data-group="gym">
              <div class="facility-section">
                <h3 class="facility-name">${facilityName}</h3>
                <div class="facility-hours">
          `;
          
          const dayOrder = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          for (let day of dayOrder) {
            const hours = facilityData[day] || 'Not available';
            formattedHtml += `
              <div class="hours-row">
                <span class="day-name">${day}</span>
                <span class="hours-time">${hours}</span>
              </div>
            `;
          }
          
          formattedHtml += `
                </div>
              </div>
            </div>
          `;
        });
        
        console.log('Generated tabbed HTML');
      }
    }
    
    if (formattedHtml) {
      console.log('Returning formatted HTML for gym facilities');
      return formattedHtml;
    }
  }
  
  // Check for dining locations (TEA Co, The CAF, Einstein Bros, etc.)
  if (cleanText.includes('TEA Co:') || cleanText.includes('The CAF:') || cleanText.includes('Einstein:') || 
      cleanText.includes('Starbucks:') || cleanText.includes('Chick-Fil-A:') || cleanText.includes('Subway:') ||
      cleanText.includes('Tu Taco:') || cleanText.includes('Ranch Smokehouse:') || cleanText.includes('Market:') ||
      cleanText.includes('Sushi:') || cleanText.includes("Roscoe's Den:")) {
    
    console.log('Detected dining locations data');
    
    // Try to parse dining locations
    const diningBlocks = cleanText.split('\n\n').filter(block => block.trim());
    
    console.log('Dining blocks found:', diningBlocks.length, diningBlocks);
    
    if (diningBlocks.length > 1) {
      let diningLocations = {};
      
      for (let block of diningBlocks) {
        const lines = block.split('\n').filter(line => line.trim());
        if (lines.length === 0) continue;
        
        // Look for location headers
        const firstLine = lines[0];
        let locationName = '';
        
        // Check if first line looks like a location header
        if (firstLine.includes('TEA Co:') || firstLine.includes('The CAF:') || 
            firstLine.includes('Einstein:') || firstLine.includes('Starbucks:') ||
            firstLine.includes('Chick-Fil-A:') || firstLine.includes('Subway:') ||
            firstLine.includes('Tu Taco:') || firstLine.includes('Ranch Smokehouse:') ||
            firstLine.includes('Market:') || firstLine.includes('Sushi:') ||
            firstLine.includes("Roscoe's Den:")) {
          locationName = firstLine.replace(':', '').trim();
        }
        
        if (locationName) {
          diningLocations[locationName] = {};
          
          // Process the remaining lines for day:hours
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.includes(':')) {
              const colonIndex = line.indexOf(':');
              const beforeColon = line.substring(0, colonIndex).trim();
              const afterColon = line.substring(colonIndex + 1).trim();
              
              // Check if before colon looks like a day
              const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
              const isDay = dayNames.some(day => beforeColon.toLowerCase().includes(day.toLowerCase()));
              
              if (isDay) {
                // Map short day names to full names
                let fullDay = beforeColon;
                if (beforeColon.toLowerCase().includes('mon')) fullDay = 'Monday';
                else if (beforeColon.toLowerCase().includes('tue')) fullDay = 'Tuesday';
                else if (beforeColon.toLowerCase().includes('wed')) fullDay = 'Wednesday';
                else if (beforeColon.toLowerCase().includes('thu')) fullDay = 'Thursday';
                else if (beforeColon.toLowerCase().includes('fri')) fullDay = 'Friday';
                else if (beforeColon.toLowerCase().includes('sat')) fullDay = 'Saturday';
                else if (beforeColon.toLowerCase().includes('sun')) fullDay = 'Sunday';
                
                diningLocations[locationName][fullDay] = afterColon;
              }
            }
          }
        }
      }
      
      console.log('Parsed dining locations:', diningLocations);
      
      // Generate tabbed interface for dining locations that have data
      const locationsWithData = Object.keys(diningLocations).filter(name => Object.keys(diningLocations[name]).length > 0);
      
      console.log('Dining locations with data:', locationsWithData);
      
      if (locationsWithData.length > 1) {
        // Create tabs for multiple locations
        formattedHtml += '<div class="facility-tabs dining-tabs">';
        locationsWithData.forEach((locationName, index) => {
          const tabId = locationName.toLowerCase().replace(/[^a-z0-9]/g, '-');
          let shortName = locationName;
          
          // Create shorter tab names
          if (locationName === 'TEA Co') shortName = 'TEA Co';
          else if (locationName === 'The CAF') shortName = 'CAF';
          else if (locationName.includes('Einstein')) shortName = 'Einstein';
          else if (locationName === 'Starbucks') shortName = 'Starbucks';
          else if (locationName === 'Chick-Fil-A') shortName = 'Chick-Fil-A';
          else if (locationName === 'Subway') shortName = 'Subway';
          else if (locationName === 'Tu Taco') shortName = 'Tu Taco';
          else if (locationName.includes('Ranch')) shortName = 'Ranch';
          else if (locationName === 'Market') shortName = 'Market';
          else if (locationName === 'Sushi') shortName = 'Sushi';
          else if (locationName.includes('Roscoe')) shortName = "Roscoe's";
          
          const isActive = index === 0 ? 'active' : '';
          formattedHtml += `
            <div class="facility-tab ${isActive}" data-facility="dining-${tabId}" data-group="dining">
              ${shortName}
            </div>
          `;
        });
        formattedHtml += '</div>';
        
        // Create content for each location
        locationsWithData.forEach((locationName, index) => {
          const tabId = locationName.toLowerCase().replace(/[^a-z0-9]/g, '-');
          const isActive = index === 0 ? 'active' : '';
          const locationData = diningLocations[locationName];
          
          formattedHtml += `
            <div class="facility-content ${isActive}" id="dining-${tabId}" data-group="dining">
              <div class="facility-section">
                <h3 class="facility-name">${locationName}</h3>
                <div class="facility-hours">
          `;
          
          const dayOrder = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          for (let day of dayOrder) {
            const hours = locationData[day] || 'Not available';
            formattedHtml += `
              <div class="hours-row">
                <span class="day-name">${day}</span>
                <span class="hours-time">${hours}</span>
              </div>
            `;
          }
          
          formattedHtml += `
                </div>
              </div>
            </div>
          `;
        });
        
        console.log('Generated tabbed HTML for dining locations');
        return formattedHtml;
      } else if (locationsWithData.length === 1) {
        // Single location, display without tabs
        const locationName = locationsWithData[0];
        const locationData = diningLocations[locationName];
        
        formattedHtml += `
          <div class="facility-section">
            <h3 class="facility-name">${locationName}</h3>
            <div class="facility-hours">
        `;
        
        const dayOrder = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        for (let day of dayOrder) {
          const hours = locationData[day] || 'Not available';
          formattedHtml += `
            <div class="hours-row">
              <span class="day-name">${day}</span>
              <span class="hours-time">${hours}</span>
            </div>
          `;
        }
        
        formattedHtml += `
            </div>
          </div>
        `;
        
        console.log('Generated single location HTML for dining');
        return formattedHtml;
      }
    }
  }
  
  // Check for library sections (Library, IT Desk, West Texas Collection, etc.)
  if (cleanText.includes('Library:') || cleanText.includes('IT Desk:') || cleanText.includes('West Texas Collection:') || 
      cleanText.includes('Reference') || cleanText.includes('Circulation') || cleanText.includes('Special Collections')) {
    
    console.log('Detected library sections data');
    
    // Try to parse library sections
    const libraryBlocks = cleanText.split('\n\n').filter(block => block.trim());
    
    console.log('Library blocks found:', libraryBlocks.length, libraryBlocks);
    
    if (libraryBlocks.length > 1) {
      let librarySections = {};
      
      for (let block of libraryBlocks) {
        const lines = block.split('\n').filter(line => line.trim());
        if (lines.length === 0) continue;
        
        // Look for section headers
        const firstLine = lines[0];
        let sectionName = '';
        
        // Check if first line looks like a section header
        if (firstLine.includes('Library:') || firstLine.includes('IT Desk:') || 
            firstLine.includes('West Texas Collection:') || firstLine.includes('Reference') ||
            firstLine.includes('Circulation') || firstLine.includes('Special Collections') ||
            firstLine.includes('Main Library') || firstLine.includes('Department')) {
          sectionName = firstLine.replace(':', '').trim();
        } else if (lines.length > 1 && lines[0].length < 50 && !lines[0].includes(':')) {
          // Short first line might be a section header
          sectionName = lines[0].trim();
        }
        
        if (sectionName) {
          librarySections[sectionName] = {};
          
          // Process the remaining lines for day:hours
          const startIndex = sectionName === lines[0] ? 1 : 0;
          for (let i = startIndex; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.includes(':')) {
              const colonIndex = line.indexOf(':');
              const beforeColon = line.substring(0, colonIndex).trim();
              const afterColon = line.substring(colonIndex + 1).trim();
              
              // Check if before colon looks like a day
              const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
              const isDay = dayNames.some(day => beforeColon.toLowerCase().includes(day.toLowerCase()));
              
              if (isDay) {
                // Map short day names to full names
                let fullDay = beforeColon;
                if (beforeColon.toLowerCase().includes('mon')) fullDay = 'Monday';
                else if (beforeColon.toLowerCase().includes('tue')) fullDay = 'Tuesday';
                else if (beforeColon.toLowerCase().includes('wed')) fullDay = 'Wednesday';
                else if (beforeColon.toLowerCase().includes('thu')) fullDay = 'Thursday';
                else if (beforeColon.toLowerCase().includes('fri')) fullDay = 'Friday';
                else if (beforeColon.toLowerCase().includes('sat')) fullDay = 'Saturday';
                else if (beforeColon.toLowerCase().includes('sun')) fullDay = 'Sunday';
                
                librarySections[sectionName][fullDay] = afterColon;
              }
            }
          }
        }
      }
      
      console.log('Parsed library sections:', librarySections);
      
      // Generate tabbed interface for library sections that have data
      const sectionsWithData = Object.keys(librarySections).filter(name => Object.keys(librarySections[name]).length > 0);
      
      console.log('Library sections with data:', sectionsWithData);
      
      if (sectionsWithData.length > 1) {
        // Create tabs for multiple sections
        formattedHtml += '<div class="facility-tabs library-tabs">';
        sectionsWithData.forEach((sectionName, index) => {
          const tabId = sectionName.toLowerCase().replace(/[^a-z0-9]/g, '-');
          let shortName = sectionName;
          
          // Create shorter tab names
          if (sectionName === 'Library') shortName = 'Library';
          else if (sectionName === 'IT Desk') shortName = 'IT Desk';
          else if (sectionName === 'West Texas Collection') shortName = 'West Texas';
          else if (sectionName.includes('Reference')) shortName = 'Reference';
          else if (sectionName.includes('Circulation')) shortName = 'Circulation';
          else if (sectionName.includes('Special Collections')) shortName = 'Special';
          else shortName = sectionName.replace('Library', '').replace('Hours', '').trim() || sectionName;
          
          const isActive = index === 0 ? 'active' : '';
          formattedHtml += `
            <div class="facility-tab ${isActive}" data-facility="library-${tabId}" data-group="library">
              ${shortName}
            </div>
          `;
        });
        formattedHtml += '</div>';
        
        // Create content for each section
        sectionsWithData.forEach((sectionName, index) => {
          const tabId = sectionName.toLowerCase().replace(/[^a-z0-9]/g, '-');
          const isActive = index === 0 ? 'active' : '';
          const sectionData = librarySections[sectionName];
          
          formattedHtml += `
            <div class="facility-content ${isActive}" id="library-${tabId}" data-group="library">
              <div class="facility-section">
                <h3 class="facility-name">${sectionName}</h3>
                <div class="facility-hours">
          `;
          
          const dayOrder = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          for (let day of dayOrder) {
            const hours = sectionData[day] || 'Not available';
            formattedHtml += `
              <div class="hours-row">
                <span class="day-name">${day}</span>
                <span class="hours-time">${hours}</span>
              </div>
            `;
          }
          
          formattedHtml += `
                </div>
              </div>
            </div>
          `;
        });
        
        console.log('Generated tabbed HTML for library sections');
        return formattedHtml;
      } else if (sectionsWithData.length === 1) {
        // Single section, display without tabs
        const sectionName = sectionsWithData[0];
        const sectionData = librarySections[sectionName];
        
        formattedHtml += `
          <div class="facility-section">
            <h3 class="facility-name">${sectionName}</h3>
            <div class="facility-hours">
        `;
        
        const dayOrder = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        for (let day of dayOrder) {
          const hours = sectionData[day] || 'Not available';
          formattedHtml += `
            <div class="hours-row">
              <span class="day-name">${day}</span>
              <span class="hours-time">${hours}</span>
            </div>
          `;
        }
        
        formattedHtml += `
            </div>
          </div>
        `;
        
        console.log('Generated single section HTML for library');
        return formattedHtml;
      }
    }
  }
  
  // Fallback to original parsing for single facility or different format (like library)
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const shortDayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  let foundStructuredData = false;
  
  // Split by lines and process each
  const lines = cleanText.split('\n').filter(line => line.trim());
  
  for (let line of lines) {
    line = line.trim();
    if (!line) continue;
    
    // Check if this line contains day and time information
    let dayFound = false;
    
    // Look for full day names
    for (let day of dayNames) {
      if (line.toLowerCase().includes(day.toLowerCase())) {
        const dayIndex = line.toLowerCase().indexOf(day.toLowerCase());
        const afterDay = line.substring(dayIndex + day.length).trim();
        
        let timeInfo = afterDay.replace(/^[:\-–—\s]+/, '').trim();
        
        if (timeInfo.length < 3) {
          timeInfo = 'See details';
        }
        
        formattedHtml += `
          <div class="hours-row">
            <span class="day-name">${day}</span>
            <span class="hours-time">${timeInfo}</span>
          </div>
        `;
        foundStructuredData = true;
        dayFound = true;
        break;
      }
    }
    
    // Check for short day names if full names weren't found
    if (!dayFound) {
      for (let day of shortDayNames) {
        if (line.toLowerCase().includes(day.toLowerCase())) {
          const dayIndex = line.toLowerCase().indexOf(day.toLowerCase());
          const afterDay = line.substring(dayIndex + day.length).trim();
          let timeInfo = afterDay.replace(/^[:\-–—\s]+/, '').trim();
          
          if (timeInfo.length < 3) {
            timeInfo = 'See details';
          }
          
          const fullDayName = dayNames[shortDayNames.indexOf(day)];
          
          formattedHtml += `
            <div class="hours-row">
              <span class="day-name">${fullDayName}</span>
              <span class="hours-time">${timeInfo}</span>
            </div>
          `;
          foundStructuredData = true;
          dayFound = true;
          break;
        }
      }
    }
    
    // If no day was found but line contains time-like information, show as general info
    if (!dayFound && (line.includes(':') || line.toLowerCase().includes('hour') || line.toLowerCase().includes('open') || line.toLowerCase().includes('close'))) {
      formattedHtml += `<div class="hours-info">${line}</div>`;
    }
  }
  
  // If no structured data was found, try a different approach
  if (!foundStructuredData) {
    const rangePattern = /(Monday|Mon)\s*[-–—]\s*(Friday|Fri|Sunday|Sun)/i;
    const timePattern = /\d{1,2}:\d{2}\s*(AM|PM|am|pm)/g;
    
    for (let line of lines) {
      if (rangePattern.test(line) || timePattern.test(line)) {
        formattedHtml += `<div class="hours-info">${line}</div>`;
        foundStructuredData = true;
      }
    }
  }
  
  // Fallback: if still no structured data, show the original text but cleaned up
  if (!foundStructuredData) {
    formattedHtml = `<div class="hours-info">${cleanText}</div>`;
  }
  
  return formattedHtml;
}

// Listen for hours data from main process
ipcRenderer.on('hours', (event, data) => {
  console.log('Received hours data in renderer:', data);
  
  // Update library hours
  const libraryContainer = document.getElementById('library-hours');
  if (data.libraryHours) {
    if (data.libraryHours.includes('Loading') || data.libraryHours.includes('Error')) {
      if (data.libraryHours.includes('Loading')) {
        libraryContainer.innerHTML = `
          <div class="loading">
            <div class="loading-spinner"></div>
            ${data.libraryHours}
          </div>
        `;
      } else {
        libraryContainer.innerHTML = `<div class="error">${data.libraryHours}</div>`;
      }
    } else {
      const formattedLibraryHours = formatHoursForDisplay(data.libraryHours);
      libraryContainer.innerHTML = formattedLibraryHours + `
        <a href="https://www.angelo.edu/library/hours.php" target="_blank" class="website-link">
          View on Library Website
        </a>
      `;
      
      // Setup tabs for library after content is loaded
      setTimeout(() => setupFacilityTabs(), 100);
    }
  }
  
  // Update gym hours
  const gymContainer = document.getElementById('gym-hours');
  if (data.gymHours) {
    if (data.gymHours.includes('Loading') || data.gymHours.includes('Error')) {
      if (data.gymHours.includes('Loading')) {
        gymContainer.innerHTML = `
          <div class="loading">
            <div class="loading-spinner"></div>
            ${data.gymHours}
          </div>
        `;
      } else {
        gymContainer.innerHTML = `<div class="error">${data.gymHours}</div>`;
      }
    } else {
      // For gym hours, don't use formatHoursText since it's already structured
      const formattedGymHours = formatHoursForDisplay(data.gymHours);
      gymContainer.innerHTML = formattedGymHours + `
        <a href="https://www.angelo.edu/life-on-campus/play/university-recreation/urec-hours-of-operation.php" target="_blank" class="website-link">
          View on Recreation Website
        </a>
      `;
      
      // Setup tabs for gym after content is loaded
      setTimeout(() => setupFacilityTabs(), 100);
    }
  }
  
  // Update dining hours
  const diningContainer = document.getElementById('dining-hours');
  if (data.diningHours) {
    if (data.diningHours.includes('Loading') || data.diningHours.includes('Error')) {
      if (data.diningHours.includes('Loading')) {
        diningContainer.innerHTML = `
          <div class="loading">
            <div class="loading-spinner"></div>
            ${data.diningHours}
          </div>
        `;
      } else {
        diningContainer.innerHTML = `<div class="error">${data.diningHours}</div>`;
      }
    } else {
      // For dining hours, don't use formatHoursText since it's already structured
      const formattedDiningHours = formatHoursForDisplay(data.diningHours);
      diningContainer.innerHTML = formattedDiningHours + `
        <a href="https://dineoncampus.com/Angelo/hours-of-operation" target="_blank" class="website-link">
          View on Dining Website
        </a>
      `;
      
      // Setup tabs for dining after content is loaded
      setTimeout(() => setupFacilityTabs(), 100);
    }
  }
});

// Function to handle facility tab switching
function setupFacilityTabs() {
  console.log('Setting up facility tabs');
  
  // Handle all tab groups (gym, library, dining)
  const tabGroups = ['gym', 'library', 'dining'];
  
  tabGroups.forEach(group => {
    const tabs = document.querySelectorAll(`.facility-tab[data-group="${group}"]`);
    
    tabs.forEach(tab => {
      tab.addEventListener('click', function() {
        const facilityId = this.getAttribute('data-facility');
        const tabGroup = this.getAttribute('data-group');
        
        console.log(`Clicked tab: ${facilityId} in group: ${tabGroup}`);
        
        // Remove active class from all tabs in this group
        const groupTabs = document.querySelectorAll(`.facility-tab[data-group="${tabGroup}"]`);
        groupTabs.forEach(t => t.classList.remove('active'));
        
        // Remove active class from all content in this group
        const groupContent = document.querySelectorAll(`.facility-content[data-group="${tabGroup}"]`);
        groupContent.forEach(c => c.classList.remove('active'));
        
        // Add active class to clicked tab
        this.classList.add('active');
        
        // Show corresponding content
        const content = document.getElementById(facilityId);
        if (content) {
          content.classList.add('active');
          console.log(`Activated content: ${facilityId}`);
        } else {
          console.log(`Content not found: ${facilityId}`);
        }
      });
    });
  });
} 