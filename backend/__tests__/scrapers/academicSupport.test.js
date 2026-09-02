'use strict';

const fs = require('fs');
const path = require('path');

// Mock tutoringDb before requiring the module under test
jest.mock('../../src/tutoring-database', () => ({
  logScrapeActivity: jest.fn(),
  updateTutoringData: jest.fn().mockResolvedValue({
    subjects_count: 3,
    courses_count: 5,
    sessions_count: 12
  }),
  init: jest.fn().mockResolvedValue(undefined)
}));

// Mock axios before requiring the module under test
jest.mock('axios');
const axios = require('axios');

const {
  extractTutoringHours,
  formatTutoringHours,
  scrapeMathLab,
  scrapeWritingCenter,
  scrapeTutoring
} = require('../../src/scrapers/academicSupport');

const tutoringDb = require('../../src/tutoring-database');

const FIXTURES = path.join(__dirname, '..', 'fixtures');

// ---------------------------------------------------------------------------
// Helper: build minimal accordion HTML for isolated edge-case tests
// ---------------------------------------------------------------------------
function makeTutoringHtml(subjects) {
  const blocks = subjects.map(({ name, tables }) => `
    <div class="accordion_details">
      <div class="accordion_summary">${name}</div>
      <div class="accordion_content">
        ${tables.map(t => `
          <table>
            <caption>${t.caption}</caption>
            <tbody>
              ${t.rows.map(r => `<tr><td>${r.day}</td><td>${r.time}</td><td>${r.loc}</td></tr>`).join('')}
            </tbody>
          </table>`).join('')}
      </div>
    </div>`).join('');
  return `<html><body><div class="details_accordion">${blocks}</div></body></html>`;
}

