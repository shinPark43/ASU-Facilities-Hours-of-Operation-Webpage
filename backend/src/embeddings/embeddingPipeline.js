'use strict';

const axios = require('axios');
const cheerio = require('cheerio');

const db = require('../database');
const tutoringDb = require('../tutoring-database');
const { getScraperManager } = require('../scraper');

const templates = require('./phraseTemplates');
const hashManager = require('./hashManager');
const chromaManager = require('./chromaManager');
const { embedTexts } = require('./openaiEmbedder');

// ── Data fetchers ─────────────────────────────────────────────────────────────

// Convert raw DB rows (from getFacilityHours) into { sections: { name: { day: value } } }
function buildSections(rawRows) {
  const sections = {};
  for (const row of rawRows) {
    if (!row.section_name) continue;
    if (!sections[row.section_name]) sections[row.section_name] = {};

    let value;
    if (row.is_closed) {
      value = 'Closed';
    } else if (row.open_time && row.close_time) {
      value = `${row.open_time} - ${row.close_time}`;
    } else if (row.open_time) {
      // Scraper stores full time range in open_time alone (close_time is null)
      value = row.open_time;
    } else {
      value = 'Hours not available';
    }
    sections[row.section_name][row.day_of_week] = value;
  }
  return { sections };
}

async function fetchFacilityData(type) {
  const raw = await db.getFacilityHours(type);
  return buildSections(raw);
}

async function fetchTutoringData() {
  return await tutoringDb.getAllTutoringData();
}

async function fetchCalendarData() {
  const CALENDAR_URL = 'https://www.angelo.edu/current-students/registrar/academic_calendar.php';
  const { data: html } = await axios.get(CALENDAR_URL, { timeout: 8000 });
  const $ = cheerio.load(html);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcoming = [];
  for (const trEl of $('table tr').toArray()) {
    if (upcoming.length >= 5) break;
    const thText = $(trEl).find('th span').first().text().trim();
    const tdText = $(trEl).find('td .font-weight-bold').first().text().trim()
                || $(trEl).find('td').first().text().trim();
    if (!thText || !tdText) continue;

    const match = thText.match(/([A-Z][a-z]+)\s+(\d+)/);
    if (!match) continue;
    const year = new Date().getFullYear();
    const date = new Date(`${match[1]} ${match[2]}, ${year}`);
    if (date < new Date(Date.now() - 86400000)) date.setFullYear(year + 1);
    if (date < today) continue;

    const t = tdText.toLowerCase();
    let badge;
    if (/deadline|due|last day|last date|drop|withdrawal|grades due|adoption/i.test(t)) badge = 'DEADLINE';
    else if (/break|holiday|thanksgiving/i.test(t)) badge = 'BREAK';
    else if (/exam|final/i.test(t)) badge = 'EXAM';
    else badge = 'UPCOMING';

    upcoming.push({ date: thText, title: tdText, badge });
  }
  return upcoming;
}

async function fetchEventsData() {
  const manager = getScraperManager();
  const eventsData = await manager.scrapeEvents();
  const now = Date.now() / 1000;
  const allEvents = [];

  for (const dayEvents of Object.values(eventsData)) {
    if (!Array.isArray(dayEvents)) continue;
    for (const e of dayEvents) {
      if (e.status !== '1') continue;
      if (e.ts_start == null || e.ts_start <= now) continue;
      allEvents.push(e);
    }
  }

  allEvents.sort((a, b) => a.ts_start - b.ts_start);

  return allEvents.map(e => {
    const date = new Date(e.ts_start * 1000).toLocaleDateString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', timeZone: 'America/Chicago',
    });
    const fmtTime = ts => new Date(ts * 1000).toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago',
    });
    const time = e.is_all_day === '1' || e.is_all_day === true
      ? 'All Day'
      : e.ts_end ? `${fmtTime(e.ts_start)} – ${fmtTime(e.ts_end)}` : fmtTime(e.ts_start);

    return {
      id: String(e.id),
      title: e.title || 'Untitled Event',
      date,
      time,
      location: e.location || '',
    };
  });
}

// ── Phrase generation ─────────────────────────────────────────────────────────

const PHRASE_GENERATORS = {
  library:    (data) => templates.libraryPhrases(data),
  recreation: (data) => templates.recreationPhrases(data),
  dining:     (data) => templates.diningPhrases(data),
  ram_tram:   (data) => templates.ramTramPhrases(data),
  tutoring:   (data) => templates.tutoringPhrases(data),
  calendar:   (data) => templates.calendarPhrases(data),
  events:     (data) => templates.eventsPhrases(data),
};

// Convert phrase array to { id -> text } map
function toMap(phrases) {
  const map = {};
  for (const p of phrases) map[p.id] = p.text;
  return map;
}

