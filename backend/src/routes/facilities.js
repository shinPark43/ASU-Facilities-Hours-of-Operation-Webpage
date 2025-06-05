const express = require('express');
const router = express.Router();
const db = require('../database');

// Helper function to format hours data for frontend
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

  // Group hours by section
  rawHours.forEach(hour => {
    if (!hour.section_name) return;

    if (!facility.sections[hour.section_name]) {
      facility.sections[hour.section_name] = {};
    }

    const timeString = hour.is_closed 
      ? 'Closed'
      : hour.open_time && hour.close_time  // Dining: separate fields
        ? `${hour.open_time} - ${hour.close_time}`
        : hour.open_time  // Library/Recreation: full string in open_time
          ? hour.open_time
          : 'Hours not available';

    facility.sections[hour.section_name][hour.day_of_week] = timeString;

    // Track the most recent update
    if (!facility.last_updated || hour.updated_at > facility.last_updated) {
      facility.last_updated = hour.updated_at;
    }
  });

  return facility;
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
  try {
    const rawHours = await db.getFacilityHours('library');
    const facility = formatHoursForFrontend(rawHours);
    
    res.json({
      success: true,
      data: facility
    });
  } catch (error) {
    console.error('Error fetching library hours:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch library hours',
      message: error.message
    });
  }
});

// GET /api/facilities/recreation - Get recreation center hours
router.get('/recreation', async (req, res) => {
  try {
    const rawHours = await db.getFacilityHours('recreation');
    const facility = formatHoursForFrontend(rawHours);
    
    res.json({
      success: true,
      data: facility
    });
  } catch (error) {
    console.error('Error fetching recreation hours:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recreation hours',
      message: error.message
    });
  }
});

// GET /api/facilities/dining - Get dining hours
router.get('/dining', async (req, res) => {
  try {
    const rawHours = await db.getFacilityHours('dining');
    const facility = formatHoursForFrontend(rawHours);
    
    res.json({
      success: true,
      data: facility
    });
  } catch (error) {
    console.error('Error fetching dining hours:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dining hours',
      message: error.message
    });
  }
});

// GET /api/facilities/:type - Get hours for any facility type
router.get('/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const validTypes = ['library', 'recreation', 'dining'];
    
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid facility type',
        message: `Valid types are: ${validTypes.join(', ')}`
      });
    }

    const rawHours = await db.getFacilityHours(type);
    const facility = formatHoursForFrontend(rawHours);
    
    res.json({
      success: true,
      data: facility
    });
  } catch (error) {
    console.error(`Error fetching ${req.params.type} hours:`, error);
    res.status(500).json({
      success: false,
      error: `Failed to fetch ${req.params.type} hours`,
      message: error.message
    });
  }
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