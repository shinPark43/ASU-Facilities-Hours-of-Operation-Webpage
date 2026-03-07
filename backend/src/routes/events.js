const express = require('express');
const router = express.Router();
const { getScraperManager } = require('../scraper');
const { lookupVenueCoords } = require('../venueCoords');

const cache = new Map();
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

function formatEvent(e) {
  const tsMs = e.ts_start * 1000;
  const date = new Date(tsMs).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', timeZone: 'America/Chicago',
  });
  const fmtTime = ts => new Date(ts * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' });
  const time = e.is_all_day === '1' || e.is_all_day === true
    ? 'All Day'
    : e.ts_end
      ? `${fmtTime(e.ts_start)} – ${fmtTime(e.ts_end)}`
      : fmtTime(e.ts_start);
  let lat = e.latitude && e.latitude !== '' ? parseFloat(e.latitude) : null;
  let lng = e.longitude && e.longitude !== '' ? parseFloat(e.longitude) : null;
  if (lat === null || lng === null) {
    const coords = lookupVenueCoords(e.location);
    if (coords) { lat = coords.lat; lng = coords.lng; }
  }
  const link = e.href
    ? (e.href.startsWith('http') ? e.href : `https://www.angelo.edu/events/calendar/${e.href.replace(/^\//, '')}`)
    : 'https://www.angelo.edu/events/calendar/';

  return {
    id: String(e.id),
    title: e.title || 'Untitled Event',
    date,
    time,
    location: e.location || '',
    lat,
    lng,
    link,
    tsStart: e.ts_start,
    tsEnd: e.ts_end || null,
    allDay: e.is_all_day === '1' || e.is_all_day === true,
  };
}

// GET /api/events/upcoming
router.get('/upcoming', async (req, res) => {
  const cacheKey = `upcoming:${Math.floor(Date.now() / CACHE_TTL)}`;
  if (req.query.refresh !== 'true' && cache.has(cacheKey)) {
    return res.json({ success: true, data: cache.get(cacheKey), cached: true });
  }

  try {
    const manager = getScraperManager();
    const eventsData = await manager.scrapeEvents();

    const now = Date.now() / 1000; // Unix seconds
    const allEvents = [];

    for (const dayEvents of Object.values(eventsData)) {
      if (!Array.isArray(dayEvents)) continue;
      for (const e of dayEvents) {
        if (e.status !== '1') continue;
        if (e.ts_start == null || e.ts_start <= now) continue;
        allEvents.push(e);
      }
    }

    allEvents.sort((a, b) => a.ts_start - b.ts_start);
    const upcoming = allEvents.map(formatEvent);

    cache.set(cacheKey, upcoming);
    if (cache.size > 20) cache.delete(cache.keys().next().value);

    res.json({ success: true, data: upcoming, cached: false });
  } catch (err) {
    console.error('Events scrape failed:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch events' });
  }
});

module.exports = router;
