import { describe, test, expect } from 'vitest';
import {
  parseTimeToken,
  parseTimeWindows,
  evaluateFacilityStatus,
  msUntilNextMinute,
} from './timeUtils.js';

// Helper to build a Date corresponding to a specific America/Chicago wall-clock time
// Nov 18, 2026 is CST (UTC-6), Wednesday
function chicagoDate(year, month, day, hour, minute = 0) {
  // CST offset is +6 hours to UTC in November
  return new Date(Date.UTC(year, month - 1, day, hour + 6, minute, 0));
}

describe('timeUtils — live open/closing evaluation', () => {
  test('parses standard, period-less, Noon, Midnight, and Sunset tokens', () => {
    expect(parseTimeToken('7:30 AM')?.minutes).toBe(450);
    expect(parseTimeToken('9 a.m.')?.minutes).toBe(540);
    expect(parseTimeToken('Noon')?.minutes).toBe(720);
    expect(parseTimeToken('Midnight')?.minutes).toBe(0);
    expect(parseTimeToken('4:30', 'pm')?.minutes).toBe(16 * 60 + 30);
    expect(parseTimeToken('Sunset')?.display).toBe('Sunset');
  });

  test('detects closed at 3:00 AM even when today has daytime hours (fixes Home.jsx bug)', () => {
    const schedule = {
      Tuesday: '7:30 AM - 10:00 PM',
      Wednesday: '7:30 AM - 10:00 PM',
    };
    const at3am = chicagoDate(2026, 11, 18, 3, 0); // Wed 3:00 AM CST
    const status = evaluateFacilityStatus(schedule, at3am);

    expect(status.isOpen).toBe(false);
    expect(status.state).toBe('opens-later');
    expect(status.label).toBe('Opens 7:30 AM');
  });

  test('detects still open after midnight from yesterday overnight Library shift', () => {
    const schedule = {
      Tuesday: '7:30 a.m. - 2:00 a.m.',
      Wednesday: '7:30 a.m. - 2:00 a.m.',
    };
    const at130am = chicagoDate(2026, 11, 18, 1, 30); // Wed 1:30 AM CST (30m before Tue 2am close)
    const status = evaluateFacilityStatus(schedule, at130am);

    expect(status.isOpen).toBe(true);
    expect(status.state).toBe('closing-soon');
    expect(status.minutesUntilClose).toBe(30);
    expect(status.label).toContain('Closes in');
  });

  test('detects multi-window CAF meal gap and reports Reopens time', () => {
    const cafSchedule = {
      Wednesday: '9:00 AM - 2:00 PM\n5:00 PM - 8:00 PM',
    };
    const at330pm = chicagoDate(2026, 11, 18, 15, 30); // Wed 3:30 PM CST
    const status = evaluateFacilityStatus(cafSchedule, at330pm);

    expect(status.isOpen).toBe(false);
    expect(status.state).toBe('reopens-later');
    expect(status.label).toBe('Reopens 5:00 PM');
  });

  test('detects closing-soon countdown within 45 minutes of close', () => {
    const gymSchedule = {
      Wednesday: '7 a.m. - 11 p.m.',
    };
    const at1040pm = chicagoDate(2026, 11, 18, 22, 40); // Wed 10:40 PM CST (20 min left)
    const status = evaluateFacilityStatus(gymSchedule, at1040pm);

    expect(status.isOpen).toBe(true);
    expect(status.state).toBe('closing-soon');
    expect(status.minutesUntilClose).toBe(20);
    expect(status.label).toMatch(/Closes in 20/);
  });

  test('handles Ram Tram route objects with inferred start period', () => {
    const ramTramSchedule = {
      Tuesday: { time: '4:30 - 8:30 p.m.', route: 'Gold Route' },
      Wednesday: 'Closed',
    };
    const windows = parseTimeWindows(ramTramSchedule.Tuesday);
    expect(windows).toHaveLength(1);
    expect(windows[0].startMins).toBe(16 * 60 + 30);
    expect(windows[0].endMins).toBe(20 * 60 + 30);

    // Nov 17, 2026 is Tuesday
    const at6pmTue = chicagoDate(2026, 11, 17, 18, 0);
    const status = evaluateFacilityStatus(ramTramSchedule, at6pmTue, { isRamTram: true });
    expect(status.isOpen).toBe(true);
    expect(status.label).toBe('Running');
    expect(status.route).toBe('Gold Route');
  });

  test('msUntilNextMinute aligns to minute boundary', () => {
    const atSec15 = new Date('2026-11-18T12:00:15.000Z');
    expect(msUntilNextMinute(atSec15)).toBe(45000);
  });
});
