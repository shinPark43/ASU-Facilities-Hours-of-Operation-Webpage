const express = require('express');
const router = express.Router();
const db = require('../database');
const { getScraperManager } = require('../scraper');
const requireAdminKey = require('../middleware/requireAdminKey');

// Cache for formatted results
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Cache for daily dining menu (2 hours)
const menuCache = new Map();
const MENU_CACHE_TTL = 2 * 60 * 60 * 1000;

const VALID_FACILITY_TYPES = ['library', 'recreation', 'dining', 'ram_tram', 'essentials'];

// Built-in fallback hours for ASU Campus Essentials (used if DB has no custom rows yet)
const DEFAULT_ESSENTIALS_DATA = {
  name: 'Campus Essentials',
  type: 'essentials',
  description: 'Ram Central Station Bookstore, Mail Services (Post Office), and University Health Clinic',
  website_url: 'https://www.angelo.edu/life-on-campus/',
  sections: {
    'Ram Central Station (Bookstore)': {
      Sunday: 'Closed',
      Monday: '7:30 AM - 5:30 PM',
      Tuesday: '7:30 AM - 5:30 PM',
      Wednesday: '7:30 AM - 5:30 PM',
      Thursday: '7:30 AM - 5:30 PM',
      Friday: '7:30 AM - 5:30 PM',
      Saturday: '10:00 AM - 2:00 PM',
    },
    'Mail Services (Post Office)': {
      Sunday: 'Closed',
      Monday: '8:00 AM - 5:00 PM',
      Tuesday: '8:00 AM - 5:00 PM',
      Wednesday: '8:00 AM - 5:00 PM',
      Thursday: '8:00 AM - 5:00 PM',
      Friday: '8:00 AM - 5:00 PM',
      Saturday: 'Closed',
    },
    'University Health Clinic': {
      Sunday: 'Closed',
      Monday: '8:00 AM - 5:00 PM',
      Tuesday: '8:00 AM - 5:00 PM',
      Wednesday: '8:00 AM - 5:00 PM',
      Thursday: '8:00 AM - 5:00 PM',
      Friday: '8:00 AM - 5:00 PM',
      Saturday: 'Closed',
    },
  },
  metadata: {
    'Ram Central Station (Bookstore)': {
      location: 'First Floor, Houston Harte University Center',
      note: 'Textbooks, Ram gear, school supplies & tech',
      url: 'https://www.angelo.edu/life-on-campus/live/university-center/',
    },
    'Mail Services (Post Office)': {
      location: 'First Floor (South of Tower), Houston Harte University Center',
      note: 'Window service M–F; student mailbox lobby accessible 24/7',
      url: 'https://www.angelo.edu/life-on-campus/live/mail-services/',
    },
    'University Health Clinic': {
      location: '2237 S. Jackson St. (Shannon Student Clinic)',
      note: '24/7 Shannon Nurse Help Line: (325) 481-2002',
      url: 'https://www.angelo.edu/life-on-campus/live/health-clinic/',
    },
  },
  last_updated: null,
};

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
      route: hour.route,
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
    last_updated: null,
  };

  // Use Map for O(1) lookups instead of nested objects
  const timeRangesBySection = new Map();

  // Single pass O(n) processing
  rawHours.forEach((hour) => {
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
    const splitIdx = sectionKey.lastIndexOf(':');
    const sectionName = sectionKey.slice(0, splitIdx);
    const dayName = sectionKey.slice(splitIdx + 1);

    if (!facility.sections[sectionName]) {
      facility.sections[sectionName] = {};
    }

    // Remove duplicates and filter invalid entries
    const uniqueRanges = [...new Set(timeRanges)].filter(
      (range) => range && (typeof range === 'string' ? range.trim() !== '' : true)
    );

    if (uniqueRanges.includes('Closed')) {
      facility.sections[sectionName][dayName] = 'Closed';
    } else if (uniqueRanges.length === 0) {
      facility.sections[sectionName][dayName] = 'Hours not available';
    } else if (uniqueRanges.length === 1) {
      facility.sections[sectionName][dayName] = uniqueRanges[0];
    } else {
      // Multiple time ranges - join with line breaks for display
      facility.sections[sectionName][dayName] = uniqueRanges.join('\n');
    }
  });

  return facility;
}

function invalidateFacilityCache(facilityType) {
  for (const key of cache.keys()) {
    if (key.startsWith(`${facilityType}:`)) {
      cache.delete(key);
    }
  }
}

