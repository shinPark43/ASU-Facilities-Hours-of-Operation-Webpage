# Documentation

## Architecture
- [System Overview](architecture/overview.md) — tech stack, data flow, directory structure, CI/CD

## Backend
- **Scrapers**
  - [Academic Support](backend/scrapers/academic-support.md) — tutoring, math lab, writing center (Cheerio-based)
  - [ScraperManager](backend/scrapers/scraper-manager.md) — facility scrapers (Puppeteer-based)
- **Database**
  - [Schema](backend/database/schema.md) — facilities.db and tutoring.db table definitions
- **API**
  - [Endpoints](backend/api/endpoints.md) — all REST routes and response shapes

## Testing
- [Strategy](testing/strategy.md) — three-layer approach: unit, integration, contract
- [How to Run](testing/how-to-run.md) — commands, fixture management, CI setup

## Decisions
- [ADR 001 — Extract Academic Support Module](decisions/001-extract-academic-support.md)
