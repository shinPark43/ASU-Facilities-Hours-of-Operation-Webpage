import { describe, test, expect } from 'vitest';
import { generateScheduleIcs, buildCourseGoogleCalendarUrl } from './calendarExport.js';

describe('calendarExport — My Schedule .ics & Google Calendar export', () => {
  const sampleCourses = [
    {
      id: 'course-1',
      name: 'MATH 1314',
      days: ['Monday', 'Wednesday', 'Friday'],
      startTime: '09:00',
      endTime: '09:50',
      location: 'MCS 216',
      professor: 'Dr. Smith',
    },
  ];

  test('generates valid RFC 5545 ICS with VTIMEZONE and weekly RRULE', () => {
    const ics = generateScheduleIcs(sampleCourses, {
      referenceDate: new Date(2026, 7, 24), // Monday Aug 24, 2026
      weeks: 16,
    });

    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('TZID:America/Chicago');
    expect(ics).toContain('DTSTART;TZID=America/Chicago:20260824T090000');
    expect(ics).toContain('DTEND;TZID=America/Chicago:20260824T095000');
    expect(ics).toContain('RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR;COUNT=48');
    expect(ics).toContain('SUMMARY:MATH 1314');
    expect(ics).toContain('LOCATION:MCS 216');
    expect(ics).toContain('Professor: Dr. Smith');
    expect(ics).toContain('END:VCALENDAR');
  });

  test('builds recurring Google Calendar URL for a course', () => {
    const url = buildCourseGoogleCalendarUrl(sampleCourses[0], {
      referenceDate: new Date(2026, 7, 24),
    });

    expect(url).toContain('https://calendar.google.com/calendar/render?');
    expect(url).toContain('text=MATH+1314');
    expect(url).toContain('ctz=America%2FChicago');
    expect(url).toContain('BYDAY%3DMO%2CWE%2CFR');
  });
});
