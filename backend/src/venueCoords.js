/**
 * Known ASU campus venue coordinates.
 * Used to fill in lat/lng for events that don't have them.
 *
 * Patterns are matched (case-insensitive) against the event's location string.
 * Verify/adjust coordinates as needed — these are approximate.
 */
const VENUE_COORDS = [
  {
    name: 'Mayer Softball Field',
    patterns: ['mayer softball', 'mayer field', 'softball field'],
    lat: 31.43546,
    lng: -100.46143,
  },
  {
    name: 'Foster Field at 1st Community Credit Union',
    patterns: ['foster field', '1st community'],
    lat: 31.436031,
    lng: -100.453586,
  },
  {
    name: 'Junell Center / Stephens Arena',
    patterns: ['junell center', 'stephens arena'],
    lat: 31.437163,
    lng: -100.457973,
  },
  {
    name: 'LeGrand Sports Complex',
    patterns: ['legrand sports', 'legrand stadium', 'le grand sports', 'le grand stadium'],
    lat: 31.435387,
    lng: -100.458126,
  },
  {
    name: 'LeGrand Alumni and Visitors Center',
    patterns: ['legrand alumni', 'legrand visitor', 'le grand alumni', 'le grand visitor'],
    lat: 31.43432,
    lng: -100.45563,
  },
  {
    name: 'ASU Tennis Complex',
    patterns: ['tennis complex', 'asu tennis'],
    lat: 31.43428,
    lng: -100.45804,
  },
  {
    name: 'Houston Harte University Center',
    patterns: ['houston harte', 'university center'],
    lat: 31.441097,
    lng: -100.466485,
  },
  {
    name: 'Texan Hall',
    patterns: ['texan hall'],
    lat: 31.438545,
    lng: -100.456459,
  },
  {
    name: 'Vincent Building',
    patterns: ['vincent building', 'vincent hall'],
    lat: 31.441031,
    lng: -100.461323,
  },
];

/**
 * Returns { lat, lng } if the location string matches a known venue, else null.
 */
function lookupVenueCoords(locationStr) {
  if (!locationStr) return null;
  const lower = locationStr.toLowerCase();
  for (const venue of VENUE_COORDS) {
    if (venue.patterns.some(p => lower.includes(p))) {
      return { lat: venue.lat, lng: venue.lng };
    }
  }
  return null;
}

module.exports = { lookupVenueCoords };