// ---------------------------------------------------------------------------
// extractTutoringHours(html)
// ---------------------------------------------------------------------------
describe('extractTutoringHours(html)', () => {
  let fixtureHtml;

  beforeAll(() => {
    fixtureHtml = fs.readFileSync(path.join(FIXTURES, 'tutoring-page.html'), 'utf8');
  });

  // --- Fixture-based: real page snapshot ---
  it('returns a non-empty subjects object from real fixture', () => {
    const result = extractTutoringHours(fixtureHtml);
    expect(typeof result).toBe('object');
    expect(Object.keys(result).length).toBeGreaterThan(0);
  });

  it('every subject has at least one course, and every course sessions field is an array', () => {
    const result = extractTutoringHours(fixtureHtml);
    for (const [subject, courses] of Object.entries(result)) {
      expect(Object.keys(courses).length).toBeGreaterThan(0);
      for (const [course, sessions] of Object.entries(courses)) {
        expect(Array.isArray(sessions)).toBe(true);
      }
    }
  });

  it('at least one course in the fixture has non-empty sessions', () => {
    const result = extractTutoringHours(fixtureHtml);
    const hasSession = Object.values(result).some(courses =>
      Object.values(courses).some(sessions => sessions.length > 0)
    );
    expect(hasSession).toBe(true);
  });

  it('every session has day, time, and location fields', () => {
    const result = extractTutoringHours(fixtureHtml);
    for (const courses of Object.values(result)) {
      for (const sessions of Object.values(courses)) {
        for (const session of sessions) {
          expect(session).toHaveProperty('day');
          expect(session).toHaveProperty('time');
          expect(session).toHaveProperty('location');
          expect(session.day).toBeTruthy();
        }
      }
    }
  });

  // --- Synthetic HTML: isolated edge cases ---
  it('multi-course caption: two <br>-separated courses → two course keys with same sessions', () => {
    const html = makeTutoringHtml([{
      name: 'Accounting',
      tables: [{
        caption: 'ACCT 2301 - Principles of Accounting I<br />ACCT 2302 - Principles of Accounting II<br />',
        rows: [{ day: 'Monday', time: '1:30-5 p.m.', loc: 'RAS 226' }]
      }]
    }]);
    const result = extractTutoringHours(html);
    expect(result['Accounting']).toBeDefined();
    const courses = result['Accounting'];
    expect(Object.keys(courses)).toHaveLength(2);
    expect(courses['ACCT 2301 - Principles of Accounting I']).toBeDefined();
    expect(courses['ACCT 2302 - Principles of Accounting II']).toBeDefined();
    // Both should have identical sessions
    expect(courses['ACCT 2301 - Principles of Accounting I'])
      .toEqual(courses['ACCT 2302 - Principles of Accounting II']);
  });

  it('skips subject whose name includes "schedule"', () => {
    const html = makeTutoringHtml([
      {
        name: 'Hours of Operation Schedule',
        tables: [{ caption: 'SKIP 101', rows: [{ day: 'Monday', time: '9 a.m.', loc: 'RAS 100' }] }]
      },
      {
        name: 'Mathematics',
        tables: [{ caption: 'MATH 1301', rows: [{ day: 'Tuesday', time: '10 a.m.', loc: 'MCS 100' }] }]
      }
    ]);
    const result = extractTutoringHours(html);
    expect(result['Hours of Operation Schedule']).toBeUndefined();
    expect(result['Mathematics']).toBeDefined();
  });

  it('skips accordion_details with empty summary text', () => {
    const html = makeTutoringHtml([
      {
        name: '',
        tables: [{ caption: 'EMPTY 101', rows: [{ day: 'Monday', time: '9 a.m.', loc: 'RAS 100' }] }]
      },
      {
        name: 'Biology',
        tables: [{ caption: 'BIOL 1408', rows: [{ day: 'Wednesday', time: '2 p.m.', loc: 'Nursing 204' }] }]
      }
    ]);
    const result = extractTutoringHours(html);
    expect(result['']).toBeUndefined();
    expect(result['Biology']).toBeDefined();
  });

  it('lastValidDay carry-forward: empty day cell with valid time/location inherits previous day', () => {
    // Second row has no day cell content — should inherit "Monday" from first row
    const html = `<html><body><div class="details_accordion">
      <div class="accordion_details">
        <div class="accordion_summary">Chemistry</div>
        <div class="accordion_content">
          <table>
            <caption>CHEM 1301</caption>
            <tbody>
              <tr><td>Monday</td><td>10-11 a.m.</td><td>RAS 100</td></tr>
              <tr><td></td><td>2-3 p.m.</td><td>Upswing (online)</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div></body></html>`;
    const result = extractTutoringHours(html);
    const sessions = result['Chemistry']['CHEM 1301'];
    expect(sessions).toHaveLength(2);
    expect(sessions[1].day).toBe('Monday');
  });

  it('cleans non-breaking space (\\u00A0) in day cell', () => {
    const html = `<html><body><div class="details_accordion">
      <div class="accordion_details">
        <div class="accordion_summary">English</div>
        <div class="accordion_content">
          <table>
            <caption>ENGL 1301</caption>
            <tbody>
              <tr><td>Monday\u00A0</td><td>9 a.m.</td><td>Library 200</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div></body></html>`;
    const result = extractTutoringHours(html);
    const sessions = result['English']['ENGL 1301'];
    expect(sessions[0].day).toBe('Monday');
  });

  it('returns {} when no div.accordion_details found in HTML', () => {
    const result = extractTutoringHours('<html><body><p>No tutoring data here.</p></body></html>');
    expect(result).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// formatTutoringHours(data)
// ---------------------------------------------------------------------------
describe('formatTutoringHours(data)', () => {
  it('passes through valid data unchanged', () => {
    const data = {
      'Biology': {
        'BIOL 1408': [{ day: 'Monday', time: '9 a.m.', location: 'Nursing 204' }]
      }
    };
    const result = formatTutoringHours(data);
    expect(result).toEqual(data);
  });

  it('removes sessions with empty day field', () => {
    const data = {
      'Biology': {
        'BIOL 1408': [
          { day: 'Monday', time: '9 a.m.', location: 'Nursing 204' },
          { day: '', time: '2 p.m.', location: 'Online' }
        ]
      }
    };
    const result = formatTutoringHours(data);
    expect(result['Biology']['BIOL 1408']).toHaveLength(1);
    expect(result['Biology']['BIOL 1408'][0].day).toBe('Monday');
  });

  it('removes courses that have no valid sessions after filtering', () => {
    const data = {
      'Biology': {
        'BIOL 1408': [{ day: '', time: '9 a.m.', location: 'Nursing 204' }]
      }
    };
    const result = formatTutoringHours(data);
    expect(result['Biology']).toBeUndefined();
  });

  it('removes subjects that have no valid courses after filtering', () => {
    const data = {
      'Biology': {
        'BIOL 1408': [{ day: '', time: '9 a.m.', location: 'Nursing 204' }]
      },
      'Mathematics': {
        'MATH 1301': [{ day: 'Tuesday', time: '10 a.m.', location: 'MCS 100' }]
      }
    };
    const result = formatTutoringHours(data);
    expect(result['Biology']).toBeUndefined();
    expect(result['Mathematics']).toBeDefined();
  });

  it('skips subjects named "Unknown"', () => {
    const data = {
      'Unknown': {
        'UNKN 101': [{ day: 'Monday', time: '9 a.m.', location: 'TBD' }]
      }
    };
    const result = formatTutoringHours(data);
    expect(result['Unknown']).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// scrapeMathLab()
// ---------------------------------------------------------------------------
describe('scrapeMathLab()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns { Math Lab: { "Math Lab (Drop-in Help)": [sessions] } } from real fixture HTML', async () => {
    const fixtureHtml = fs.readFileSync(path.join(FIXTURES, 'math-lab-page.html'), 'utf8');
    axios.get.mockResolvedValue({ data: fixtureHtml });

    const result = await scrapeMathLab();

    expect(result).not.toBeNull();
    expect(result['Math Lab']).toBeDefined();
    expect(result['Math Lab']['Math Lab (Drop-in Help)']).toBeDefined();
    expect(Array.isArray(result['Math Lab']['Math Lab (Drop-in Help)'])).toBe(true);
    expect(result['Math Lab']['Math Lab (Drop-in Help)'].length).toBeGreaterThan(0);
  });

  it('returns null if no table with 3+ day abbreviations is found', async () => {
    axios.get.mockResolvedValue({ data: '<html><body><p>No table here.</p></body></html>' });
    const result = await scrapeMathLab();
    expect(result).toBeNull();
  });

  it('returns null on axios network error', async () => {
    axios.get.mockRejectedValue(new Error('Network error'));
    const result = await scrapeMathLab();
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// scrapeWritingCenter()
// ---------------------------------------------------------------------------
describe('scrapeWritingCenter()', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns { "Writing Center": { [heading]: [sessions] } } from real fixture HTML', async () => {
    const fixtureHtml = fs.readFileSync(path.join(FIXTURES, 'writing-center-page.html'), 'utf8');
    axios.get.mockResolvedValue({ data: fixtureHtml });

    const result = await scrapeWritingCenter();

    expect(result).not.toBeNull();
    expect(result['Writing Center']).toBeDefined();
    const courses = Object.keys(result['Writing Center']);
    expect(courses.length).toBeGreaterThan(0);
    const firstSessions = result['Writing Center'][courses[0]];
    expect(Array.isArray(firstSessions)).toBe(true);
    expect(firstSessions.length).toBeGreaterThan(0);
  });

  it('returns null if no matching tables found', async () => {
    axios.get.mockResolvedValue({ data: '<html><body><p>No tables.</p></body></html>' });
    const result = await scrapeWritingCenter();
    expect(result).toBeNull();
  });

  it('returns null on axios network error', async () => {
    axios.get.mockRejectedValue(new Error('Network error'));
    const result = await scrapeWritingCenter();
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// scrapeTutoring() — integration: all I/O mocked
// ---------------------------------------------------------------------------
describe('scrapeTutoring() [integration — all I/O mocked]', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    tutoringDb.updateTutoringData.mockResolvedValue({
      subjects_count: 3,
      courses_count: 5,
      sessions_count: 12
    });
  });

  it('returns { success: true, subjects_count, courses_count, sessions_count } on success', async () => {
    const fixtureHtml = fs.readFileSync(path.join(FIXTURES, 'tutoring-page.html'), 'utf8');
    const mathHtml = fs.readFileSync(path.join(FIXTURES, 'math-lab-page.html'), 'utf8');
    const writingHtml = fs.readFileSync(path.join(FIXTURES, 'writing-center-page.html'), 'utf8');

    axios.get
      .mockResolvedValueOnce({ data: fixtureHtml })  // TUTORING_URL
      .mockResolvedValueOnce({ data: mathHtml })      // MATH_LAB_URL
      .mockResolvedValueOnce({ data: writingHtml });  // WRITING_CENTER_URL

    const result = await scrapeTutoring();

    expect(result.success).toBe(true);
    expect(typeof result.subjects_count).toBe('number');
    expect(typeof result.courses_count).toBe('number');
    expect(typeof result.sessions_count).toBe('number');
  });

  it('calls logScrapeActivity with "started" then "success" on a successful scrape', async () => {
    const fixtureHtml = fs.readFileSync(path.join(FIXTURES, 'tutoring-page.html'), 'utf8');
    const mathHtml = fs.readFileSync(path.join(FIXTURES, 'math-lab-page.html'), 'utf8');
    const writingHtml = fs.readFileSync(path.join(FIXTURES, 'writing-center-page.html'), 'utf8');

    axios.get
      .mockResolvedValueOnce({ data: fixtureHtml })
      .mockResolvedValueOnce({ data: mathHtml })
      .mockResolvedValueOnce({ data: writingHtml });

    await scrapeTutoring();

    const calls = tutoringDb.logScrapeActivity.mock.calls;
    expect(calls[0][0]).toBe('started');
    expect(calls[1][0]).toBe('success');
  });

  it('throws and logs "error" when tutoring page returns HTML with no accordion_details', async () => {
    axios.get.mockResolvedValue({ data: '<html><body><p>No data.</p></body></html>' });

    await expect(scrapeTutoring()).rejects.toThrow();

    const calls = tutoringDb.logScrapeActivity.mock.calls;
    const errorCall = calls.find(c => c[0] === 'error');
    expect(errorCall).toBeDefined();
  });
});
