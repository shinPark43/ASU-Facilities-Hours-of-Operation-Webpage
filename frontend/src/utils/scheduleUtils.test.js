import { describe, test, expect } from 'vitest';
import { extractCourseCode, matchScheduleToTutoring } from './scheduleUtils.js';

const MOCK_TUTORING = {
  subjects: {
    Chemistry: {
      courses: {
        'CHEM 1311 - General Chemistry I': {
          code: 'CHEM 1311',
          sessions: [{ day: 'Monday', time: '2-4 p.m.', location: 'LIB 320' }],
        },
        'CHEM 3451 - Organic Chemistry': {
          code: 'CHEM 3451',
          sessions: [{ day: 'Tuesday', time: '1-3 p.m.', location: 'LIB 320' }],
        },
      },
    },
    'Computer Science*': {
      courses: {
        'All Computer Science Courses': {
          code: null,
          sessions: [{ day: 'Wednesday', time: '10 a.m.-2 p.m.', location: 'MCS 214' }],
        },
      },
    },
    'Math Lab': {
      courses: {
        'Math Lab (Drop-in Help)': {
          code: null,
          sessions: [{ day: 'Monday', time: '9 a.m.-6 p.m.', location: 'LIB 328' }],
        },
      },
    },
  },
};

describe('scheduleUtils — course-to-tutoring auto-matcher', () => {
  test('extracts normalized department and course number', () => {
    expect(extractCourseCode('chem1311')).toEqual({ dept: 'CHEM', number: '1311', code: 'CHEM 1311' });
    expect(extractCourseCode('CS 2336 - Data Structures')).toEqual({ dept: 'CS', number: '2336', code: 'CS 2336' });
  });

  test('matches exact course codes and department drop-in labs', () => {
    const schedule = [
      { id: '1', name: 'CHEM 1311', days: ['Monday', 'Wednesday'], startTime: '09:00', endTime: '09:50' },
      { id: '2', name: 'CS 1336', days: ['Tuesday', 'Thursday'], startTime: '11:00', endTime: '12:15' },
      { id: '3', name: 'MATH 2413', days: ['Monday', 'Wednesday', 'Friday'], startTime: '13:00', endTime: '13:50' },
      { id: '4', name: 'ART 1301', days: ['Friday'], startTime: '14:00', endTime: '15:00' },
    ];

    const matched = matchScheduleToTutoring(schedule, MOCK_TUTORING);
    expect(matched).toHaveLength(3);

    expect(matched[0].scheduleCourse.name).toBe('CHEM 1311');
    expect(matched[0].matches[0].subjectName).toBe('Chemistry');
    expect(matched[0].matches[0].matchType).toBe('exact');

    expect(matched[1].scheduleCourse.name).toBe('CS 1336');
    expect(matched[1].matches[0].subjectName).toBe('Computer Science*');
    expect(matched[1].matches[0].matchType).toBe('department');

    expect(matched[2].scheduleCourse.name).toBe('MATH 2413');
    expect(matched[2].matches[0].subjectName).toBe('Math Lab');
  });
});
