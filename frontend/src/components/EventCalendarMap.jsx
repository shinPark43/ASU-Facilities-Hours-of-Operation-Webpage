import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import MapGL, { Marker } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import '../styles/EventCalendarMap.css';

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN;

const FILTERS = ['Today', 'This Week', 'Next Week'];

function getChicagoBoundaries() {
  const now = new Date();
  const chicagoDateStr = now.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });

  function chicagoMidnight(dateStr) {
    const probe = new Date(`${dateStr}T12:00:00Z`);
    const chicagoNoon = new Date(probe.toLocaleString('en-US', { timeZone: 'America/Chicago' }));
    const offsetMs = probe.getTime() - chicagoNoon.getTime();
    return new Date(`${dateStr}T00:00:00`).getTime() + offsetMs;
  }

  const addDays = (dateStr, n) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
  };

  const chicagoDayOfWeek = new Date(
    new Date(`${chicagoDateStr}T12:00:00Z`).toLocaleString('en-US', { timeZone: 'America/Chicago' })
  ).getDay(); // 0=Sun, 1=Mon...
  const daysFromMonday = (chicagoDayOfWeek + 6) % 7;

  const thisMonStr    = addDays(chicagoDateStr, -daysFromMonday);
  const nextMonStr    = addDays(thisMonStr, 7);
  const nextSunEndStr = addDays(nextMonStr, 7);
  const tomorrowStr   = addDays(chicagoDateStr, 1);

  return {
    todayStart:    chicagoMidnight(chicagoDateStr) / 1000,
    todayEnd:      chicagoMidnight(tomorrowStr)    / 1000,
    thisWeekStart: chicagoMidnight(thisMonStr)     / 1000,
    thisWeekEnd:   chicagoMidnight(nextMonStr)     / 1000,
    nextWeekStart: chicagoMidnight(nextMonStr)     / 1000,
    nextWeekEnd:   chicagoMidnight(nextSunEndStr)  / 1000,
  };
}

const ASU_CENTER = { longitude: -100.4648, latitude: 31.4405 };

const LIGHT_STYLE = 'mapbox://styles/mapbox/standard';
const DARK_STYLE = 'mapbox://styles/mapbox/standard-dark';

const pad = n => String(n).padStart(2, '0');
const fmtUtc = ts => {
  const d = new Date(ts * 1000);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;
};
const fmtDay = ts => {
  const d = new Date(ts * 1000);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
};

const buildGCalUrl = (event) => {
  let dates;
  if (event.allDay) {
    const endTs = event.tsEnd ? event.tsEnd + 86400 : event.tsStart + 86400;
    dates = `${fmtDay(event.tsStart)}/${fmtDay(endTs)}`;
  } else {
    const endTs = event.tsEnd || event.tsStart + 3600;
    dates = `${fmtUtc(event.tsStart)}/${fmtUtc(endTs)}`;
  }
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates,
    details: event.link,
    location: event.location || 'Angelo State University',
  });
  return `https://calendar.google.com/calendar/render?${params}`;
};

