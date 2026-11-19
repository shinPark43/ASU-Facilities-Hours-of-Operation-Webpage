/**
 * Utility functions for time and date formatting + live open/closing status evaluation
 */

const ASU_TIME_ZONE = 'America/Chicago';
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const CLOSING_SOON_THRESHOLD_MINS = 45;

/**
 * Return wall-clock day/time parts in Angelo State's timezone (America/Chicago).
 * Uses native Temporal.ZonedDateTime when available, falling back cleanly to Intl.DateTimeFormat.
 */
export function getChicagoTimeParts(date = new Date()) {
  if (typeof globalThis.Temporal !== 'undefined' && globalThis.Temporal?.Instant) {
    try {
      const zdt = globalThis.Temporal.Instant.fromEpochMilliseconds(date.getTime())
        .toZonedDateTimeISO(ASU_TIME_ZONE);
      // Temporal dayOfWeek is 1 (Mon) .. 7 (Sun)
      const dayIndex = zdt.dayOfWeek % 7;
      return {
        year: zdt.year,
        month: zdt.month,
        day: zdt.day,
        hour: zdt.hour,
        minute: zdt.minute,
        second: zdt.second,
        dayIndex,
        dayName: DAY_NAMES[dayIndex],
        minutesOfDay: zdt.hour * 60 + zdt.minute,
      };
    } catch {
      // Fall through to Intl
    }
  }

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: ASU_TIME_ZONE,
    weekday: 'long',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });

  const parts = {};
  for (const p of formatter.formatToParts(date)) {
    if (p.type !== 'literal') parts[p.type] = p.value;
  }

  let hour = parseInt(parts.hour, 10);
  if (hour === 24) hour = 0;
  const minute = parseInt(parts.minute, 10);
  const second = parseInt(parts.second, 10);
  const dayName = parts.weekday || DAY_NAMES[date.getDay()];
  const dayIndex = Math.max(0, DAY_NAMES.indexOf(dayName));

  return {
    year: parseInt(parts.year, 10),
    month: parseInt(parts.month, 10),
    day: parseInt(parts.day, 10),
    hour,
    minute,
    second,
    dayIndex,
    dayName,
    minutesOfDay: hour * 60 + minute,
  };
}

/**
 * Format a duration in minutes using Intl.DurationFormat when available, with a concise fallback.
 */
export function formatDurationMinutes(totalMinutes, style = 'narrow') {
  const safeMins = Math.max(1, Math.round(totalMinutes));
  const hours = Math.floor(safeMins / 60);
  const minutes = safeMins % 60;

  if (typeof Intl !== 'undefined' && typeof Intl.DurationFormat === 'function') {
    try {
      const df = new Intl.DurationFormat('en-US', { style });
      const duration = {};
      if (hours > 0) duration.hours = hours;
      if (minutes > 0 || hours === 0) duration.minutes = minutes;
      return df.format(duration);
    } catch {
      // Fall back to deterministic formatting below
    }
  }

  if (style === 'short' || style === 'long') {
    const hLabel = hours === 1 ? 'hr' : 'hrs';
    const mLabel = 'min';
    if (hours > 0 && minutes > 0) return `${hours} ${hLabel} ${minutes} ${mLabel}`;
    if (hours > 0) return `${hours} ${hLabel}`;
    return `${minutes} ${mLabel}`;
  }

  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
}

/**
 * Format minutes since midnight (0..1439) to a compact 12-hour label like "8:00 PM" or "12:30 AM".
 */
