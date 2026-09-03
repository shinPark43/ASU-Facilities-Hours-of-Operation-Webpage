# Academic Support Scraper

**File:** `backend/src/scrapers/academicSupport.js`

Scrapes operating hours for ASU's three academic support services and writes them to `tutoring.db`.

---

## Sources

| Service | URL | Method |
|---|---|---|
| Academic Tutoring | `https://www.angelo.edu/current-students/freshman-college/academic-tutoring.php` | Axios + Cheerio |
| Math Lab | `https://www.angelo.edu/current-students/freshman-college/math-lab.php` | Axios + Cheerio |
| Writing Center | `https://www.angelo.edu/current-students/writing-center/` | Axios + Cheerio |

All three pages serve **static HTML** — no JavaScript rendering required.

---

## Entry Point

```js
const { scrapeTutoring } = require('./src/scrapers/academicSupport');
await scrapeTutoring();
// Returns: { success: true, subjects_count, courses_count, sessions_count }
```

Called from `ScraperManager.scrapeSpecificFacility('tutoring')` and `ScraperManager.scrapeAll()`.

---

## Workflow

```
axios.get(TUTORING_URL)
        │
        ▼
extractTutoringHours(html)      ← Cheerio, new accordion selectors
        │
        ├── scrapeMathLab()     ← parallel, Cheerio, column-per-day table
        └── scrapeWritingCenter() ← parallel, Cheerio, heading-grouped tables
        │
        ▼
Merge all three datasets
Sort subjects alphabetically
formatTutoringHours()           ← strip empty/invalid sessions
        │
        ▼
tutoringDb.updateTutoringData() ← full wipe-and-reinsert in transaction
tutoringDb.logScrapeActivity()
```

---

## Output Shape

```js
{
  "Accounting": {
    "ACCT 2301 - Principles of Accounting I-Financial": [
      { day: "Monday", time: "1:30-5 p.m.", location: "RAS 226" },
      { day: "Tuesday", time: "1:30-4:30 p.m.", location: "RAS 226" }
    ],
    "ACCT 2302 - Principles of Accounting II-Managerial": [
      { day: "Monday", time: "1:30-5 p.m.", location: "RAS 226" }
    ]
  },
  "Math Lab": {
    "Math Lab (Drop-in Help)": [
      { day: "Monday", time: "9 a.m.-5 p.m.", location: "Porter Henderson Library, Room 328" }
    ]
  },
  "Writing Center": {
    "In-Person Tutoring": [
      { day: "Monday", time: "9 a.m.-5 p.m.", location: "ASU Writing Center" }
    ]
  }
}
```

---

## Tutoring Page HTML Structure

The ASU tutoring page uses a CSS accordion (not JavaScript-rendered). Content is present in the raw HTML response.

```html
<div class="lw_cl" data-cl-name="Accordion">
  <div class="details_accordion">

    <div class="accordion_details">            <!-- one per subject -->
      <div class="accordion_summary">Accounting</div>
      <div class="accordion_content">
        <table>
          <caption>
            ACCT 2301 - Principles of Accounting I-Financial<br />
            ACCT 2302 - Principles of Accounting II-Managerial<br />
          </caption>
          <thead>
            <tr><th>Day</th><th>Time</th><th>Location</th></tr>
          </thead>
          <tbody>
            <tr><td>Monday</td><td>1:30-5 p.m.</td><td>RAS 226</td></tr>
            <tr><td>Tuesday</td><td>1:30-4:30 p.m.</td><td>RAS 226</td></tr>
          </tbody>
        </table>
      </div>
    </div>

  </div>
</div>
```

### Key selectors

| Data | Selector |
|---|---|
| Subject block | `div.accordion_details` |
| Subject name | `div.accordion_summary` (first child) |
| Course table | `div.accordion_content table` |
| Course name(s) | `table caption` — split on `<br>` for multiple courses |
| Session rows | `tbody tr` (skip rows containing `th`) |
| Day cell | `td:nth-child(1)` |
| Time cell | `td:nth-child(2)` |
| Location cell | `td:nth-child(3)` |

### Multi-course captions

A single `<caption>` may list multiple courses separated by `<br />`. Each course gets its own key in the output with the same session rows.

```js
// Caption HTML: "ACCT 2301 - ...<br />ACCT 2302 - ...<br />"
const courseNames = captionHtml
  .split(/<br\s*\/?>/gi)
  .map(fragment => cheerio.load(fragment).text().trim())
  .filter(Boolean);
// → ["ACCT 2301 - ...", "ACCT 2302 - ..."]
```

### lastValidDay carry-forward

Some rows have an empty day cell (e.g. Upswing online continuation rows). The parser carries forward the last valid day to handle these:

```js
if (!day && (time || location)) {
  day = lastValidDay || 'Online';
}
```

---

## Math Lab Page Structure

Column-per-day layout: row 0 = day headers, row 1 = time values.

The parser dynamically finds the first row with ≥3 day abbreviations as the header, then reads the following row for times. Location is hardcoded to `"Porter Henderson Library, Room 328"`.

---

## Writing Center Page Structure

Column-per-day tables (same layout as Math Lab), but multiple tables exist per page. The parser walks `h1–h6` and `table` elements in document order, associating each table with the last heading seen above it. Location is hardcoded to `"ASU Writing Center"`.

---

## Error Handling

- `scrapeMathLab` and `scrapeWritingCenter` failures are caught and logged independently — they do not abort the main tutoring scrape.
- If the main tutoring page returns an empty result, `scrapeTutoring` throws and logs `'error'` to `tutoring_scrape_log`.
- The outer `retryWithBackoff` in `ScraperManager.scrapeAll()` retries the entire `scrapeTutoring()` call up to 2 times with exponential backoff.

---

## History

| Date | Change |
|---|---|
| Initial | Puppeteer-based scraper using `section.lw_accordion_block` selectors (LiveWhale CMS) |
| Sep 2026 | ASU page redesigned to CSS accordion (`div.accordion_details`). Puppeteer dropped, rewritten with Cheerio. Module extracted from `ScraperManager.js` into `src/scrapers/academicSupport.js`. |

### Why the old scraper broke silently

The old selectors (`section.lw_accordion_block`, `h4.lw_accordion_block_title`, `.lw_accordion_block_content`) no longer existed on the redesigned page. `extractTutoringHours` returned an empty object, which triggered the guard clause `if (!tutoringData || Object.keys(tutoringData).length === 0)` and threw — but since the weekly cron was paused, no alarm surfaced.

---

## Related

- `backend/src/tutoring-database.js` — database layer
- `backend/src/routes/tutoring.js` — API routes
- `docs/decisions/001-extract-academic-support.md` — architectural decision record
- `docs/testing/strategy.md` — how this module is tested
