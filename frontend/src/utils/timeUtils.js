/**
 * Utility functions for time and date formatting
 */

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
  if (timeString.toLowerCase().includes('closed') || 
      timeString.toLowerCase().includes('n/a') ||
      timeString.toLowerCase().includes('not available')) {
    return [timeString];
  }

  // Split by newlines first
  let ranges = timeString.split('\n').filter(range => range.trim());
  
  // If no newlines, try to split by multiple spaces or specific patterns
  if (ranges.length === 1) {
    const singleLine = ranges[0];
    // Look for patterns like "7:00a-9:00a 11:30a-1:30p" (time followed by space and another time)
    const timePattern = /(\d{1,2}:\d{2}[ap]m?\s*-\s*\d{1,2}:\d{2}[ap]m?)/gi;
    const matches = singleLine.match(timePattern);
    
    if (matches && matches.length > 1) {
      ranges = matches;
    } else {
      // Try splitting by multiple spaces
      const spaceSplit = singleLine.split(/\s{2,}/).filter(range => range.trim());
      if (spaceSplit.length > 1) {
        ranges = spaceSplit;
      }
    }
  }

  // Clean up and sort ranges
  return ranges
    .map(range => range.trim())
    .filter(range => range.length > 0)
    .sort(sortTimeRanges);
}

/**
 * Sort time ranges chronologically (AM before PM)
 * @param {string} a - First time range
 * @param {string} b - Second time range  
 * @returns {number} Sort order
 */
function sortTimeRanges(a, b) {
  const getStartTime = (range) => {
    const match = range.match(/(\d{1,2}):(\d{2})\s*([ap])/i);
    if (!match) return 0;
    
    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const period = match[3].toLowerCase();
    
    // Convert to 24-hour format for comparison
    if (period === 'p' && hours !== 12) hours += 12;
    if (period === 'a' && hours === 12) hours = 0;
    
    return hours * 60 + minutes;
  };

  return getStartTime(a) - getStartTime(b);
}

/**
 * Get the current week's date range
 * @returns {Object} Object with start and end dates of current week
 */
export function getCurrentWeekRange() {
  const now = new Date();
  const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  // Calculate start of week (Sunday)
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - currentDay);
  startOfWeek.setHours(0, 0, 0, 0);
  
  // Calculate end of week (Saturday)
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  
  return {
    start: startOfWeek,
    end: endOfWeek
  };
}

/**
 * Format week range for display
 * @returns {string} Formatted week range like "July 6-12, 2025"
 */
export function formatWeekRange() {
  const { start, end } = getCurrentWeekRange();
  
  const startMonth = start.toLocaleDateString('en-US', { month: 'long' });
  const endMonth = end.toLocaleDateString('en-US', { month: 'long' });
  const year = start.getFullYear();
  
  const startDay = start.getDate();
  const endDay = end.getDate();
  
  // Same month
  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}-${endDay}, ${year}`;
  } 
  // Different months
  else {
    const startMonthShort = start.toLocaleDateString('en-US', { month: 'short' });
    const endMonthShort = end.toLocaleDateString('en-US', { month: 'short' });
    return `${startMonthShort} ${startDay} - ${endMonthShort} ${endDay}, ${year}`;
  }
}

/**
 * Get relative time description for last update
 * @param {string} lastUpdated - ISO timestamp string
 * @returns {string} Human-readable relative time
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
      minute: '2-digit'
    });
  }
}

/**
 * Get day name with date for current week
 * @param {string} dayName - Day name like "Monday", "Tuesday", etc.
 * @returns {string} Formatted day with date like "Mon 7/7"
 */
export function formatDayWithDate(dayName) {
  const dayMap = {
    'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
    'Thursday': 4, 'Friday': 5, 'Saturday': 6
  };
  
  const dayIndex = dayMap[dayName];
  if (dayIndex === undefined) return dayName;
  
  const { start } = getCurrentWeekRange();
  const targetDate = new Date(start);
  targetDate.setDate(start.getDate() + dayIndex);
  
  const shortDay = dayName.slice(0, 3); // Mon, Tue, etc.
  const month = targetDate.getMonth() + 1;
  const date = targetDate.getDate();
  
  return `${shortDay} ${month}/${date}`;
}

/**
 * Check if a time string represents a closed/unavailable status
 * @param {string} timeString - The time string to check
 * @returns {boolean} True if closed/unavailable
 */
export function isClosedTime(timeString) {
  if (!timeString || typeof timeString !== 'string') return false;
  
  const lowerTime = timeString.toLowerCase();
  return lowerTime.includes('closed') || 
         lowerTime.includes('n/a') || 
         lowerTime.includes('not available') ||
         lowerTime.includes('unavailable');
}

/**
 * Normalize time format to match library/recreation style
 * Converts "7:00 AM - 9:00 AM" to "7 a.m. - 9 a.m."
 * @param {string} timeString - The time string to normalize
 * @returns {string} Normalized time string
 */
export function normalizeTimeFormat(timeString) {
  if (!timeString || typeof timeString !== 'string') {
    return timeString;
  }

  // Don't modify closed/unavailable status
  if (isClosedTime(timeString)) {
    return timeString;
  }

  // Convert AM/PM format to a.m./p.m. format while preserving :00 for consistency
  return timeString
    // Convert "12:00 AM" to "12:00 a.m.", "1:00 AM" to "1:00 a.m.", etc. (preserve :00)
    .replace(/(\d{1,2}):00\s*AM/gi, '$1:00 a.m.')
    // Convert "12:30 AM" to "12:30 a.m.", "1:30 AM" to "1:30 a.m.", etc.
    .replace(/(\d{1,2}):(\d{2})\s*AM/gi, '$1:$2 a.m.')
    // Convert "12:00 PM" to "12:00 p.m.", "1:00 PM" to "1:00 p.m.", etc. (preserve :00)
    .replace(/(\d{1,2}):00\s*PM/gi, '$1:00 p.m.')
    // Convert "12:30 PM" to "12:30 p.m.", "1:30 PM" to "1:30 p.m.", etc.
    .replace(/(\d{1,2}):(\d{2})\s*PM/gi, '$1:$2 p.m.')
    // Clean up any extra spaces but preserve newlines
    .replace(/[ \t]+/g, ' ')
    .replace(/[ \t]*\n[ \t]*/g, '\n')
    .trim();
}