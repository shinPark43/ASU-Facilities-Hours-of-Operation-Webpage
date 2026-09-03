# Database Schema

Two separate SQLite databases, both running in WAL mode for better read concurrency.

---

## facilities.db

**File:** `backend/data/facilities.db`  
**Module:** `backend/src/database.js`

### `facilities`

Stores one record per facility. Seeded with default records on first init.

| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PK | Auto-increment |
| `name` | TEXT UNIQUE | e.g. "Porter Henderson Library" |
| `type` | TEXT | `library`, `recreation`, `dining`, `ram_tram` |
| `description` | TEXT | |
| `website_url` | TEXT | |
| `created_at` | DATETIME | |
| `updated_at` | DATETIME | |

### `facility_hours`

Stores individual open/close entries per facility section per day.

| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PK | Auto-increment |
| `facility_id` | INTEGER FK | References `facilities.id` |
| `section_name` | TEXT | e.g. "Main Library", "Starbucks" |
| `day_of_week` | TEXT | e.g. "Monday" |
| `open_time` | TEXT | e.g. "7:30 a.m." |
| `close_time` | TEXT | e.g. "10:00 p.m." |
| `is_closed` | BOOLEAN | |
| `notes` | TEXT | |
| `created_at` | DATETIME | |
| `updated_at` | DATETIME | |

### `scrape_log`

Audit trail for facility scraping runs.

| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PK | Auto-increment |
| `facility_type` | TEXT | e.g. "library" |
| `status` | TEXT | `started`, `success`, `error` |
| `message` | TEXT | |
| `scraped_at` | DATETIME | |

---

## tutoring.db

**File:** `backend/data/tutoring.db`  
**Module:** `backend/src/tutoring-database.js`

### `subjects`

One record per academic subject category (e.g. "Accounting", "Biology").

| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PK | Auto-increment |
| `name` | TEXT UNIQUE | Subject display name |
| `display_order` | INTEGER | Insertion order from scrape |
| `created_at` | DATETIME | |

### `courses`

One record per course within a subject.

| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PK | Auto-increment |
| `subject_id` | INTEGER FK | References `subjects.id` |
| `code` | TEXT | e.g. "ACCT 2301" (regex-extracted from full name) |
| `full_name` | TEXT | e.g. "ACCT 2301 - Principles of Accounting I-Financial" |
| `has_online` | BOOLEAN | True if any session references "upswing" or "online" |
| `created_at` | DATETIME | |

### `tutoring_sessions`

One record per day/time/location entry for a course.

| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PK | Auto-increment |
| `course_id` | INTEGER FK | References `courses.id` |
| `day_of_week` | TEXT | e.g. "Monday" |
| `time_range` | TEXT | e.g. "1:30-5 p.m." |
| `location` | TEXT | e.g. "RAS 226" |
| `is_online` | BOOLEAN | True if location contains "upswing" or "online" |
| `is_tba` | BOOLEAN | True if day or time is "TBA" |
| `notes` | TEXT | |
| `created_at` | DATETIME | |
| `updated_at` | DATETIME | Refreshed on every scrape |

### `tutoring_scrape_log`

Audit trail for tutoring scraping runs.

| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PK | Auto-increment |
| `status` | TEXT | `started`, `success`, `error` |
| `message` | TEXT | |
| `subjects_count` | INTEGER | |
| `courses_count` | INTEGER | |
| `sessions_count` | INTEGER | |
| `scraped_at` | DATETIME | |

---

## Update Strategy

Both databases use a **full wipe-and-reinsert** strategy inside a single transaction on every scrape run. This means:

- All existing rows are deleted before new data is inserted
- Primary keys are regenerated on every scrape
- No upsert logic — simplicity over stability of IDs
- The transaction ensures no partial state is visible to API readers

> Implication: do not store references to primary keys from these tables in external systems.

---

## WAL Mode

Both databases enable WAL (Write-Ahead Logging):
```sql
PRAGMA journal_mode = WAL;
```

This allows concurrent reads during a write operation, which matters because the 5-min API cache miss and a scrape write could overlap.
