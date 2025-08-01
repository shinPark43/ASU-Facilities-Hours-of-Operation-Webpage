const express = require('express');
const router = express.Router();
const db = require('../database');

// Cache for formatted results
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Helper function to format time range
function formatTimeRange(hour) {
  if (hour.is_closed) return 'Closed';
  
  let timeString = '';
  if (hour.open_time && hour.close_time) {
    timeString = `${hour.open_time} - ${hour.close_time}`;
  } else if (hour.open_time) {
    timeString = hour.open_time;
  } else {
    timeString = 'Hours not available';
  }
  
  // Add route information for Ram Tram
  if (hour.route && hour.route !== '') {
    return {
      time: timeString,
      route: hour.route
    };
  }
  
  return timeString;
}

// Helper function to get latest update timestamp
function getLatestUpdate(current, newUpdate) {
  if (!current || newUpdate > current) {
    return newUpdate;
  }
  return current;
}

// Optimized helper function to format hours data for frontend - O(n) complexity
function formatHoursForFrontend(rawHours) {
  if (!rawHours || rawHours.length === 0) {
    return {};
  }

  const facility = {
    name: rawHours[0].facility_name,
    type: rawHours[0].facility_type,
    description: rawHours[0].description,
    website_url: rawHours[0].website_url,
    sections: {},
    last_updated: null
  };

  // Use Map for O(1) lookups instead of nested objects
  const timeRangesBySection = new Map();
  
  // Single pass O(n) processing
  rawHours.forEach(hour => {
    if (!hour.section_name) return;
    
    const sectionKey = `${hour.section_name}:${hour.day_of_week}`;
    if (!timeRangesBySection.has(sectionKey)) {
      timeRangesBySection.set(sectionKey, []);
    }
    
    const timeRange = formatTimeRange(hour);
    timeRangesBySection.get(sectionKey).push(timeRange);
    
    facility.last_updated = getLatestUpdate(facility.last_updated, hour.updated_at);
  });

  // Build final sections structure efficiently
  timeRangesBySection.forEach((timeRanges, sectionKey) => {
    const [sectionName, dayName] = sectionKey.split(':');
    
    if (!facility.sections[sectionName]) {
      facility.sections[sectionName] = {};
    }
    
    // Remove duplicates and filter invalid entries
    const uniqueRanges = [...new Set(timeRanges)].filter(range => range && (typeof range === 'string' ? range.trim() !== '' : true));
    
    if (uniqueRanges.includes('Closed')) {
      facility.sections[sectionName][dayName] = 'Closed';
    } else if (uniqueRanges.length === 0) {
      facility.sections[sectionName][dayName] = 'Hours not available';
    } else if (uniqueRanges.length === 1) {
      const range = uniqueRanges[0];
      // Check if this is a route object (for Ram Tram)
      if (typeof range === 'object' && range.time && range.route) {
        facility.sections[sectionName][dayName] = range;
      } else {
        facility.sections[sectionName][dayName] = range;
      }
    } else {
      // Multiple time ranges - join with line breaks for display
      facility.sections[sectionName][dayName] = uniqueRanges.join('\n');
    }
  });

  return facility;
}

// Generic route handler with caching
async function getFacilityHoursHandler(req, res, facilityType) {
  // Create cache key based on facility type and time window
  const cacheKey = `${facilityType}:${Math.floor(Date.now() / CACHE_TTL)}`;
  
  // Check cache first
  if (cache.has(cacheKey)) {
    return res.json({
      success: true,
      data: cache.get(cacheKey),
      cached: true
    });
  }

  try {
    const rawHours = await db.getFacilityHours(facilityType);
    const facility = formatHoursForFrontend(rawHours);
    
    // Store in cache
    cache.set(cacheKey, facility);
    
    // Clean up old cache entries to prevent memory leaks
    if (cache.size > 50) {
      const oldestKey = cache.keys().next().value;
      cache.delete(oldestKey);
    }
    
    res.json({
      success: true,
      data: facility,
      cached: false
    });
  } catch (error) {
    console.error(`Error fetching ${facilityType} hours:`, error);
    res.status(500).json({
      success: false,
      error: `Failed to fetch ${facilityType} hours`,
      message: error.message
    });
  }
}

// GET /api/facilities - Get all facilities
router.get('/', async (req, res) => {
  try {
    const facilities = await db.getAllFacilities();
    res.json({
      success: true,
      data: facilities,
      count: facilities.length
    });
  } catch (error) {
    console.error('Error fetching facilities:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch facilities',
      message: error.message
    });
  }
});

// GET /api/facilities/library - Get library hours
router.get('/library', async (req, res) => {
  await getFacilityHoursHandler(req, res, 'library');
});

// GET /api/facilities/recreation - Get recreation center hours
router.get('/recreation', async (req, res) => {
  await getFacilityHoursHandler(req, res, 'recreation');
});

// GET /api/facilities/dining - Get dining hours
router.get('/dining', async (req, res) => {
  await getFacilityHoursHandler(req, res, 'dining');
});

// GET /api/facilities/ram_tram - Get Ram Tram hours
router.get('/ram_tram', async (req, res) => {
  await getFacilityHoursHandler(req, res, 'ram_tram');
});


// GET /api/facilities/:type - Get hours for any facility type
router.get('/:type', async (req, res) => {
  const { type } = req.params;
  const validTypes = ['library', 'recreation', 'dining', 'ram_tram'];
  
  if (!validTypes.includes(type)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid facility type',
      message: `Valid types are: ${validTypes.join(', ')}`
    });
  }

  await getFacilityHoursHandler(req, res, type);
});

// POST /api/facilities/:type/hours - Update hours for a facility (for scraper)
router.post('/:type/hours', async (req, res) => {
  try {
    const { type } = req.params;
    const { hours } = req.body;

    if (!hours || !Array.isArray(hours)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid hours data',
        message: 'Hours must be an array of hour objects'
      });
    }

    await db.updateFacilityHours(type, hours);
    
    res.json({
      success: true,
      message: `${type} hours updated successfully`,
      updated_count: hours.length
    });
  } catch (error) {
    console.error(`Error updating ${req.params.type} hours:`, error);
    res.status(500).json({
      success: false,
      error: `Failed to update ${req.params.type} hours`,
      message: error.message
    });
  }
});

// GET /api/facilities/logs/recent - Get recent scrape logs
router.get('/logs/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const logs = await db.getRecentScrapeLogs(limit);
    
    res.json({
      success: true,
      data: logs,
      count: logs.length
    });
  } catch (error) {
    console.error('Error fetching scrape logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch scrape logs',
      message: error.message
    });
  }
});

module.exports = router; 