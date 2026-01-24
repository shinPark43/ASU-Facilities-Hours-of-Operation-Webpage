const express = require('express');
const router = express.Router();
const tutoringDb = require('../tutoring-database');

// Cache for tutoring data
let cache = {
  data: null,
  timestamp: null
};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Helper function to check if cache is valid
function isCacheValid() {
  // Cache is only valid if it has data, has a timestamp within TTL, and has actual content
  if (!cache.data || !cache.timestamp) return false;
  if (Date.now() - cache.timestamp >= CACHE_TTL) return false;
  // Don't use cache if subjects is empty
  if (!cache.data.subjects || Object.keys(cache.data.subjects).length === 0) return false;
  return true;
}

// GET /api/tutoring - Get all tutoring data
router.get('/', async (req, res) => {
  try {
    // Check cache first
    if (isCacheValid()) {
      return res.json({
        success: true,
        data: cache.data,
        cached: true
      });
    }

    const data = await tutoringDb.getAllTutoringData();
    
    // Update cache
    cache.data = data;
    cache.timestamp = Date.now();
    
    res.json({
      success: true,
      data: data,
      cached: false
    });
  } catch (error) {
    console.error('Error fetching tutoring data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tutoring data',
      message: error.message
    });
  }
});

// GET /api/tutoring/subjects - Get all subjects
router.get('/subjects', async (req, res) => {
  try {
    const subjects = await tutoringDb.getAllSubjects();
    res.json({
      success: true,
      data: subjects,
      count: subjects.length
    });
  } catch (error) {
    console.error('Error fetching subjects:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch subjects',
      message: error.message
    });
  }
});

// GET /api/tutoring/subjects/:id/courses - Get courses for a subject
router.get('/subjects/:id/courses', async (req, res) => {
  try {
    const { id } = req.params;
    const courses = await tutoringDb.getCoursesBySubject(parseInt(id));
    res.json({
      success: true,
      data: courses,
      count: courses.length
    });
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch courses',
      message: error.message
    });
  }
});

// GET /api/tutoring/courses/:id/sessions - Get sessions for a course
router.get('/courses/:id/sessions', async (req, res) => {
  try {
    const { id } = req.params;
    const sessions = await tutoringDb.getSessionsByCourse(parseInt(id));
    res.json({
      success: true,
      data: sessions,
      count: sessions.length
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sessions',
      message: error.message
    });
  }
});

// GET /api/tutoring/search - Search courses by name or code
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Search query must be at least 2 characters'
      });
    }

    // Get all data and filter client-side for now
    // Could be optimized with a dedicated search query
    const data = await tutoringDb.getAllTutoringData();
    const searchTerm = q.toLowerCase();
    
    const results = {};
    
    for (const [subjectName, subject] of Object.entries(data.subjects || {})) {
      for (const [courseName, course] of Object.entries(subject.courses || {})) {
        if (courseName.toLowerCase().includes(searchTerm) || 
            (course.code && course.code.toLowerCase().includes(searchTerm))) {
          if (!results[subjectName]) {
            results[subjectName] = { ...subject, courses: {} };
          }
          results[subjectName].courses[courseName] = course;
        }
      }
    }

    res.json({
      success: true,
      data: { subjects: results },
      query: q
    });
  } catch (error) {
    console.error('Error searching tutoring:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search tutoring data',
      message: error.message
    });
  }
});

// GET /api/tutoring/logs/recent - Get recent scrape logs
router.get('/logs/recent', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const logs = await tutoringDb.getRecentScrapeLogs(limit);
    
    res.json({
      success: true,
      data: logs,
      count: logs.length
    });
  } catch (error) {
    console.error('Error fetching tutoring scrape logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch scrape logs',
      message: error.message
    });
  }
});

// POST /api/tutoring/refresh - Force cache refresh
router.post('/refresh', async (req, res) => {
  try {
    // Clear cache
    cache.data = null;
    cache.timestamp = null;
    
    // Fetch fresh data
    const data = await tutoringDb.getAllTutoringData();
    
    // Update cache
    cache.data = data;
    cache.timestamp = Date.now();
    
    res.json({
      success: true,
      message: 'Cache refreshed successfully',
      data: data
    });
  } catch (error) {
    console.error('Error refreshing tutoring cache:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to refresh cache',
      message: error.message
    });
  }
});

module.exports = router;
