const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const router = express.Router();

const cache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

const CALENDAR_URL = 'https://www.angelo.edu/current-students/registrar/academic_calendar.php';

// Parse "March 1", "March 5 at 5 p.m.", "March 16-20" → Date object (uses first day of range)
function parseDateFromDt(dtText) {
  const match = dtText.match(/([A-Z][a-z]+)\s+(\d+)/);
  if (!match) return null;
  const [, monthStr, dayStr] = match;
  const year = new Date().getFullYear();
  const date = new Date(`${monthStr} ${dayStr}, ${year}`);
  // If the date is more than 1 day in the past, try next year (handles Dec→Jan crossover)
  if (date < new Date(Date.now() - 86400000)) date.setFullYear(year + 1);
  return date;
}

function classifyEvent(title, eventDate, today) {
  const t = title.toLowerCase();

  // TODAY: event is today
  if (eventDate.getTime() === today.getTime()) {
    return { badge: 'TODAY', accentColor: 'red' };
  }

  // DEADLINE: payment due, drop dates, proposal deadlines, grade submission
  if (/deadline|due|last day|last date|drop|withdrawal|grades due|adoption/i.test(t)) {
    return { badge: 'DEADLINE', accentColor: 'red' };
  }

  // BREAK: spring break, fall break, thanksgiving, holiday
  if (/break|holiday|thanksgiving/i.test(t)) {
    return { badge: 'BREAK', accentColor: 'amber' };
  }

  // EXAM: final exams, midterms
  if (/exam|final/i.test(t)) {
    return { badge: 'EXAM', accentColor: 'amber' };
  }

  // Default
  return { badge: 'UPCOMING', accentColor: 'amber' };
}

// GET /api/calendar/upcoming — returns first 5 upcoming events
// Add ?refresh=true to bypass cache and force a fresh scrape
router.get('/upcoming', async (req, res) => {
  const cacheKey = `upcoming:${Math.floor(Date.now() / CACHE_TTL)}`;
  if (req.query.refresh !== 'true' && cache.has(cacheKey)) {
    return res.json({ success: true, data: cache.get(cacheKey), cached: true });
  }

  try {
    const { data: html } = await axios.get(CALENDAR_URL, { timeout: 8000 });
    const $ = cheerio.load(html);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcoming = [];
    for (const trEl of $('table tr').toArray()) {
      if (upcoming.length >= 5) break;
      const thText = $(trEl).find('th span').first().text().trim();
      const tdText = $(trEl).find('td .font-weight-bold').first().text().trim()
                  || $(trEl).find('td').first().text().trim();
      if (!thText || !tdText) continue;
      const date = parseDateFromDt(thText);
      if (!date || date < today) continue;
      const { badge, accentColor } = classifyEvent(tdText, date, today);
      upcoming.push({ date: thText, title: tdText, badge, accentColor });
    }

    cache.set(cacheKey, upcoming);
    if (cache.size > 20) cache.delete(cache.keys().next().value);

    res.json({ success: true, data: upcoming, cached: false });
  } catch (err) {
    console.error('❌ Calendar scrape failed:', err.message);
    res.status(500).json({ success: false, error: 'Failed to fetch calendar events' });
  }
});

module.exports = router;