// ── Per-facility update ───────────────────────────────────────────────────────

async function updateFacility(facilityKey, data) {
  const collectionName = chromaManager.COLLECTION_NAMES[facilityKey];
  const generatePhrases = PHRASE_GENERATORS[facilityKey];

  const newPhrases = toMap(generatePhrases(data));
  const existingPhrases = await chromaManager.getExistingPhrases(collectionName);

  const toUpsert = [];   // { id, text }
  const toDelete = [];   // id[]

  // Find added and changed
  for (const [id, text] of Object.entries(newPhrases)) {
    if (existingPhrases[id] !== text) {
      toUpsert.push({ id, text });
    }
  }

  // Find removed
  for (const id of Object.keys(existingPhrases)) {
    if (!newPhrases[id]) {
      toDelete.push(id);
    }
  }

  const stats = {
    added: 0,
    changed: 0,
    removed: toDelete.length,
    skipped: Object.keys(newPhrases).length - toUpsert.length,
  };

  // Embed only the phrases that need updating
  if (toUpsert.length > 0) {
    const embeddings = await embedTexts(toUpsert.map(p => p.text));
    const docs = toUpsert.map((p, i) => ({
      id: p.id,
      text: p.text,
      embedding: embeddings[i],
      metadata: { facility: facilityKey },
    }));
    await chromaManager.upsertDocuments(collectionName, docs);

    for (const p of toUpsert) {
      if (existingPhrases[p.id] !== undefined) stats.changed++;
      else stats.added++;
    }
  }

  if (toDelete.length > 0) {
    await chromaManager.deleteDocuments(collectionName, toDelete);
  }

  return stats;
}

// ── Main pipeline ─────────────────────────────────────────────────────────────

async function runEmbeddingPipeline(targetFacility = null) {
  console.log('[Embeddings] Starting embedding pipeline...');

  // 1. Fetch all data sources
  let allData;
  try {
    const [library, recreation, dining, ram_tram, tutoring, calendar, events] = await Promise.allSettled([
      fetchFacilityData('library'),
      fetchFacilityData('recreation'),
      fetchFacilityData('dining'),
      fetchFacilityData('ram_tram'),
      fetchTutoringData(),
      fetchCalendarData(),
      fetchEventsData(),
    ]);

    allData = { library, recreation, dining, ram_tram, tutoring, calendar, events };
  } catch (err) {
    console.error('[Embeddings] Data fetch failed:', err.message);
    throw err;
  }

  // 2. Compute hashes for each facility
  const newHashes = {};
  const facilityDataMap = {};
  const now = new Date().toISOString();

  for (const [key, result] of Object.entries(allData)) {
    if (result.status === 'rejected') {
      console.warn(`[Embeddings] Could not fetch ${key}:`, result.reason?.message);
      continue;
    }
    facilityDataMap[key] = result.value;
    newHashes[key] = {
      hash: hashManager.computeHash(result.value),
      last_updated: now,
    };
  }

  // 3. Load stored hashes and find changed facilities
  const storedHashes = hashManager.loadHashes();
  const facilities = targetFacility ? [targetFacility] : Object.keys(newHashes);
  const changed = targetFacility
    ? (facilityDataMap[targetFacility] ? [targetFacility] : [])
    : hashManager.getChangedFacilities(newHashes, storedHashes);

  if (changed.length === 0) {
    console.log('[Embeddings] No changes detected. Pipeline complete.');
    return { changed: [], stats: {} };
  }

  console.log(`[Embeddings] Changed facilities: ${changed.join(', ')}`);

  // 4. Update each changed facility
  const allStats = {};
  for (const key of changed) {
    if (!facilityDataMap[key]) {
      console.warn(`[Embeddings] No data available for ${key}, skipping.`);
      continue;
    }
    try {
      console.log(`[Embeddings] Processing ${key}...`);
      const stats = await updateFacility(key, facilityDataMap[key]);
      allStats[key] = stats;
      console.log(`[Embeddings] ${key}: +${stats.added} added, ~${stats.changed} changed, -${stats.removed} removed, =${stats.skipped} skipped`);
    } catch (err) {
      console.error(`[Embeddings] Failed to update ${key}:`, err.message);
      allStats[key] = { error: err.message };
    }
  }

  // 5. Save updated hashes (only for successfully processed facilities)
  const updatedHashes = { ...storedHashes };
  for (const key of changed) {
    if (newHashes[key] && !allStats[key]?.error) {
      updatedHashes[key] = newHashes[key];
    }
  }
  hashManager.saveHashes(updatedHashes);

  console.log('[Embeddings] Pipeline complete.');
  return { changed, stats: allStats };
}

module.exports = { runEmbeddingPipeline };
