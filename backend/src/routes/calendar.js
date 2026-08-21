const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const router = express.Router();

const cache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

const CALENDAR_URL = 'https://www.angelo.edu/current-students/registrar/academic_calendar.php';

const MONTH_MAP = {
  Jan: 'January', Feb: 'February', Mar: 'March',  Apr: 'April',
  May: 'May',     Jun: 'June',     Jul: 'July',   Aug: 'August',
  Sep: 'September', Sept: 'September', Oct: 'October',
  Nov: 'November', Dec: 'December',
};

// Parse "Aug. 21", "Aug. 21 2027", "March 15", "March 15 2027" → Date object
function parseDateFromDt(dtText) {
  const match = dtText.match(/([A-Z][a-z]+\.?)\s+(\d+)(?:\s+(\d{4}))?/);
  if (!match) return null;
  const [, monthStr, dayStr, yearStr] = match;
  const fullMonth = MONTH_MAP[monthStr.replace('.', '')] || monthStr;
  const year = yearStr
    ? parseInt(yearStr)
    : (() => {
        const y = new Date().getFullYear();
        const d = new Date(`${fullMonth} ${dayStr}, ${y}`);
        return d < new Date(Date.now() - 86400000) ? y + 1 : y;
      })();
  return new Date(`${fullMonth} ${dayStr}, ${year}`);
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
      const thEl = $(trEl).find('th');
      const mainDate = thEl.find('span').not('.until').not('.lw_date_year').first().text().trim();
      const explicitYear = thEl.find('.lw_date_year').text().replace(/\D/g, '');
      const thText = explicitYear ? `${mainDate} ${explicitYear}` : mainDate;
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
