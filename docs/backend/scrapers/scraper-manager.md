# ScraperManager

**File:** `backend/src/ScraperManager.js`  
**Wrapper:** `backend/src/scraper.js` (singleton, used by `server.js`)

Manages Puppeteer-based scraping for all ASU facility hours. Facilities require a full browser because their pages use JavaScript rendering.

---

## Facilities Owned

| Facility | Type key | Method |
|---|---|---|
| Porter Henderson Library | `library` | `scrapeLibrary(browser)` |
| CHP Fitness Center (Gym) | `recreation` | `scrapeRecreation(browser)` |
| Dining (CAF, Marketplace, etc.) | `dining` | `scrapeDining(browser)` |
| Ram Tram | `ram_tram` | `scrapeRamTram(browser)` |

> Academic support (tutoring, math lab, writing center) was extracted to `src/scrapers/academicSupport.js`. See `docs/decisions/001-extract-academic-support.md`.

---

## Public Interface (via `scraper.js` wrapper)

```js
const scraper = require('./src/scraper');

await scraper.scrapeSpecificFacility('library');    // single facility
await scraper.scrapeSpecificFacility('tutoring');   // delegates to academicSupport
await scraper.scrapeAllFacilities();                // all facilities in sequence
await scraper.closeBrowser();
```

Valid facility types: `library`, `recreation`, `dining`, `ram_tram`, `tutoring`

---

## Browser Lifecycle

ScraperManager lazily creates and reuses a single Puppeteer browser instance across scrape calls (`getBrowser()`). The browser is closed explicitly via `closeBrowser()` on server shutdown.

---

## Retry Strategy

All scrapes are wrapped in `retryWithBackoff` (from `src/utils/retry.js`):
- Max 2 retries
- Exponential backoff: 1s, 2s
- Each facility fails independently — one failure does not abort others

---

## Adding a New Facility Scraper

1. Add a `scrapeXxx(browser)` method to the `ScraperManager` class
2. Add the type key to `validTypes` in `scrapeSpecificFacility()`
3. Add a `case 'xxx':` to the switch in `scrapeSpecificFacility()`
4. Add a `results.xxx` entry in `scrapeAll()` with retry wrapper
5. Add the facility record to `database.js` → `insertDefaultFacilities()`

If the page is **static HTML** (no JS rendering needed), follow the pattern in `src/scrapers/academicSupport.js` instead — create a separate module under `src/scrapers/` and delegate from `scrapeSpecificFacility`.

---

## Related

- `backend/src/scrapers/academicSupport.js` — academic support scraper (Cheerio-based)
- `backend/src/utils/retry.js` — shared retry utility
- `backend/src/database.js` — facilities database layer
