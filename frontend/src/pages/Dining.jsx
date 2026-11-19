import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchFacilityData, facilityAPI } from '../services/api.js';
import {
  parseMultipleTimeRanges,
  formatDayWithDate,
  isClosedTime,
  normalizeTimeFormat,
  isToday,
  evaluateFacilityStatus,
  msUntilNextMinute,
} from '../utils/timeUtils.js';
import StaleDataBanner from '../components/StaleDataBanner';
import LiveStatusBadge from '../components/LiveStatusBadge';

const Dining = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [facilityData, setFacilityData] = useState(null);
  const [activeTab, setActiveTab] = useState(null);
  const [now, setNow] = useState(() => new Date());
  const [searchParams] = useSearchParams();

  // Today's Daily Menu (The CAF)
  const [menuLoading, setMenuLoading] = useState(false);
  const [menuData, setMenuData] = useState(null);
  const [activeMealPeriod, setActiveMealPeriod] = useState(0);

  const loadDiningHours = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchFacilityData('dining');
      if (data && data.sections) {
        setFacilityData(data);
        const facilities = Object.keys(data.sections);
        if (facilities.length > 0) {
          const cafFacility = facilities.find(
            (name) => name.toLowerCase().includes('caf') || name.toLowerCase().includes('the caf')
          );
          setActiveTab((prev) => (prev && data.sections[prev] ? prev : cafFacility || facilities[0]));
        }
      } else {
        throw new Error('No dining hours data available');
      }
    } catch (err) {
      setError(`Error loading dining hours: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCafMenu = useCallback(async (forceRefresh = false) => {
    try {
      setMenuLoading(true);
      const data = await facilityAPI.getDiningMenu('the-caf', forceRefresh);
      setMenuData(data);
      setActiveMealPeriod(0);
    } catch {
      setMenuData({
        available: false,
        periods: [],
        sourceUrl: 'https://new.dineoncampus.com/Angelo/whats-on-the-menu/the-caf/',
        message: 'Could not reach the menu server right now. View today’s menu directly on DineOnCampus.',
      });
    } finally {
      setMenuLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDiningHours();
    loadCafMenu(false);
  }, [loadDiningHours, loadCafMenu]);

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

  const hours = facilityData?.sections || null;

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (!tabParam || !hours) return;
    if (hours[tabParam]) setActiveTab(tabParam);
  }, [searchParams, hours]);

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p>Loading dining hours...</p>
      </div>
    );
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  const facilityTabs = hours
    ? Object.keys(hours).map((facilityName) => ({
        id: facilityName,
        label: facilityName.length > 12 ? facilityName.substring(0, 12) + '...' : facilityName,
        key: facilityName,
      }))
    : [];

  const isCafTab = (key) => key.toLowerCase().includes('caf');
  const activePeriodObj = menuData?.periods?.[activeMealPeriod] || null;

  return (
    <div>
      <StaleDataBanner
        isFallback={Boolean(facilityData?._isFallback)}
        source={facilityData?._source}
        cachedAt={facilityData?._cachedAt}
        onRetry={loadDiningHours}
      />

      <div className="page-header-with-square-button">
        <div className="page-header-content">
          <h2 className="section-panel-header">Dine on Campus</h2>
          <p className="section-subtitle">Campus dining options, coffee shops, and food courts</p>
        </div>
        <div className="square-button-container">
          <a
            href="https://new.dineoncampus.com/Angelo/whats-on-the-menu/the-caf/"
            target="_blank"
            rel="noopener noreferrer"
            className="square-button"
          >
            What&apos;s CAF Menu
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
            aria-label="Select dining venue"
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
                                  {normalizeTimeFormat(timeRange)}
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
                                  {normalizeTimeFormat(timeRange)}
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

              {/* Today's Daily Menu panel for The CAF */}
              {isCafTab(tab.key) && (
                <section className="dining-menu-panel" aria-label="Today's CAF Daily Menu">
                  <div className="dining-menu-header">
                    <div>
                      <h4 className="dining-menu-title">Today&apos;s CAF Menu</h4>
                      <span className="dining-menu-sub">
                        {menuData?.date ? `Menu for ${menuData.date}` : 'Pulled from DineOnCampus'}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="status-banner-retry"
                      onClick={() => loadCafMenu(true)}
                      disabled={menuLoading}
                    >
                      {menuLoading ? 'Refreshing…' : 'Refresh Menu'}
                    </button>
                  </div>

                  {menuLoading && !menuData ? (
                    <p className="dining-menu-sub">Loading today&apos;s CAF menu…</p>
                  ) : menuData?.available && menuData.periods?.length > 0 ? (
                    <>
                      {menuData.periods.length > 1 && (
                        <div className="dining-menu-periods" role="tablist" aria-label="Meal periods">
                          {menuData.periods.map((period, idx) => (
                            <button
                              key={period.name + idx}
                              type="button"
                              role="tab"
                              aria-selected={activeMealPeriod === idx}
                              className={`dining-period-btn${activeMealPeriod === idx ? ' active' : ''}`}
                              onClick={() => setActiveMealPeriod(idx)}
                            >
                              {period.name}
                            </button>
                          ))}
                        </div>
                      )}

                      {activePeriodObj && (
                        <div className="dining-stations-grid">
                          {activePeriodObj.stations.map((station) => (
                            <div key={station.name} className="dining-station-card">
                              <h5 className="dining-station-name">{station.name}</h5>
                              <ul className="dining-station-list">
                                {station.items.map((item, idx) => (
                                  <li key={`${item.name}-${idx}`} className="dining-station-item">
                                    <span>{item.name}</span>
                                    {item.calories && (
                                      <span className="dining-item-cals">{item.calories} cal</span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="dining-menu-fallback">
                      <p>
                        {menuData?.message ||
                          'Live menu items are currently unavailable from DineOnCampus.'}
                      </p>
                      <a
                        href={
                          menuData?.sourceUrl ||
                          'https://new.dineoncampus.com/Angelo/whats-on-the-menu/the-caf/'
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ecm-sheet-link"
                      >
                        Open Live CAF Menu on DineOnCampus →
                      </a>
                    </div>
                  )}
                </section>
              )}
            </div>
          );
        })}
      </div>

      <div className="hours-info">Hours may vary during holidays and special events.</div>

      <a
        href="https://new.dineoncampus.com/Angelo/hours-of-operation"
        target="_blank"
        rel="noopener noreferrer"
        className="website-link"
      >
        View on Dining Website
      </a>
    </div>
  );
};

export default Dining;
