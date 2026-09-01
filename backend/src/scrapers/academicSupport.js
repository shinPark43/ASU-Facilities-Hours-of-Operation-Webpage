const axios = require('axios');
const cheerio = require('cheerio');
const tutoringDb = require('../tutoring-database');

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const TIMEOUT = 30000;
const TUTORING_URL = 'https://www.angelo.edu/current-students/freshman-college/academic-tutoring.php';
const MATH_LAB_URL = 'https://www.angelo.edu/current-students/freshman-college/math-lab.php';
const WRITING_CENTER_URL = 'https://www.angelo.edu/current-students/writing-center/';

// Entry point — fetches and stores all academic support hours
async function scrapeTutoring() {
  console.log('🔍 Scraping academic support hours...');
  try {
    tutoringDb.logScrapeActivity('started', 'Beginning tutoring hours scrape');

    const { data: html } = await axios.get(TUTORING_URL, {
      timeout: TIMEOUT,
      headers: { 'User-Agent': USER_AGENT }
    });

    const [tutoringData, mathLabData, writingCenterData] = await Promise.all([
      extractTutoringHours(html),
      scrapeMathLab(),
      scrapeWritingCenter(),
    ]);

    if (!tutoringData || Object.keys(tutoringData).length === 0) {
      throw new Error('No tutoring hours data found on the page');
    }
    console.log(`📋 Tutoring extraction found ${Object.keys(tutoringData).length} subjects`);

    const mergedData = { ...tutoringData };
    for (const [label, data] of [['Math Lab', mathLabData], ['Writing Center', writingCenterData]]) {
      if (data && Object.keys(data).length > 0) {
        Object.assign(mergedData, data);
        console.log(`✅ ${label} hours merged with tutoring data`);
      }
    }

    // Sort subjects alphabetically
    const sortedData = {};
    Object.keys(mergedData).sort((a, b) => a.localeCompare(b)).forEach(key => {
      sortedData[key] = mergedData[key];
    });

    const formattedData = formatTutoringHours(sortedData);

    const counts = await tutoringDb.updateTutoringData(formattedData);
    tutoringDb.logScrapeActivity('success', 'Updated tutoring data', counts);

    console.log('✅ Academic support hours scraped successfully');
    return {
      success: true,
      subjects_count: counts.subjects_count,
      courses_count: counts.courses_count,
      sessions_count: counts.sessions_count
    };

  } catch (error) {
    console.error('❌ Academic support scraping failed:', error);
    tutoringDb.logScrapeActivity('error', error.message);
    throw error;
  }
}

// Parse the main tutoring page using Cheerio (static HTML — no browser needed)
function extractTutoringHours(html) {
  const $ = cheerio.load(html);
  const tutoringData = {};

  $('div.accordion_details').each((_, section) => {
    let subjectName = $(section).find('div.accordion_summary').first().text().trim();

    // Normalize whitespace
    subjectName = subjectName.replace(/\s+/g, ' ').trim();

    // Skip empty or navigation-like headings
    if (!subjectName ||
        subjectName.toLowerCase().includes('hours of operation') ||
        subjectName.toLowerCase().includes('schedule')) {
      return;
    }

    $(section).find('div.accordion_content table').each((_, table) => {
      // Caption may contain multiple course names separated by <br>
      const captionHtml = $(table).find('caption').html() || '';
      const courseNames = captionHtml
        .split(/<br\s*\/?>/gi)
        .map(fragment => cheerio.load(fragment).text().replace(/\u00A0/g, ' ').trim())
        .filter(Boolean);

      if (courseNames.length === 0) return;

      // Parse session rows
      const courseHours = [];
      let lastValidDay = '';

      $(table).find('tbody tr').each((_, row) => {
        // Skip header rows
        if ($(row).find('th').length > 0) return;

        const cells = $(row).find('td');
        if (cells.length < 3) return;

        let day = $(cells[0]).text().replace(/\u00A0/g, '').trim();
        const time = $(cells[1]).text().trim();
        const location = $(cells[2]).text().trim();

        // Carry forward last valid day for continuation rows (e.g. Upswing online slots)
        if (!day && (time || location)) {
          day = lastValidDay || 'Online';
        }
        if (day && day !== 'Online') {
          lastValidDay = day;
        }

        if (day && (time || location)) {
          courseHours.push({
            day,
            time: time || 'TBA',
            location: location || 'TBA'
          });
        }
      });

      // Assign the same sessions to each course name in this table
      if (!tutoringData[subjectName]) {
        tutoringData[subjectName] = {};
      }
      for (const courseName of courseNames) {
        if (tutoringData[subjectName][courseName]) {
          tutoringData[subjectName][courseName] = [
            ...tutoringData[subjectName][courseName],
            ...courseHours
          ];
        } else {
          tutoringData[subjectName][courseName] = [...courseHours];
        }
      }
    });
  });

  return tutoringData;
}

