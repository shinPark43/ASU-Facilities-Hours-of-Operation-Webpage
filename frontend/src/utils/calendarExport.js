/**
 * RFC 5545 (.ics) and Google Calendar export helpers for My Schedule courses
 */

const DAY_TO_ICS = {
  Sunday: 'SU',
  Monday: 'MO',
  Tuesday: 'TU',
  Wednesday: 'WE',
  Thursday: 'TH',
  Friday: 'FR',
  Saturday: 'SA',
};

const DAY_TO_INDEX = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

const pad = (n) => String(n).padStart(2, '0');

function escapeIcsText(str = '') {
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Find the next date on or after `referenceDate` that falls on one of the course's weekdays.
 */
function getNextMatchingDate(days, referenceDate = new Date()) {
  const validIndexes = (days || [])
    .map((d) => DAY_TO_INDEX[d])
    .filter((idx) => idx !== undefined);

  const base = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate());
  if (validIndexes.length === 0) return base;

  for (let offset = 0; offset < 7; offset++) {
    const candidate = new Date(base);
    candidate.setDate(base.getDate() + offset);
    if (validIndexes.includes(candidate.getDay())) {
      return candidate;
    }
  }
  return base;
}

function formatLocalIcsDateTime(dateObj, hhmm) {
  const [h, m] = (hhmm || '09:00').split(':').map((n) => parseInt(n, 10) || 0);
  return `${dateObj.getFullYear()}${pad(dateObj.getMonth() + 1)}${pad(dateObj.getDate())}T${pad(h)}${pad(m)}00`;
}

/**
 * Generate a complete RFC 5545 .ics calendar string for an array of My Schedule courses.
 * Repeats weekly on each course's days for `weeks` weeks (default 16-week semester) in America/Chicago.
 */
export function generateScheduleIcs(courses, options = {}) {
  const { referenceDate = new Date(), weeks = 16 } = options;
  const nowStamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ASU Hours//My Schedule//EN',
    'CALSCALE:GREGORIAN',
    'X-WR-CALNAME:ASU Class Schedule',
    'X-WR-TIMEZONE:America/Chicago',
    'BEGIN:VTIMEZONE',
    'TZID:America/Chicago',
    'BEGIN:DAYLIGHT',
    'TZOFFSETFROM:-0600',
    'TZOFFSETTO:-0500',
    'TZNAME:CDT',
    'DTSTART:19700308T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU',
    'END:DAYLIGHT',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:-0500',
    'TZOFFSETTO:-0600',
    'TZNAME:CST',
    'DTSTART:19701101T020000',
    'RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU',
    'END:STANDARD',
    'END:VTIMEZONE',
  ];

  for (const course of courses || []) {
    if (!course?.name || !Array.isArray(course.days) || course.days.length === 0) continue;

    const byDay = course.days.map((d) => DAY_TO_ICS[d]).filter(Boolean);
    if (byDay.length === 0) continue;

    const firstDate = getNextMatchingDate(course.days, referenceDate);
    const dtStart = formatLocalIcsDateTime(firstDate, course.startTime);
    const dtEnd = formatLocalIcsDateTime(firstDate, course.endTime);
    const totalOccurrences = Math.max(1, byDay.length * weeks);

    const descriptionParts = [];
    if (course.professor) descriptionParts.push(`Professor: ${course.professor}`);
    descriptionParts.push('Exported from ASU Hours');

    lines.push(
      'BEGIN:VEVENT',
      `UID:${escapeIcsText(course.id || course.name)}@asuhours.angelo.edu`,
      `DTSTAMP:${nowStamp}`,
      `DTSTART;TZID=America/Chicago:${dtStart}`,
      `DTEND;TZID=America/Chicago:${dtEnd}`,
      `RRULE:FREQ=WEEKLY;BYDAY=${byDay.join(',')};COUNT=${totalOccurrences}`,
      `SUMMARY:${escapeIcsText(course.name)}`,
      ...(course.location ? [`LOCATION:${escapeIcsText(course.location)}`] : []),
      `DESCRIPTION:${escapeIcsText(descriptionParts.join('\n'))}`,
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/**
 * Trigger a browser download of the generated .ics file.
 */
export function downloadScheduleIcs(courses, filename = 'asu-class-schedule.ics') {
  const icsContent = generateScheduleIcs(courses);
  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Build a recurring Google Calendar "Add Event" deep link for a single course.
 */
export function buildCourseGoogleCalendarUrl(course, options = {}) {
  const { referenceDate = new Date(), weeks = 16 } = options;
  const byDay = (course?.days || []).map((d) => DAY_TO_ICS[d]).filter(Boolean);
  const firstDate = getNextMatchingDate(course?.days, referenceDate);
  const dtStart = formatLocalIcsDateTime(firstDate, course?.startTime);
  const dtEnd = formatLocalIcsDateTime(firstDate, course?.endTime);
  const count = Math.max(1, byDay.length * weeks);

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: course?.name || 'ASU Class',
    dates: `${dtStart}/${dtEnd}`,
    ctz: 'America/Chicago',
    location: course?.location || 'Angelo State University',
    details: course?.professor ? `Professor: ${course.professor}\nExported from ASU Hours` : 'Exported from ASU Hours',
  });

  if (byDay.length > 0) {
    params.set('recur', `RRULE:FREQ=WEEKLY;BYDAY=${byDay.join(',')};COUNT=${count}`);
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