export function formatMinutesTo12Hour(totalMins) {
  const normalized = ((Math.round(totalMins) % 1440) + 1440) % 1440;
  const h24 = Math.floor(normalized / 60);
  const m = normalized % 60;
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

/**
 * Parse a single time token such as "7:30 AM", "9 a.m.", "Noon", "Midnight", "Sunset", or "4:30".
 * Returns { minutes, period } or null.
 */
export function parseTimeToken(rawToken, fallbackPeriod = null) {
  if (!rawToken || typeof rawToken !== 'string') return null;
  const token = rawToken.trim().toLowerCase();
  if (!token) return null;

  if (token === 'noon' || token === '12 noon') {
    return { minutes: 12 * 60, period: 'pm', display: '12:00 PM' };
  }
  if (token === 'midnight' || token === '12 midnight') {
    return { minutes: 0, period: 'am', display: '12:00 AM' };
  }
  if (token.includes('sunset')) {
    // Approximate San Angelo sunset (~7:00 PM) when exact astronomical time isn't supplied
    return { minutes: 19 * 60, period: 'pm', display: 'Sunset' };
  }

  const match = token.match(/^(\d{1,2})(?::(\d{2}))?\s*(?:([ap])\.?m?\.?)?$/i);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const rawPeriod = match[3] ? match[3].toLowerCase() : null;
  const period = rawPeriod ? `${rawPeriod}m` : fallbackPeriod;

  if (hours > 24 || minutes > 59) return null;

  if (period === 'pm' && hours < 12) hours += 12;
  else if (period === 'am' && hours === 12) hours = 0;

  return {
    minutes: hours * 60 + minutes,
    period,
    display: formatMinutesTo12Hour(hours * 60 + minutes),
  };
}

/**
 * Parse a day's hours entry (string or Ram Tram { time, route } object) into structured time windows.
 */
export function parseTimeWindows(rawDayValue) {
  if (!rawDayValue) return [];

  let timeStr = rawDayValue;
  let route = null;
  if (typeof rawDayValue === 'object') {
    timeStr = rawDayValue.time || '';
    route = rawDayValue.route || null;
  }

  if (typeof timeStr !== 'string' || isClosedTime(timeStr)) return [];

  const ranges = parseMultipleTimeRanges(timeStr);
  const windows = [];

  for (const range of ranges) {
    if (isClosedTime(range)) continue;
    const parts = range.split(/\s*[-–—]\s*/);
    if (parts.length !== 2) continue;

    // Parse end first so period-less starts (e.g. "4:30 - 8:30 p.m.") can inherit end's AM/PM
    const endParsed = parseTimeToken(parts[1]);
    if (!endParsed) continue;

    const startParsed = parseTimeToken(parts[0], endParsed.period);
    if (!startParsed) continue;

    let startMins = startParsed.minutes;
    let endMins = endParsed.minutes;
    let crossesMidnight = false;

    // Handle overnight hours like "7:30 AM - 2:00 AM" or "Noon - 12:30 a.m." or "9 a.m. - Midnight"
    if (endMins <= startMins) {
      crossesMidnight = true;
      endMins += 1440;
    }

    windows.push({
      startMins,
      endMins,
      crossesMidnight,
      startDisplay: startParsed.display,
      endDisplay: endParsed.display,
      raw: range,
      route,
    });
  }

  return windows.sort((a, b) => a.startMins - b.startMins);
}

/**
 * Evaluate the real-time operating status of a facility section at `now` (in America/Chicago).
 * Properly handles:
 *  - Overnight hours crossing midnight (e.g. Library open until 2:00 AM from yesterday)
 *  - Multi-window schedules (e.g. The CAF breakfast/lunch/dinner gaps -> "Reopens 5:00 PM")
 *  - Closing soon countdowns (<= 45 minutes -> "Closes in 20m")
 *  - Ram Tram route info ("Running · 'til 8:30 PM")
 */
export function evaluateFacilityStatus(sectionSchedule, now = new Date(), options = {}) {
  const { isRamTram = false, closingSoonMins = CLOSING_SOON_THRESHOLD_MINS } = options;

  if (!sectionSchedule || typeof sectionSchedule !== 'object') {
    return {
      isOpen: false,
      state: 'closed',
      label: isRamTram ? 'Not running' : 'Closed',
      detail: 'Hours unavailable',
      hoursStr: null,
      minutesUntilClose: null,
      minutesUntilOpen: null,
      route: null,
    };
  }

  const chicago = getChicagoTimeParts(now);
  const todayName = chicago.dayName;
  const yesterdayName = DAY_NAMES[(chicago.dayIndex + 6) % 7];
  const nowMins = chicago.minutesOfDay;

  const todayRaw = sectionSchedule[todayName];
  const yesterdayRaw = sectionSchedule[yesterdayName];

  const todayWindows = parseTimeWindows(todayRaw);
  const yesterdayWindows = parseTimeWindows(yesterdayRaw);

  const todayRoute = typeof todayRaw === 'object' && todayRaw ? todayRaw.route || null : null;
  const todayHoursStr = !todayRaw
    ? null
    : typeof todayRaw === 'object'
      ? `${todayRaw.time}${todayRaw.route ? ` · ${todayRaw.route}` : ''}`
      : isClosedTime(todayRaw)
        ? (isRamTram ? 'Not running today' : 'Closed today')
        : parseMultipleTimeRanges(todayRaw).join(' · ');

  // 1. Check if still open from yesterday's overnight shift (e.g. Library Mon 7:30 AM - Tue 2:00 AM)
  for (const win of yesterdayWindows) {
    if (win.crossesMidnight) {
      const carryEndMins = win.endMins - 1440; // minutes past midnight today
      if (nowMins < carryEndMins) {
        const minsLeft = carryEndMins - nowMins;
        const closingSoon = minsLeft <= closingSoonMins;
        const countdownNarrow = formatDurationMinutes(minsLeft, 'narrow');
        const countdownShort = formatDurationMinutes(minsLeft, 'short');
        return {
          isOpen: true,
          state: closingSoon ? 'closing-soon' : 'open',
          label: closingSoon
            ? `Closes in ${countdownNarrow}`
            : (isRamTram ? 'Running' : `'til ${win.endDisplay}`),
          detail: closingSoon
            ? `Closing soon · ${countdownShort} left (closes ${win.endDisplay})`
            : `Open now · Closes at ${win.endDisplay}`,
          hoursStr: todayHoursStr,
          minutesUntilClose: minsLeft,
          minutesUntilOpen: null,
          route: win.route || todayRoute,
        };
      }
    }
  }

  // 2. Check today's windows for an active open window
  for (const win of todayWindows) {
    if (nowMins >= win.startMins && nowMins < win.endMins) {
      const minsLeft = win.endMins - nowMins;
      const closingSoon = minsLeft <= closingSoonMins;
      const countdownNarrow = formatDurationMinutes(minsLeft, 'narrow');
      const countdownShort = formatDurationMinutes(minsLeft, 'short');
      return {
        isOpen: true,
        state: closingSoon ? 'closing-soon' : 'open',
        label: closingSoon
          ? `Closes in ${countdownNarrow}`
          : (isRamTram ? 'Running' : `'til ${win.endDisplay}`),
        detail: closingSoon
          ? `Closing soon · ${countdownShort} left (closes ${win.endDisplay})`
          : isRamTram
            ? `Running now${win.route ? ` (${win.route})` : ''} · until ${win.endDisplay}`
            : `Open now · Closes at ${win.endDisplay}`,
        hoursStr: todayHoursStr,
        minutesUntilClose: minsLeft,
        minutesUntilOpen: null,
        route: win.route || todayRoute,
      };
    }
  }

  // 3. Not currently open — check if another window opens later today
  const nextWindow = todayWindows.find((win) => win.startMins > nowMins);
  if (nextWindow) {
    const minsUntilOpen = nextWindow.startMins - nowMins;
    const hadEarlierWindow = todayWindows.some((win) => win.endMins <= nowMins);
    const verb = hadEarlierWindow ? 'Reopens' : 'Opens';
    const soonText = minsUntilOpen <= 60 ? ` (in ${formatDurationMinutes(minsUntilOpen, 'narrow')})` : '';
    return {
      isOpen: false,
      state: hadEarlierWindow ? 'reopens-later' : 'opens-later',
      label: `${verb} ${nextWindow.startDisplay}`,
      detail: `${isRamTram ? 'Not running yet' : 'Closed now'} · ${verb} at ${nextWindow.startDisplay}${soonText}`,
      hoursStr: todayHoursStr,
      minutesUntilClose: null,
      minutesUntilOpen: minsUntilOpen,
      route: nextWindow.route || todayRoute,
    };
  }

  // 4. Closed for the rest of today
  return {
    isOpen: false,
    state: 'closed',
    label: isRamTram ? 'Not running' : 'Closed',
    detail: todayWindows.length > 0
      ? (isRamTram ? 'Done running for today' : 'Closed for the rest of today')
      : (isRamTram ? 'Not running today' : 'Closed today'),
    hoursStr: todayHoursStr,
    minutesUntilClose: null,
    minutesUntilOpen: null,
    route: todayRoute,
  };
}

/**
 * Milliseconds until the next exact minute boundary (for minute-aligned clocks without 1s re-renders).
 */
export function msUntilNextMinute(now = new Date()) {
  const remainder = now.getSeconds() * 1000 + now.getMilliseconds();
  return Math.max(250, 60000 - remainder);
}

/**
 * Parse multiple time ranges from a string
 * Handles formats like "7:00a-9:00a 11:30a-1:30p 5:00p-7:00p" or newline-separated ranges
 * @param {string} timeString - The time string to parse
 * @returns {Array} Array of individual time range strings
 */
export function parseMultipleTimeRanges(timeString) {
  if (!timeString || typeof timeString !== 'string') {
    return [timeString || 'N/A'];
  }

  // Handle closed/unavailable cases
  if (
    timeString.toLowerCase().includes('closed') ||
    timeString.toLowerCase().includes('n/a') ||
    timeString.toLowerCase().includes('not available')
  ) {
    return [timeString];
  }

  // Split by newlines first
  let ranges = timeString.split('\n').filter((range) => range.trim());

  // If no newlines, try to split by multiple spaces or specific patterns
  if (ranges.length === 1) {
    const singleLine = ranges[0];
    const timePattern = /(\d{1,2}:\d{2}\s*[ap]\.?m?\.?\s*[-–]\s*\d{1,2}:\d{2}\s*[ap]\.?m?\.?)/gi;
    const matches = singleLine.match(timePattern);

    if (matches && matches.length > 1) {
      ranges = matches;
    } else {
      const spaceSplit = singleLine.split(/\s{2,}/).filter((range) => range.trim());
      if (spaceSplit.length > 1) {
        ranges = spaceSplit;
      }
    }
  }

  return ranges
    .map((range) => range.trim())
    .filter((range) => range.length > 0)
    .sort(sortTimeRanges);
}

/**
 * Sort time ranges chronologically (AM before PM)
 */
function sortTimeRanges(a, b) {
  const getStartTime = (range) => {
    const firstPart = range.split(/\s*[-–—]\s*/)[0];
    const parsed = parseTimeToken(firstPart);
    return parsed ? parsed.minutes : 0;
  };

  return getStartTime(a) - getStartTime(b);
}

/**
 * Get the current week's date range
 */
export function getCurrentWeekRange() {
  const now = new Date();
  const currentDay = now.getDay();

  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - currentDay);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  return {
    start: startOfWeek,
    end: endOfWeek,
  };
}

