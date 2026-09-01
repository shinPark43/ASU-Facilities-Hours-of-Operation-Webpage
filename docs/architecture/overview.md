# System Architecture Overview

## Purpose

A web application that displays real-time operating hours for Angelo State University (ASU) facilities. Data is scraped from official ASU pages, stored in SQLite, and served via a REST API to a React frontend.

Live: https://shinpark43.github.io/ASU-Facilities-Hours-of-Operation-Webpage/

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (CRA), hosted on GitHub Pages |
| Backend | Node.js / Express, hosted on Railway |
| Database | SQLite (WAL mode) — two separate DB files |
| Scraping | Puppeteer (JS-rendered pages), Axios + Cheerio (static HTML) |
| Scheduling | node-cron |
| CI/CD | GitHub Actions |

---

## High-Level Data Flow

```
ASU websites
    │
    │  Puppeteer (JS-rendered)
    │  Axios + Cheerio (static HTML)
    ▼
ScraperManager / academicSupport
    │
    │  SQL INSERT (full replace in transaction)
    ▼
SQLite (facilities.db / tutoring.db)
    │
    │  SQL SELECT
    ▼
Express REST API (5-min in-memory cache)
    │
    │  HTTP JSON
    ▼
React Frontend
    │
    │  Falls back to hardcoded mock data if API unavailable
    ▼
User
```

---

## Backend Directory Structure

```
backend/
  server.js                      Entry point, cron jobs, route mounting
  src/
    database.js                  SQLite for facilities (facilities.db)
    tutoring-database.js         SQLite for tutoring (tutoring.db)
    scraper.js                   Thin singleton wrapper over ScraperManager
    ScraperManager.js            Puppeteer-based scraper for facilities
    scrapers/
      academicSupport.js         Cheerio-based scraper for tutoring, math lab, writing center
    utils/
      retry.js                   Shared exponential backoff utility
    routes/
      facilities.js              GET /api/facilities/*
      tutoring.js                GET /api/tutoring/*
      calendar.js                GET /api/calendar/*
      events.js                  GET /api/events/*
  data/
    facilities.db                SQLite database (gitignored)
    tutoring.db                  SQLite database (gitignored)
```

---

## Scraping Schedule

| Scraper | Schedule | Method |
|---|---|---|
| Library, Recreation, Dining, Ram Tram | Daily at midnight CST | Puppeteer via ScraperManager |
| Academic Support (Tutoring, Math Lab, Writing Center) | Weekly on Sunday midnight CST | Cheerio via academicSupport.js |
| Academic Calendar | On-demand with 24-hr cache | Cheerio via calendar route |

> Note: The weekly tutoring cron is currently commented out in `server.js` pending confirmation that the semester schedule is live on the ASU page.

---

## Caching Strategy

- **API layer**: 5-minute in-memory cache per route (`Map` in facilities, object in tutoring)
- **Calendar**: 24-hour in-memory cache
- **Limitation**: Cache is process-scoped — does not survive restarts or horizontal scaling

---

## Frontend Routing

React Router with `basename = /ASU-Facilities-Hours-of-Operation-Webpage`

| Route | Page |
|---|---|
| /home | Facility status grid + calendar highlights |
| /library | Porter Henderson Library hours |
| /gym | CHP Fitness Center hours |
| /dining | Dining venues hours |
| /ramtram | Ram Tram schedule |
| /tutoring | Academic support hours |
| /about | About page |
| /install | PWA install guide |

---

## CI/CD

- **Frontend deploy**: `.github/workflows/deploy-frontend.yml` — triggers on push to `main`, builds React app, deploys to GitHub Pages
- **Backend**: Deployed to Railway; auto-deploys on push to `main`
- `REACT_APP_API_URL` injected as a GitHub Actions secret at build time