// Generic route handler with caching
async function getFacilityHoursHandler(req, res, facilityType) {
  const cacheKey = `${facilityType}:${Math.floor(Date.now() / CACHE_TTL)}`;

  if (cache.has(cacheKey)) {
    return res.json({
      success: true,
      data: cache.get(cacheKey),
      cached: true,
    });
  }

  try {
    const rawHours = await db.getFacilityHours(facilityType);
    let facility = formatHoursForFrontend(rawHours);

    // If essentials has no rows in SQLite yet, serve built-in ASU Campus Essentials hours
    if (facilityType === 'essentials' && (!facility.sections || Object.keys(facility.sections).length === 0)) {
      facility = { ...DEFAULT_ESSENTIALS_DATA };
    } else if (facilityType === 'essentials') {
      facility.metadata = DEFAULT_ESSENTIALS_DATA.metadata;
    }

    cache.set(cacheKey, facility);

    if (cache.size > 50) {
      const oldestKey = cache.keys().next().value;
      cache.delete(oldestKey);
    }

    res.json({
      success: true,
      data: facility,
      cached: false,
    });
  } catch (error) {
    console.error(`Error fetching ${facilityType} hours:`, error);
    res.status(500).json({
      success: false,
      error: `Failed to fetch ${facilityType} hours`,
      message: error.message,
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
      count: facilities.length,
    });
  } catch (error) {
    console.error('Error fetching facilities:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch facilities',
      message: error.message,
    });
  }
});

// GET /api/facilities/logs/recent - Get recent scrape logs (declared before /:type)
router.get('/logs/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const logs = await db.getRecentScrapeLogs(limit);

    res.json({
      success: true,
      data: logs,
      count: logs.length,
    });
  } catch (error) {
    console.error('Error fetching scrape logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch scrape logs',
      message: error.message,
    });
  }
});

// GET /api/facilities/dining/menu - Get today's daily menu from DineOnCampus (declared before /:type)
router.get('/dining/menu', async (req, res) => {
  const venue = String(req.query.venue || 'the-caf').replace(/[^a-z0-9-]/gi, '').toLowerCase() || 'the-caf';
  const cacheKey = `menu:${venue}:${Math.floor(Date.now() / MENU_CACHE_TTL)}`;

  if (req.query.refresh !== 'true' && menuCache.has(cacheKey)) {
    return res.json({
      success: true,
      data: menuCache.get(cacheKey),
      cached: true,
    });
  }

  try {
    const manager = getScraperManager();
    const menuData = await manager.scrapeDiningMenu(venue);

    // Cache both live menus and brief unavailable states to avoid hammering DineOnCampus
    menuCache.set(cacheKey, menuData);
    if (menuCache.size > 20) {
      const oldestKey = menuCache.keys().next().value;
      menuCache.delete(oldestKey);
    }

    return res.json({
      success: true,
      data: menuData,
      cached: false,
    });
  } catch (error) {
    console.error('Error fetching dining menu:', error);
    return res.json({
      success: true,
      data: {
        venue,
        date: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }),
        sourceUrl: `https://new.dineoncampus.com/Angelo/whats-on-the-menu/${venue}/`,
        available: false,
        periods: [],
        message: 'Live menu temporarily unavailable. Open DineOnCampus to view today’s full menu.',
      },
      cached: false,
    });
  }
});

// Specific facility routes
router.get('/library', async (req, res) => {
  await getFacilityHoursHandler(req, res, 'library');
});

router.get('/recreation', async (req, res) => {
  await getFacilityHoursHandler(req, res, 'recreation');
});

router.get('/dining', async (req, res) => {
  await getFacilityHoursHandler(req, res, 'dining');
});

router.get('/ram_tram', async (req, res) => {
  await getFacilityHoursHandler(req, res, 'ram_tram');
});

router.get('/essentials', async (req, res) => {
  await getFacilityHoursHandler(req, res, 'essentials');
});

// GET /api/facilities/:type - Get hours for any facility type
router.get('/:type', async (req, res) => {
  const { type } = req.params;

  if (!VALID_FACILITY_TYPES.includes(type)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid facility type',
      message: `Valid types are: ${VALID_FACILITY_TYPES.join(', ')}`,
    });
  }

  await getFacilityHoursHandler(req, res, type);
});

// POST /api/facilities/:type/hours - Protected admin/scraper write endpoint
router.post('/:type/hours', requireAdminKey, async (req, res) => {
  try {
    const { type } = req.params;
    const { hours } = req.body;

    if (!VALID_FACILITY_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid facility type',
        message: `Valid types are: ${VALID_FACILITY_TYPES.join(', ')}`,
      });
    }

    if (!hours || !Array.isArray(hours)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid hours data',
        message: 'Hours must be an array of hour objects',
      });
    }

    await db.updateFacilityHours(type, hours);
    invalidateFacilityCache(type);

    res.json({
      success: true,
      message: `${type} hours updated successfully`,
      updated_count: hours.length,
    });
  } catch (error) {
    console.error(`Error updating ${req.params.type} hours:`, error);
    res.status(500).json({
      success: false,
      error: `Failed to update ${req.params.type} hours`,
      message: error.message,
    });
  }
});

router._clearCache = () => {
  cache.clear();
  menuCache.clear();
};

module.exports = router;
