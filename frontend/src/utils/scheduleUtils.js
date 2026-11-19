/**
 * Shared personal schedule storage + auto-matching between My Schedule courses and ASU Tutoring
 */

export const SCHEDULE_STORAGE_KEY = 'asu-schedule-courses';

// Department code -> ASU Tutoring subject aliases
const DEPT_SUBJECT_HINTS = {
  CS: ['computer science'],
  CSEC: ['computer science', 'cybersecurity'],
  MATH: ['math lab', 'mathematics', 'math'],
  STAT: ['math lab', 'statistics', 'math'],
  ENGL: ['writing center', 'english'],
  ENG: ['writing center', 'english'],
  BIOL: ['biology'],
  BIO: ['biology'],
  CHEM: ['chemistry'],
  PHYS: ['physics'],
  ACCT: ['accounting'],
  ECON: ['economics'],
  FINC: ['finance'],
  BCIS: ['business computer info systems', 'bcis'],
  POLS: ['political science', 'government'],
  HIST: ['history'],
  PSY: ['psychology'],
  PSYC: ['psychology'],
  SPAN: ['spanish'],
  FREN: ['french'],
  GERM: ['german'],
  GEOL: ['geology'],
  NUR: ['nursing'],
  NURS: ['nursing'],
  HSP: ['health science'],
  MUSI: ['music'],
};

export function loadScheduleCourses() {
  try {
    const raw = localStorage.getItem(SCHEDULE_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveScheduleCourses(courses) {
  try {
    localStorage.setItem(SCHEDULE_STORAGE_KEY, JSON.stringify(courses));
    window.dispatchEvent(new CustomEvent('asu-schedule-updated', { detail: courses }));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Extract normalized department + course number from a user-entered course name.
 * Examples:
 *  "MATH 1314" -> { dept: "MATH", number: "1314", code: "MATH 1314" }
 *  "chem1311 - Gen Chem" -> { dept: "CHEM", number: "1311", code: "CHEM 1311" }
 *  "CS 2336" -> { dept: "CS", number: "2336", code: "CS 2336" }
 */
export function extractCourseCode(courseName) {
  if (!courseName || typeof courseName !== 'string') return null;
  const cleaned = courseName.trim().toUpperCase();
  const match = cleaned.match(/\b([A-Z]{2,4})\s*[-–]?\s*(\d{4})\b/);
  if (match) {
    return {
      dept: match[1],
      number: match[2],
      code: `${match[1]} ${match[2]}`,
    };
  }
  // Check standalone department prefix (e.g., "Calculus", "CS Lab")
  const deptOnly = cleaned.match(/^([A-Z]{2,4})\b/);
  if (deptOnly && DEPT_SUBJECT_HINTS[deptOnly[1]]) {
    return { dept: deptOnly[1], number: null, code: null };
  }
  return null;
}

/**
 * Match a student's saved courses in My Schedule against the tutoring catalog from /api/tutoring.
 * Returns an array of matches:
 *   [{ scheduleCourse, matches: [{ subjectName, courseName, course, matchType }] }]
 */
export function matchScheduleToTutoring(scheduleCourses, tutoringData) {
  if (!Array.isArray(scheduleCourses) || scheduleCourses.length === 0) return [];
  const subjects = tutoringData?.subjects;
  if (!subjects || typeof subjects !== 'object') return [];

  const results = [];

  for (const scheduleCourse of scheduleCourses) {
    const rawName = (scheduleCourse?.name || '').trim();
    if (!rawName) continue;

    const lowerName = rawName.toLowerCase();
    const parsed = extractCourseCode(rawName);
    const exactMatches = [];
    const subjectMatches = [];
    const seen = new Set();

    for (const [subjectName, subjectObj] of Object.entries(subjects)) {
      const lowerSubject = subjectName.toLowerCase();
      const courses = subjectObj?.courses || {};

      for (const [courseName, courseObj] of Object.entries(courses)) {
        const lowerCourse = courseName.toLowerCase();
        const lowerCode = (courseObj?.code || '').toLowerCase();
        const dedupeKey = `${subjectName}::${courseName}`;
        if (seen.has(dedupeKey)) continue;

        // 1. Exact course code match (e.g. "CHEM 1311" matches "CHEM 1311 - General Chemistry I" or "FREN* - 1301 ...")
        const isExactCode =
          parsed?.code &&
          (lowerCode === parsed.code.toLowerCase() ||
            lowerCourse.includes(parsed.code.toLowerCase()) ||
            (parsed.dept && parsed.number && lowerCourse.includes(parsed.dept.toLowerCase()) && lowerCourse.includes(parsed.number)));

        // 2. Direct title match (e.g. "Organic Chemistry" matches "CHEM 3451 - Organic Chemistry")
        const isDirectTitle =
          rawName.length >= 4 &&
          (lowerCourse.includes(lowerName) || (lowerName.length >= 6 && lowerName.includes(lowerCourse)));

        if (isExactCode || isDirectTitle) {
          seen.add(dedupeKey);
          exactMatches.push({
            subjectName,
            courseName,
            course: courseObj,
            matchType: 'exact',
          });
          continue;
        }

        // 3. Broad subject / drop-in lab match (e.g. "CS 1336" -> "All Computer Science Courses", "MATH 1314" -> "Math Lab")
        const deptHints = parsed?.dept ? DEPT_SUBJECT_HINTS[parsed.dept] || [] : [];
        const matchesDeptSubject =
          deptHints.length > 0 && deptHints.some((hint) => lowerSubject.includes(hint));

        const isWildcardCourse =
          lowerCourse.includes('all ') ||
          lowerCourse.includes('drop-in') ||
          lowerSubject.includes('math lab') ||
          lowerSubject.includes('writing center') ||
          Object.keys(courses).length === 1;

        if (matchesDeptSubject && isWildcardCourse) {
          seen.add(dedupeKey);
          subjectMatches.push({
            subjectName,
            courseName,
            course: courseObj,
            matchType: 'department',
          });
        }
      }
    }

    const combined = exactMatches.length > 0 ? exactMatches : subjectMatches;
    if (combined.length > 0) {
      results.push({
        scheduleCourse,
        matches: combined,
      });
    }
  }

  return results;
}
