# ADR 001: Extract Academic Support Scrapers into Dedicated Module

**Date:** September 2026  
**Status:** Implemented  
**Branch:** `fix/fall_hours_3`

---

## Context

`ScraperManager.js` (1400+ lines) was a god class responsible for scraping all ASU facilities: library, recreation, dining, ram tram, **and** academic support (tutoring, math lab, writing center). The academic support scrapers — `scrapeTutoring`, `extractTutoringHours`, `scrapeMathLab`, `scrapeWritingCenter`, `formatTutoringHours` — had no logical relationship to the facility scrapers beyond sharing the same file.

The tutoring scraper was also silently broken. The ASU tutoring page had been redesigned from a LiveWhale JavaScript-rendered accordion (`section.lw_accordion_block`) to a static HTML CSS accordion (`div.accordion_details`). The old selectors returned empty results. Because the weekly cron was paused (semester schedule not yet live), no error surfaced.

---

## Problem

1. **God class:** `ScraperManager.js` violated the Single Responsibility Principle. Tutoring logic was buried inside a 1400-line file alongside unrelated facility scrapers.

2. **Broken scraper:** `extractTutoringHours` used Puppeteer with stale LiveWhale selectors that no longer existed on the page.

3. **Unnecessary Puppeteer usage:** The redesigned tutoring page serves static HTML — no JavaScript rendering required. Puppeteer added overhead (full browser launch) with no benefit.

4. **Multi-course caption not handled:** The old `page.evaluate()` approach collapsed multi-course captions (multiple courses separated by `<br />`) into a single concatenated string, creating one course key instead of separate keys per course.

---

## Decision

Extract all academic support scraping into a standalone module: `backend/src/scrapers/academicSupport.js`.

Rewrite `extractTutoringHours` using Cheerio with updated selectors matching the current page structure. Drop Puppeteer for the tutoring path entirely.

Extract `retryWithBackoff` into a shared utility: `backend/src/utils/retry.js`.

---

## What Changed

| Before | After |
|---|---|
| `ScraperManager.scrapeTutoring(browser)` | `academicSupport.scrapeTutoring()` — no browser arg |
| `page.evaluate()` with Puppeteer | `cheerio.load(html)` with Axios |
| `section.lw_accordion_block` | `div.accordion_details` |
| `h4.lw_accordion_block_title` | `div.accordion_summary` |
| `.lw_accordion_block_content` | `div.accordion_content` |
| Single string from `caption.textContent` | Split on `<br>` → array of course names |
| `retryWithBackoff` defined in ScraperManager | Extracted to `src/utils/retry.js` |

### Files created
- `backend/src/scrapers/academicSupport.js`
- `backend/src/utils/retry.js`

### Files modified
- `backend/src/ScraperManager.js` — removed 5 tutoring methods, updated delegation calls, removed `tutoringDb` import

### Files untouched
- `backend/server.js`
- `backend/src/scraper.js`
- `backend/src/tutoring-database.js`
- `backend/src/routes/tutoring.js`

---

## Alternatives Considered

**Keep everything in ScraperManager, just fix the selectors.**  
Rejected. The selectors were broken, but the architecture problem remained. Fixing selectors in a god class doesn't prevent the same confusion next time. The module boundary makes future maintenance obvious.

**Use Puppeteer with updated selectors.**  
Rejected. The page is static HTML — Puppeteer adds a full browser launch (~3s startup, high memory) with no benefit. Cheerio processes static HTML in milliseconds.

---

## Consequences

- `ScraperManager.js` is reduced by ~320 lines
- Tutoring scrapes no longer launch a Puppeteer browser
- Multi-course captions now produce separate course keys correctly
- `retryWithBackoff` is now shareable across future scraper modules
- Future scraper modules for static HTML pages have a clear pattern to follow (`src/scrapers/`)

---

## Verification

Smoke test run after implementation:

```
subjects_count: 18
courses_count: 39
sessions_count: 168
```

Multi-course caption confirmed: Accounting subject produced two separate DB rows (`ACCT 2301 - ...` and `ACCT 2302 - ...`) with identical sessions.
