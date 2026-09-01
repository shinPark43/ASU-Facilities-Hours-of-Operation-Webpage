# API Endpoints

Base URL (production): set via `REACT_APP_API_URL` environment variable  
All responses are JSON. All successful responses include `{ success: true, data: ... }`.

---

## Health

### `GET /api/health`
Returns server status and available routes.

```json
{
  "status": "ok",
  "routes": {
    "facilities": "/api/facilities",
    "tutoring": "/api/tutoring"
  }
}
```

---

## Facilities

### `GET /api/facilities`
All facilities with their hours.

### `GET /api/facilities/:type`
Hours for a specific facility. Valid types: `library`, `recreation`, `dining`, `ram_tram`

**Response shape:**
```json
{
  "success": true,
  "data": {
    "name": "Porter Henderson Library",
    "type": "library",
    "sections": {
      "Main Library": {
        "Monday": "7:30 a.m. - 10:00 p.m.",
        "Tuesday": "7:30 a.m. - 10:00 p.m."
      }
    },
    "last_updated": "2026-09-01T00:00:00.000Z"
  },
  "cached": true
}
```

> Ram Tram sections return `{ time, route }` objects instead of plain strings.

**Cache:** 5-minute in-memory cache per facility type.

---

## Tutoring

### `GET /api/tutoring`
All academic support data (tutoring, math lab, writing center).

**Response shape:**
```json
{
  "success": true,
  "data": {
    "subjects": {
      "Accounting": {
        "id": 1,
        "name": "Accounting",
        "courses": {
          "ACCT 2301 - Principles of Accounting I-Financial": {
            "id": 1,
            "code": "ACCT 2301",
            "name": "ACCT 2301 - Principles of Accounting I-Financial",
            "has_online": false,
            "sessions": [
              { "id": 1, "day": "Monday", "time": "1:30-5 p.m.", "location": "RAS 226", "is_online": false, "is_tba": false }
            ]
          }
        }
      }
    },
    "last_updated": "2026-09-01T00:00:00.000Z"
  },
  "cached": false
}
```

**Cache:** 5-minute in-memory cache. Invalidated if `subjects` is empty (guards against serving a stale empty result after a failed scrape).

### `GET /api/tutoring/subjects`
List of all subjects.

### `GET /api/tutoring/subjects/:id/courses`
Courses for a specific subject by ID.

### `GET /api/tutoring/courses/:id/sessions`
Sessions for a specific course by ID.

### `GET /api/tutoring/search?q=:query`
Search courses by name or code. Query must be ≥2 characters.

```json
{
  "success": true,
  "data": { "subjects": { ... } },
  "query": "ACCT"
}
```

---

## Calendar

### `GET /api/calendar/upcoming`
Upcoming ASU academic calendar events, scraped from the ASU registrar page.

**Cache:** 24-hour in-memory cache.

---

## Events

### `GET /api/events`
Campus events from the ASU events calendar.

---

## Error Responses

All errors return:
```json
{
  "success": false,
  "error": "Human-readable error description",
  "message": "Technical error message"
}
```

| Status | Meaning |
|---|---|
| 400 | Bad request (e.g. search query too short) |
| 500 | Server error (DB failure, scrape failure) |
