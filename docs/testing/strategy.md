# Testing Strategy

## Core Problem with Scraper Testing

Scrapers have two distinct concerns that must be tested separately:

1. **Parsing logic** — does your code correctly extract data from HTML?
2. **Live contract** — is the website's HTML still the shape your selectors expect?

Mixing these in one test creates slow, flaky, non-deterministic tests. The live URL check is a separate concern from the parsing logic.

---

## Three-Layer Strategy

### Layer 1 — Unit Tests (fast, offline, deterministic)

Test each function in isolation using **HTML fixtures** — saved snapshots of the real pages stored in `backend/__tests__/fixtures/`. No network calls, no database.

**Priority targets for `academicSupport.js`:**

| Function | Why |
|---|---|
| `extractTutoringHours(html)` | Highest priority — pure function, most logic, most fragile |
| `formatTutoringHours(data)` | Guards against bad data reaching the DB |
| `scrapeMathLab()` | Axios mocked; tests column-per-day parsing logic |
| `scrapeWritingCenter()` | Axios mocked; tests heading-grouped table parsing |

**Key cases for `extractTutoringHours`:**

- Happy path: returns `{ SubjectName: { CourseName: [{ day, time, location }] } }`
- Multi-course caption: one `<caption>` with two courses separated by `<br />` → two separate course keys with same sessions
- Empty `accordion_summary` → subject skipped
- Subject name containing "schedule" → skipped (guard clause)
- TBA session → preserved, not dropped
- Non-breaking space (`\u00A0`) in day cell → cleaned correctly
- Empty day cell with valid time/location → `lastValidDay` carry-forward applied

### Layer 2 — Integration Tests (real DB, mocked network)

Test `scrapeTutoring()` end-to-end with:
- Axios mocked to return fixture HTML
- Real SQLite running on `:memory:` (not the file DB)
- Assert actual DB state after the scrape completes

Catches bugs in the merge, sort, format, and DB write path that unit tests miss.

**Key assertions:**
- `subjects_count`, `courses_count`, `sessions_count` are all non-zero
- `logScrapeActivity` called with `'started'` then `'success'`
- On parse failure, `logScrapeActivity` called with `'error'`
- Multi-course subjects exist as separate DB rows

### Layer 3 — Contract Tests (scheduled, live network)

A separate test file that runs **weekly on a schedule** (not in regular CI). Hits the real ASU pages and checks that the expected HTML structure is still present — not the data values, just the selectors.

**What to check:**
- `div.accordion_details` exists and count > 0
- `div.accordion_summary` present inside each
- `div.accordion_content table` present with `<caption>` and `<tbody>`
- Math Lab page has a table with ≥3 day abbreviations in the first row
- Writing Center page has at least one heading + table pair

A contract test failure means the page was redesigned and the parser needs updating — exactly the situation that caused the silent breakage in this codebase.

---

## Fixture Management

HTML fixtures are saved snapshots of real pages at a known-good point in time.

**Location:** `backend/__tests__/fixtures/`

```
fixtures/
  tutoring-page.html       ← snapshot of the main tutoring page
  math-lab-page.html       ← snapshot of the math lab page
  writing-center-page.html ← snapshot of the writing center page
```

**How to update fixtures:**
```bash
curl -s "https://www.angelo.edu/current-students/freshman-college/academic-tutoring.php" \
  > backend/__tests__/fixtures/tutoring-page.html
```

Update fixtures when:
- The live page is redesigned (after updating selectors)
- A new semester schedule goes live with structural changes

---

## Test Framework

| Tool | Purpose |
|---|---|
| Jest | Test runner, assertions, coverage |
| `jest.mock` / `axios-mock-adapter` | Mock HTTP calls in unit tests |
| `:memory:` SQLite | Real DB for integration tests, no file pollution |
| `fs.readFileSync` | Load HTML fixtures in unit/integration tests |

---

## What Good Test Coverage Looks Like

The `extractTutoringHours(html)` function is the single most important function to test because:
1. It is a pure function — easy to test with zero setup
2. It is the most fragile — directly coupled to the ASU page's HTML structure
3. It was already silently broken once — and nobody knew until we manually inspected the page

A comprehensive test for this function is more valuable than broad coverage of the glue code.
