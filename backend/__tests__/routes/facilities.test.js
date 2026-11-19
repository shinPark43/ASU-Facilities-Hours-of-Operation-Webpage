const express = require('express');
const http = require('http');

jest.mock('../../src/database', () => ({
  getAllFacilities: jest.fn(),
  getFacilityHours: jest.fn(),
  updateFacilityHours: jest.fn(),
  getRecentScrapeLogs: jest.fn(),
}));

jest.mock('../../src/scraper', () => ({
  getScraperManager: jest.fn(),
}));

const db = require('../../src/database');
const { getScraperManager } = require('../../src/scraper');
const facilitiesRouter = require('../../src/routes/facilities');

function createTestServer() {
  const app = express();
  app.use(express.json());
  app.use('/api/facilities', facilitiesRouter);
  return app;
}

function request(server, { method = 'GET', path, headers = {}, body = null }) {
  return new Promise((resolve, reject) => {
    const addr = server.address();
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: addr.port,
        path,
        method,
        headers: {
          ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } : {}),
          ...headers,
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, body: data });
          }
        });
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

describe('Facilities routes — auth, essentials, dining menu', () => {
  let server;
  const originalAdminKey = process.env.ADMIN_API_KEY;

  beforeAll((done) => {
    const app = createTestServer();
    server = app.listen(0, done);
  });

  afterAll((done) => {
    if (originalAdminKey === undefined) delete process.env.ADMIN_API_KEY;
    else process.env.ADMIN_API_KEY = originalAdminKey;
    server.close(done);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    facilitiesRouter._clearCache();
    delete process.env.ADMIN_API_KEY;
  });

  describe('POST /api/facilities/:type/hours authentication', () => {
    test('returns 503 when ADMIN_API_KEY is not configured (fail closed)', async () => {
      const res = await request(server, {
        method: 'POST',
        path: '/api/facilities/library/hours',
        body: { hours: [] },
      });

      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
      expect(db.updateFacilityHours).not.toHaveBeenCalled();
    });

    test('returns 401 when API key header is missing', async () => {
      process.env.ADMIN_API_KEY = 'super-secret-key';
      const res = await request(server, {
        method: 'POST',
        path: '/api/facilities/library/hours',
        body: { hours: [] },
      });

      expect(res.status).toBe(401);
      expect(db.updateFacilityHours).not.toHaveBeenCalled();
    });

    test('returns 401 when API key is wrong', async () => {
      process.env.ADMIN_API_KEY = 'super-secret-key';
      const res = await request(server, {
        method: 'POST',
        path: '/api/facilities/library/hours',
        headers: { 'X-API-Key': 'wrong-key' },
        body: { hours: [] },
      });

      expect(res.status).toBe(401);
      expect(db.updateFacilityHours).not.toHaveBeenCalled();
    });

    test('accepts valid X-API-Key header and updates hours', async () => {
      process.env.ADMIN_API_KEY = 'super-secret-key';
      db.updateFacilityHours.mockResolvedValue();

      const res = await request(server, {
        method: 'POST',
        path: '/api/facilities/library/hours',
        headers: { 'X-API-Key': 'super-secret-key' },
        body: { hours: [{ section_name: 'Main Library', day_of_week: 'Monday', open_time: '7:30 AM - 2:00 AM' }] },
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(db.updateFacilityHours).toHaveBeenCalledTimes(1);
    });

    test('accepts valid Authorization Bearer token', async () => {
      process.env.ADMIN_API_KEY = 'super-secret-key';
      db.updateFacilityHours.mockResolvedValue();

      const res = await request(server, {
        method: 'POST',
        path: '/api/facilities/essentials/hours',
        headers: { Authorization: 'Bearer super-secret-key' },
        body: { hours: [] },
      });

      expect(res.status).toBe(200);
      expect(db.updateFacilityHours).toHaveBeenCalledWith('essentials', []);
    });

    test('rejects invalid facility type even with valid key', async () => {
      process.env.ADMIN_API_KEY = 'super-secret-key';
      const res = await request(server, {
        method: 'POST',
        path: '/api/facilities/unknown_place/hours',
        headers: { 'X-API-Key': 'super-secret-key' },
        body: { hours: [] },
      });

      expect(res.status).toBe(400);
      expect(db.updateFacilityHours).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/facilities/essentials', () => {
    test('returns built-in ASU Campus Essentials when DB has no rows yet', async () => {
      db.getFacilityHours.mockResolvedValue([]);

      const res = await request(server, { path: '/api/facilities/essentials' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.sections).toHaveProperty('Ram Central Station (Bookstore)');
      expect(res.body.data.sections).toHaveProperty('Mail Services (Post Office)');
      expect(res.body.data.sections).toHaveProperty('University Health Clinic');
    });
  });

  describe('GET /api/facilities/dining/menu', () => {
    test('returns scraped dining menu and caches subsequent calls', async () => {
      const scrapeDiningMenu = jest.fn().mockResolvedValue({
        venue: 'the-caf',
        date: '2026-11-18',
        sourceUrl: 'https://new.dineoncampus.com/Angelo/whats-on-the-menu/the-caf/',
        available: true,
        periods: [
          {
            name: 'Lunch',
            stations: [{ name: 'Grill', items: [{ name: 'Grilled Chicken', calories: '320', dietary: [] }] }],
          },
        ],
      });
      getScraperManager.mockReturnValue({ scrapeDiningMenu });

      const first = await request(server, { path: '/api/facilities/dining/menu' });
      expect(first.status).toBe(200);
      expect(first.body.cached).toBe(false);
      expect(first.body.data.available).toBe(true);
      expect(first.body.data.periods[0].name).toBe('Lunch');

      const second = await request(server, { path: '/api/facilities/dining/menu' });
      expect(second.status).toBe(200);
      expect(second.body.cached).toBe(true);
      expect(scrapeDiningMenu).toHaveBeenCalledTimes(1);
    });

    test('returns graceful unavailable payload if scraper throws', async () => {
      getScraperManager.mockReturnValue({
        scrapeDiningMenu: jest.fn().mockRejectedValue(new Error('Browser error')),
      });

      const res = await request(server, { path: '/api/facilities/dining/menu?venue=the-caf' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.available).toBe(false);
      expect(res.body.data.periods).toEqual([]);
    });
  });
});