const buildOutlookUrl = (event) => {
  const toIso = ts => new Date(ts * 1000).toISOString();
  const startdt = event.allDay ? fmtDay(event.tsStart) : toIso(event.tsStart);
  const enddt   = event.allDay
    ? fmtDay(event.tsEnd ? event.tsEnd + 86400 : event.tsStart + 86400)
    : toIso(event.tsEnd || event.tsStart + 3600);
  const params = new URLSearchParams({
    subject: event.title,
    startdt,
    enddt,
    location: event.location || 'Angelo State University',
    body: event.link,
    allday: event.allDay ? 'true' : 'false',
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params}`;
};

const downloadIcs = (event) => {
  const dtstart = event.allDay
    ? `DTSTART;VALUE=DATE:${fmtDay(event.tsStart)}`
    : `DTSTART:${fmtUtc(event.tsStart)}`;
  const dtend = event.allDay
    ? `DTEND;VALUE=DATE:${fmtDay(event.tsEnd ? event.tsEnd + 86400 : event.tsStart + 86400)}`
    : `DTEND:${fmtUtc(event.tsEnd || event.tsStart + 3600)}`;
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//ASU Facilities//EN',
    'BEGIN:VEVENT',
    `UID:${event.id}@angelo.edu`,
    dtstart, dtend,
    `SUMMARY:${event.title}`,
    event.location ? `LOCATION:${event.location}` : '',
    `DESCRIPTION:${event.link}`,
    'END:VEVENT', 'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'event.ics'; a.click();
  URL.revokeObjectURL(url);
};

const IconCalendar = () => (
  <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="3" width="14" height="11" rx="2"/>
    <path d="M1 7h14M5 1v4M11 1v4"/>
  </svg>
);
const IconGoogle = () => (
  <svg width="14" height="14" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);
const IconApple = () => (
  <svg width="12" height="14" viewBox="0 0 56 66" fill="currentColor">
    <path d="M45.7 35.1c0-8.3 6.8-12.3 7.1-12.5-3.9-5.7-9.9-6.4-12-6.5-5.1-.5-10 3-12.5 3s-6.5-3-10.8-2.9c-5.5.1-10.6 3.2-13.4 8.1-5.8 10-1.5 24.7 4.1 32.8 2.8 4 6 8.4 10.3 8.2 4.1-.2 5.7-2.6 10.7-2.6s6.4 2.6 10.8 2.5c4.4-.1 7.3-4 10-8 3.1-4.5 4.4-8.9 4.5-9.1-.1-.1-8.8-3.4-8.8-13zM37.6 10.6c2.3-2.8 3.8-6.6 3.4-10.4-3.3.1-7.3 2.2-9.7 5-2.1 2.4-4 6.4-3.5 10.2 3.7.3 7.5-1.9 9.8-4.8z"/>
  </svg>
);
const IconOutlook = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <rect width="24" height="24" rx="3" fill="#0078D4"/>
    <path d="M12 5C8.13 5 5 8.13 5 12s3.13 7 7 7 7-3.13 7-7-3.13-7-7-7zm0 11c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z" fill="white"/>
  </svg>
);

const EventCalendarMap = ({ events = [] }) => {
  const [theme, setTheme] = useState(
    () => localStorage.getItem('theme') || 'light'
  );
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [openCalDropdown, setOpenCalDropdown] = useState(null);
  const [mapActive, setMapActive] = useState(false);
  const [activeFilter, setActiveFilter] = useState('This Week');
  const sheetRef = useRef(null);

  useEffect(() => {
    if (selectedLocation && sheetRef.current) {
      sheetRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selectedLocation]);

  // Sync with theme changes from Layout
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const t = document.documentElement.getAttribute('data-theme') || 'light';
      setTheme(t);
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => observer.disconnect();
  }, []);

  // Clear selection when filter changes
  useEffect(() => {
    setSelectedLocation(null);
    setOpenCalDropdown(null);
  }, [activeFilter]);

  const filteredEvents = useMemo(() => {
    const b = getChicagoBoundaries();
    switch (activeFilter) {
      case 'Today':
        return events.filter(e => e.tsStart >= b.todayStart && e.tsStart < b.todayEnd);
      case 'Next Week':
        return events.filter(e => e.tsStart >= b.nextWeekStart && e.tsStart < b.nextWeekEnd);
      default: // 'This Week'
        return events.filter(e => e.tsStart >= b.thisWeekStart && e.tsStart < b.thisWeekEnd);
    }
  }, [events, activeFilter]);

  const mappableEvents   = filteredEvents.filter(e => e.lat != null && e.lng != null);
  const unmappableEvents = filteredEvents.filter(e => e.lat == null || e.lng == null);

  const locationGroups = useMemo(() => {
    const groups = new Map();
    for (const event of mappableEvents) {
      const key = `${event.lat},${event.lng}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(event);
    }
    return Array.from(groups.values());
  }, [mappableEvents]);

  const handleMarkerClick = useCallback((e, group) => {
    e.originalEvent?.stopPropagation();
    setSelectedLocation(group);
  }, []);

  useEffect(() => {
    if (!openCalDropdown) return;
    const handler = (e) => {
      if (!e.target.closest('.ecm-cal-wrapper')) setOpenCalDropdown(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openCalDropdown]);

  const renderCalDropdown = (event, compact = false) => (
    <div className="ecm-cal-wrapper">
      <button
        className={`ecm-cal-btn${compact ? ' ecm-cal-btn--icon' : ''}`}
        title="Add to Calendar"
        onClick={(e) => { e.stopPropagation(); setOpenCalDropdown(openCalDropdown === event.id ? null : event.id); }}
      >
        <IconCalendar />
        {!compact && <span>Add to Calendar</span>}
      </button>
      {openCalDropdown === event.id && (
        <div className="ecm-cal-menu">
          <a href={buildGCalUrl(event)} target="_blank" rel="noopener noreferrer"
             className="ecm-cal-item" onClick={() => setOpenCalDropdown(null)}>
            <IconGoogle /> Google
          </a>
          <button className="ecm-cal-item"
                  onClick={() => { downloadIcs(event); setOpenCalDropdown(null); }}>
            <IconApple /> Apple
          </button>
          <a href={buildOutlookUrl(event)} target="_blank" rel="noopener noreferrer"
             className="ecm-cal-item" onClick={() => setOpenCalDropdown(null)}>
            <IconOutlook /> Outlook
          </a>
        </div>
      )}
    </div>
  );

  if (!MAPBOX_TOKEN) {
    return (
      <div className="ecm-no-token">
        Mapbox token not configured. Set <code>REACT_APP_MAPBOX_TOKEN</code> in <code>.env.local</code>.
      </div>
    );
  }

  return (
    <div className="ecm-container">
      <div className="ecm-filter-tabs" role="tablist" aria-label="Event date filter">
        {FILTERS.map(f => (
          <button
            key={f}
            role="tab"
            aria-selected={activeFilter === f}
            className={`ecm-filter-tab${activeFilter === f ? ' ecm-filter-tab--active' : ''}`}
            onClick={() => setActiveFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>

      {filteredEvents.length === 0 && (
        <p className="ecm-empty-state">No events for {activeFilter.toLowerCase()}.</p>
      )}

      <div className="ecm-map-group">
        <div className={`ecm-map-card${selectedLocation ? ' ecm-map-card--open' : ''}`}>
          <div className="ecm-map-wrapper">
            <MapGL
              initialViewState={{
                ...ASU_CENTER,
                zoom: 16,
                pitch: 50,
                bearing: -15,
              }}
              style={{ width: '100%', height: '100%' }}
              mapStyle={theme === 'dark' ? DARK_STYLE : LIGHT_STYLE}
              mapboxAccessToken={MAPBOX_TOKEN}
              scrollZoom={mapActive}
              dragPan={mapActive}
              dragRotate={mapActive}
              touchZoomRotate={mapActive}
              keyboard={mapActive}
              onClick={mapActive ? () => setSelectedLocation(null) : undefined}
            >
              {locationGroups.map(group => {
                const isSelected = selectedLocation &&
                  selectedLocation[0].lat === group[0].lat &&
                  selectedLocation[0].lng === group[0].lng;
                return (
                  <Marker
                    key={`${group[0].lat},${group[0].lng}`}
                    longitude={group[0].lng}
                    latitude={group[0].lat}
                    anchor="bottom"
                    onClick={e => handleMarkerClick(e, group)}
                  >
                    <div
                      className={`ecm-marker${isSelected ? ' ecm-marker--selected' : ''}`}
                      title={group.length > 1 ? `${group.length} events` : group[0].title}
                    >
                      {group.length > 1 && (
                        <span className="ecm-marker-badge">{group.length}</span>
                      )}
                    </div>
                  </Marker>
                );
              })}

            </MapGL>
            {!mapActive && (
              <div className="ecm-map-overlay" onClick={() => setMapActive(true)}>
                <div className="ecm-map-overlay-hint">
                  <span className="ecm-map-overlay-text">Tap to explore map</span>
                </div>
              </div>
            )}
            {mapActive && mappableEvents.length > 0 && !selectedLocation && (
              <p className="ecm-map-hint">Tap a marker to view events at that location.</p>
            )}
          </div>
        </div>

        {selectedLocation && (
          <div className="ecm-sheet" ref={sheetRef}>
            <div className="ecm-sheet-header">
              <span className="ecm-sheet-location">
                {selectedLocation[0].location || 'Campus Event'}
              </span>
              <button className="ecm-sheet-back" onClick={() => setSelectedLocation(null)}>
                ✕
              </button>
            </div>

            {selectedLocation.length === 1 ? (
              <div className="ecm-sheet-event">
                <p className="ecm-sheet-title">{selectedLocation[0].title}</p>
                <p className="ecm-sheet-meta">{selectedLocation[0].date} · {selectedLocation[0].time}</p>
                <div className="ecm-sheet-actions">
                  <a href={selectedLocation[0].link} target="_blank" rel="noopener noreferrer"
                     className="ecm-sheet-link">View Event →</a>
                  {renderCalDropdown(selectedLocation[0])}
                </div>
              </div>
            ) : (
              <ul className="ecm-sheet-list">
                {selectedLocation.map(ev => (
                  <li key={ev.id} className="ecm-sheet-list-item">
                    <div className="ecm-sheet-item-text">
                      <p className="ecm-sheet-title">{ev.title}</p>
                      <p className="ecm-sheet-meta">{ev.date} · {ev.time}</p>
                    </div>
                    <div className="ecm-sheet-item-links">
                      <a href={ev.link} target="_blank" rel="noopener noreferrer"
                         className="ecm-sheet-link">View →</a>
                      {renderCalDropdown(ev)}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {!selectedLocation && unmappableEvents.length > 0 && (
        <>
          <p className="ecm-no-location-hint">
            These events don't have a pinned campus location.
          </p>
          <div className="ecm-no-location-strip">
            {unmappableEvents.map(event => (
              <div key={event.id} className="ecm-no-location-card">
                <div className="ecm-no-location-top">
                  <span className="ecm-no-location-badge">EVENT</span>
                  <span className="ecm-no-location-title">{event.title}</span>
                  <span className="ecm-no-location-meta">
                    {event.date} · {event.time}
                    {event.location ? ` · ${event.location}` : ''}
                  </span>
                </div>
                <div className="ecm-no-location-actions">
                  <a href={event.link} target="_blank" rel="noopener noreferrer"
                     className="ecm-sheet-link">View →</a>
                  {renderCalDropdown(event, true)}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default EventCalendarMap;