/**
 * Format week range for display
 */
export function formatWeekRange() {
  const { start, end } = getCurrentWeekRange();

  const startMonth = start.toLocaleDateString('en-US', { month: 'long' });
  const endMonth = end.toLocaleDateString('en-US', { month: 'long' });
  const year = start.getFullYear();

  const startDay = start.getDate();
  const endDay = end.getDate();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}-${endDay}, ${year}`;
  } else {
    const startMonthShort = start.toLocaleDateString('en-US', { month: 'short' });
    const endMonthShort = end.toLocaleDateString('en-US', { month: 'short' });
    return `${startMonthShort} ${startDay} - ${endMonthShort} ${endDay}, ${year}`;
  }
}

/**
 * Get relative time description for last update
 */
export function getRelativeUpdateTime(lastUpdated) {
  if (!lastUpdated) return 'Unknown';

  const lastUpdate = new Date(lastUpdated);
  const now = new Date();
  const diffMs = now - lastUpdate;
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) {
    return 'Just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  } else {
    return lastUpdate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }
}

/**
 * Get day name with date for current week
 */
export function formatDayWithDate(dayName) {
  const dayMap = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  };

  const dayIndex = dayMap[dayName];
  if (dayIndex === undefined) return dayName;

  const { start } = getCurrentWeekRange();
  const targetDate = new Date(start);
  targetDate.setDate(start.getDate() + dayIndex);

  const shortDay = dayName.slice(0, 3);
  const month = targetDate.getMonth() + 1;
  const date = targetDate.getDate();

  return `${shortDay} ${month}/${date}`;
}

/**
 * Check if a time string represents a closed/unavailable status
 */
export function isClosedTime(timeString) {
  if (!timeString || typeof timeString !== 'string') return false;

  const lowerTime = timeString.toLowerCase();
  return (
    lowerTime.includes('closed') ||
    lowerTime.includes('n/a') ||
    lowerTime.includes('not available') ||
    lowerTime.includes('unavailable')
  );
}

/**
 * Get the current day name in America/Chicago
 */
export function getCurrentDayName(now = new Date()) {
  return getChicagoTimeParts(now).dayName;
}

/**
 * Check if a given day name is today in America/Chicago
 */
export function isToday(dayName, now = new Date()) {
  return dayName === getCurrentDayName(now);
}

/**
 * Normalize time format to match library/recreation style
 */
export function normalizeTimeFormat(timeString) {
  if (!timeString || typeof timeString !== 'string') {
    return timeString;
  }

  if (isClosedTime(timeString)) {
    return timeString;
  }

  return timeString
    .replace(/(\d{1,2}):00\s*AM/gi, '$1:00 a.m.')
    .replace(/(\d{1,2}):(\d{2})\s*AM/gi, '$1:$2 a.m.')
    .replace(/(\d{1,2}):00\s*PM/gi, '$1:00 p.m.')
    .replace(/(\d{1,2}):(\d{2})\s*PM/gi, '$1:$2 p.m.')
    .replace(/[ \t]+/g, ' ')
    .replace(/[ \t]*\n[ \t]*/g, '\n')
    .trim();
}
