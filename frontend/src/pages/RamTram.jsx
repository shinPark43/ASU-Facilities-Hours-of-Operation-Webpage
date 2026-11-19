import React, { useState, useEffect, useCallback } from 'react';
import { fetchFacilityData } from '../services/api.js';
import {
  parseMultipleTimeRanges,
  formatDayWithDate,
  isClosedTime,
  evaluateFacilityStatus,
  msUntilNextMinute,
} from '../utils/timeUtils.js';
import { RAM_TRAM_STOPS } from '../data/campusLocations.js';
import StaleDataBanner from '../components/StaleDataBanner';
import LiveStatusBadge from '../components/LiveStatusBadge';
import EventCalendarMap from '../components/EventCalendarMap';

const RamTram = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [facilityData, setFacilityData] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [now, setNow] = useState(() => new Date());

  const campusStops = RAM_TRAM_STOPS.filter((s) => s.type === 'campus');

  const loadRamTram = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchFacilityData('ram_tram');
      setFacilityData(data);
    } catch (err) {
      console.error('Ram Tram fetch error:', err);
      setError(`Error loading Ram Tram hours: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRamTram();
  }, [loadRamTram]);

  useEffect(() => {
    let intervalId;
    const timeoutId = setTimeout(() => {
      setNow(new Date());
      intervalId = setInterval(() => setNow(new Date()), 60000);
    }, msUntilNextMinute());
    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  const handleDayClick = (day) => {
    setSelectedDay(selectedDay === day ? null : day);
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p>Loading Ram Tram schedule...</p>
      </div>
    );
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  const hours = facilityData?.sections?.['Ram Tram'] || {};
  const liveStatus = evaluateFacilityStatus(hours, now, { isRamTram: true });

  return (
    <div className="facility-page">
      <StaleDataBanner
        isFallback={Boolean(facilityData?._isFallback)}
        source={facilityData?._source}
        cachedAt={facilityData?._cachedAt}
        onRetry={loadRamTram}
      />

      <div className="page-header-with-square-button">
        <div className="page-header-content">
          <h2 className="section-panel-header">Ram Tram</h2>
          <div className="subtitle-container">
            <p className="section-subtitle">Free campus bus service with your ASU OneCard</p>
            <LiveStatusBadge status={liveStatus} />
            <p className="instruction-text">• Click on available time slots to view stop locations</p>
          </div>
        </div>
        <div className="square-button-container">
          <a
            href="https://passiogo.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="square-button"
          >
            Live Bus Tracker
          </a>
        </div>
      </div>

      <div className="facility-hours">
        {Object.entries(hours)
          .sort(([dayA], [dayB]) => {
            const dayOrder = {
              Sunday: 0,
              Monday: 1,
              Tuesday: 2,
              Wednesday: 3,
              Thursday: 4,
              Friday: 5,
              Saturday: 6,
            };
            return dayOrder[dayA] - dayOrder[dayB];
          })
          .map(([day, times]) => {
            const closed = typeof times === 'string' && isClosedTime(times);
            const isSelected = selectedDay === day;

            let displayText = '';
            let routeInfo = '';

            if (typeof times === 'object' && times?.time) {
              displayText = times.time;
              routeInfo = times.route || '';
            } else {
              const ranges = parseMultipleTimeRanges(times);
              displayText = ranges.join(', ');
            }

            return (
              <div key={day}>
                <div
                  className={`hours-row ${isSelected ? 'selected' : ''} ${!closed ? 'clickable' : ''}`}
                  onClick={() => !closed && handleDayClick(day)}
                  style={{ cursor: !closed ? 'pointer' : 'default' }}
                >
                  <span className="day-name">
                    {formatDayWithDate(day)}
                    {routeInfo && (
                      <span style={{ color: '#666', fontSize: '0.9em', marginLeft: '8px' }}>
                        ({routeInfo})
                      </span>
                    )}
                  </span>
                  <div className="hours-time-container">
                    <span className={`hours-time${closed ? ' closed-not-available' : ''}`}>
                      {displayText}
                    </span>
                  </div>
                </div>

                {isSelected && !closed && (
                  <div className="stop-locations-card">
                    <div className="stop-locations-header">
                      <h4>Campus Stop Locations</h4>
                    </div>
                    <div className="stop-locations-list">
                      {campusStops.map((stop) => (
                        <div key={stop.id} className="stop-location-item">
                          <div className="stop-info">
                            <div className="stop-name">{stop.name}</div>
                            <div className="stop-address">{stop.address}</div>
                          </div>
                          <a
                            href={stop.mapUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="stop-map-link"
                          >
                            &gt; Map
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {/* Interactive Ram Tram Stop & Route Map */}
      <section style={{ marginTop: '1.5rem', marginBottom: '1.5rem' }}>
        <h3 className="facility-name" style={{ marginBottom: '0.75rem' }}>
          Ram Tram Route &amp; Stop Pins
        </h3>
        <EventCalendarMap events={[]} initialLayer="ramtram" />
      </section>

      <div className="hours-info">
        Hours may vary during finals, holidays, and intersessions. Text RAMTRAM to 84483 for transit alerts.
      </div>

      <a
        href="https://www.angelo.edu/life-on-campus/live/parking-and-transportation/ram-tram.php"
        target="_blank"
        rel="noopener noreferrer"
        className="website-link"
      >
        View on Ram Tram Website
      </a>
    </div>
  );
};

export default RamTram;
