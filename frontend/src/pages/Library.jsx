import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchFacilityData } from '../services/api.js';
import {
  parseMultipleTimeRanges,
  formatDayWithDate,
  isClosedTime,
  isToday,
  evaluateFacilityStatus,
  msUntilNextMinute,
} from '../utils/timeUtils.js';
import StaleDataBanner from '../components/StaleDataBanner';
import LiveStatusBadge from '../components/LiveStatusBadge';

const facilityTabs = [
  { id: 'main-library', label: 'Main Library', key: 'Main Library' },
  { id: 'research-desk', label: 'Research Assistance', key: 'Research Assistance Desk' },
  { id: 'west-texas', label: 'West Texas', key: 'West Texas Collection' },
];

const Library = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [facilityData, setFacilityData] = useState(null);
  const [activeTab, setActiveTab] = useState('main-library');
  const [now, setNow] = useState(() => new Date());
  const [searchParams] = useSearchParams();

  const loadLibraryHours = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchFacilityData('library');
      if (data && data.sections) {
        setFacilityData(data);
      } else {
        throw new Error('No library hours data available');
      }
    } catch (err) {
      setError(`Error loading library hours: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLibraryHours();
  }, [loadLibraryHours]);

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

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (!tabParam) return;
    const matched = facilityTabs.find((t) => t.key === tabParam);
    if (matched) setActiveTab(matched.id);
  }, [searchParams]);

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p>Loading library hours...</p>
      </div>
    );
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  const hours = facilityData?.sections || null;

  return (
    <div>
      <StaleDataBanner
        isFallback={Boolean(facilityData?._isFallback)}
        source={facilityData?._source}
        cachedAt={facilityData?._cachedAt}
        onRetry={loadLibraryHours}
      />

      <div className="page-header-with-square-button">
        <div className="page-header-content">
          <h2 className="section-panel-header">Porter Henderson Library</h2>
          <p className="section-subtitle">
            Academic resources, research support, and study spaces
          </p>
        </div>
        <div className="square-button-container">
          <a
            href="https://myonecard.angelo.edu/patron/roomres/room_res.php"
            target="_blank"
            rel="noopener noreferrer"
            className="square-button"
          >
            Reserve a Group Study Room
          </a>
        </div>
      </div>

      <div className="facility-section">
        <div className="facility-tabs">
          {facilityTabs.map((tab) => (
            <button
              type="button"
              key={tab.id}
              className={`facility-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="facility-dropdown-wrapper">
          <select
            className="facility-dropdown"
            aria-label="Select library section"
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
          >
            {facilityTabs.map((tab) => (
              <option key={tab.id} value={tab.id}>
                {tab.label}
              </option>
            ))}
          </select>
        </div>

        {facilityTabs.map((tab) => {
          const sectionSchedule = hours?.[tab.key];
          const status = evaluateFacilityStatus(sectionSchedule, now);

          return (
            <div
              key={tab.id}
              className={`facility-content ${activeTab === tab.id ? 'active' : ''}`}
            >
              <h3 className="facility-name">{tab.key}</h3>
              <div className="facility-hours">
                {sectionSchedule && (() => {
                  const todayEntry = Object.entries(sectionSchedule).find(([day]) => isToday(day, now));

                  return (
                    <>
                      {todayEntry && (() => {
                        const [day, hoursValue] = todayEntry;
                        const timeRanges = parseMultipleTimeRanges(hoursValue);
                        const dayWithDate = formatDayWithDate(day);
                        const isClosed = isClosedTime(hoursValue);

                        return (
                          <div key={`today-${day}`} className="today-card">
                            <div className="today-card-header">Today&apos;s Hours</div>
                            <div className="today-card-date">{dayWithDate}</div>
                            <LiveStatusBadge status={status} />
                            <div className="today-card-times">
                              {timeRanges.map((timeRange, index) => (
                                <div
                                  key={index}
                                  className={`today-card-time ${isClosed ? 'closed-not-available' : ''}`}
                                >
                                  {timeRange}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}

                      {Object.entries(sectionSchedule).map(([day, dayHours]) => {
                        const timeRanges = parseMultipleTimeRanges(dayHours);
                        const dayWithDate = formatDayWithDate(day);
                        const isClosed = isClosedTime(dayHours);

                        return (
                          <div key={day} className="hours-row">
                            <span className="day-name">{dayWithDate}</span>
                            <div className="hours-time-container">
                              {timeRanges.map((timeRange, index) => (
                                <span
                                  key={index}
                                  className={`hours-time ${isClosed ? 'closed-not-available' : ''}`}
                                >
                                  {timeRange}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </>
                  );
                })()}
              </div>
            </div>
          );
        })}
      </div>

      <div className="hours-info">Hours may vary during finals, holidays, and intersessions.</div>

      <a
        href="https://www.angelo.edu/library/hours.php"
        target="_blank"
        rel="noopener noreferrer"
        className="website-link"
      >
        View on Library Website
      </a>
    </div>
  );
};

export default Library;
