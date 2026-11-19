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

const Essentials = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [facilityData, setFacilityData] = useState(null);
  const [activeTab, setActiveTab] = useState(null);
  const [now, setNow] = useState(() => new Date());
  const [searchParams] = useSearchParams();

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchFacilityData('essentials');
      if (data && data.sections) {
        setFacilityData(data);
        const sectionNames = Object.keys(data.sections);
        setActiveTab((prev) => (prev && data.sections[prev] ? prev : sectionNames[0] || null));
      } else {
        throw new Error('No campus essentials data available');
      }
    } catch (err) {
      setError(`Error loading campus essentials hours: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Minute-aligned clock for live open/closing badges
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
    if (!tabParam || !facilityData?.sections) return;
    if (facilityData.sections[tabParam]) {
      setActiveTab(tabParam);
    }
  }, [searchParams, facilityData]);

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p>Loading campus essentials hours...</p>
      </div>
    );
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  const sections = facilityData?.sections || {};
  const metadata = facilityData?.metadata || {};
  const facilityTabs = Object.keys(sections).map((name) => ({
    id: name,
    label: name
      .replace('Ram Central Station (Bookstore)', 'Bookstore')
      .replace('Mail Services (Post Office)', 'Post Office')
      .replace('University Health Clinic', 'Health Clinic'),
    key: name,
  }));

  return (
    <div>
      <StaleDataBanner
        isFallback={Boolean(facilityData?._isFallback)}
        source={facilityData?._source}
        cachedAt={facilityData?._cachedAt}
        onRetry={loadData}
      />

      <div className="page-header-with-square-button">
        <div className="page-header-content">
          <h2 className="section-panel-header">Campus Essentials</h2>
          <p className="section-subtitle">
            Ram Central Station Bookstore, Mail Services (Post Office), and University Health Clinic
          </p>
        </div>
      </div>

      <div className="facility-section">
        <div className="facility-tabs">
          {facilityTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
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
            aria-label="Select campus service"
            value={activeTab || ''}
            onChange={(e) => setActiveTab(e.target.value)}
          >
            {facilityTabs.map((tab) => (
              <option key={tab.id} value={tab.id}>
                {tab.key}
              </option>
            ))}
          </select>
        </div>

        {facilityTabs.map((tab) => {
          const sectionSchedule = sections[tab.key];
          const sectionMeta = metadata[tab.key];
          const status = evaluateFacilityStatus(sectionSchedule, now);

          return (
            <div
              key={tab.id}
              className={`facility-content ${activeTab === tab.id ? 'active' : ''}`}
            >
              <h3 className="facility-name">{tab.key}</h3>

              {sectionMeta && (
                <div className="essentials-meta-card">
                  <span><strong>Location:</strong> {sectionMeta.location}</span>
                  <span><strong>Info:</strong> {sectionMeta.note}</span>
                </div>
              )}

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

                      {Object.entries(sectionSchedule).map(([day, hoursValue]) => {
                        const timeRanges = parseMultipleTimeRanges(hoursValue);
                        const dayWithDate = formatDayWithDate(day);
                        const isClosed = isClosedTime(hoursValue);

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

              {sectionMeta?.url && (
                <a
                  href={sectionMeta.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="website-link"
                >
                  View Official ASU Page
                </a>
              )}
            </div>
          );
        })}
      </div>

      <div className="hours-info">
        Hours may vary during finals, university holidays, and summer sessions.
      </div>
    </div>
  );
};

export default Essentials;