async function scrapeMathLab() {
  console.log('🔍 Scraping Math Lab hours from dedicated page...');
  try {
    const { data: html } = await axios.get(MATH_LAB_URL, {
      timeout: TIMEOUT,
      headers: { 'User-Agent': USER_AGENT }
    });
    const $ = cheerio.load(html);

    const DAY_ABBREVS = {
      sun: 'Sunday', mon: 'Monday', tue: 'Tuesday',
      wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday',
    };

    // Find the table whose first row contains ≥3 day abbreviations
    let mathLabTable = null;
    $('table').each((_, table) => {
      const firstRowText = $(table).find('tr').first().text().toLowerCase();
      const hits = Object.keys(DAY_ABBREVS).filter(a => firstRowText.includes(a)).length;
      if (hits >= 3) { mathLabTable = table; return false; }
    });
    if (!mathLabTable) return null;

    const rows = $(mathLabTable).find('tr').toArray();

    // Dynamically find the header row (first row with ≥3 day abbrev cells)
    let headerRowIdx = -1;
    let days = [];
    for (let i = 0; i < rows.length; i++) {
      const cells = $(rows[i]).find('td, th').toArray().map(c => $(c).text().trim().toLowerCase());
      const mapped = cells.map(t => Object.entries(DAY_ABBREVS).find(([a]) => t.includes(a))?.[1] ?? null);
      if (mapped.filter(Boolean).length >= 3) { headerRowIdx = i; days = mapped; break; }
    }
    if (headerRowIdx === -1 || headerRowIdx + 1 >= rows.length) return null;

    // Parse the row immediately following the header
    const sessions = [];
    $(rows[headerRowIdx + 1]).find('td, th').each((i, cell) => {
      const time = $(cell).text().trim();
      if (!days[i] || !time || time.toLowerCase() === 'closed') return;
      sessions.push({ day: days[i], time, location: 'Porter Henderson Library, Room 328' });
    });

    console.log('✅ Math Lab hours extracted');
    return sessions.length > 0 ? { 'Math Lab': { 'Math Lab (Drop-in Help)': sessions } } : null;

  } catch (error) {
    console.error('⚠️ Math Lab scraping failed (continuing without it):', error.message);
    return null;
  }
}

async function scrapeWritingCenter() {
  console.log('🔍 Scraping Writing Center hours from dedicated page...');
  try {
    const { data: html } = await axios.get(WRITING_CENTER_URL, {
      timeout: TIMEOUT,
      headers: { 'User-Agent': USER_AGENT }
    });
    const $ = cheerio.load(html);

    const DAY_ABBREVS = {
      sun: 'Sunday', mon: 'Monday', tue: 'Tuesday',
      wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday',
    };

    function parseColumnarTable(tableEl) {
      const rows = $(tableEl).find('tr').toArray();
      if (rows.length < 2) return [];

      let headerRowIdx = -1;
      let days = [];
      for (let i = 0; i < rows.length; i++) {
        const cells = $(rows[i]).find('td, th').toArray().map(c => $(c).text().trim().toLowerCase());
        const mapped = cells.map(t => Object.entries(DAY_ABBREVS).find(([a]) => t.includes(a))?.[1] ?? null);
        if (mapped.filter(Boolean).length >= 2) { headerRowIdx = i; days = mapped; break; }
      }
      if (headerRowIdx === -1 || headerRowIdx + 1 >= rows.length) return [];

      const sessions = [];
      $(rows[headerRowIdx + 1]).find('td, th').each((i, cell) => {
        const time = $(cell).text().trim();
        if (!days[i] || !time || /^(off|closed)$/i.test(time)) return;
        sessions.push({ day: days[i], time, location: 'ASU Writing Center' });
      });
      return sessions;
    }

    const courses = {};
    let currentHeading = null;
    $('h1, h2, h3, h4, h5, h6, table').each((_, el) => {
      const tag = el.tagName.toLowerCase();
      if (/^h[1-6]$/.test(tag)) {
        currentHeading = $(el).text().trim() || null;
      } else if (tag === 'table') {
        const sessions = parseColumnarTable(el);
        if (sessions.length >= 2) {
          const label = currentHeading || `Section ${Object.keys(courses).length + 1}`;
          courses[label] = sessions;
        }
      }
    });

    console.log('✅ Writing Center hours extracted');
    return Object.keys(courses).length > 0 ? { 'Writing Center': courses } : null;

  } catch (error) {
    console.error('⚠️ Writing Center scraping failed (continuing without it):', error.message);
    return null;
  }
}

function formatTutoringHours(tutoringData) {
  const formatted = {};

  for (const [subjectName, courses] of Object.entries(tutoringData)) {
    if (!subjectName || subjectName === 'Unknown') continue;

    formatted[subjectName] = {};

    for (const [courseName, sessions] of Object.entries(courses)) {
      if (!courseName) continue;

      const validSessions = sessions.filter(session =>
        session.day && session.day !== ''
      );

      if (validSessions.length > 0) {
        formatted[subjectName][courseName] = validSessions;
      }
    }

    if (Object.keys(formatted[subjectName]).length === 0) {
      delete formatted[subjectName];
    }
  }

  return formatted;
}

module.exports = { scrapeTutoring };
