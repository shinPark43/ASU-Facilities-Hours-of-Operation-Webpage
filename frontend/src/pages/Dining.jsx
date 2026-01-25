import React, { useState, useEffect } from 'react';
import { facilityAPI } from '../services/api.js';
import { parseMultipleTimeRanges, formatDayWithDate, isClosedTime, normalizeTimeFormat, isToday } from '../utils/timeUtils.js';
import { AnnouncementBanner } from '../components/AnnouncementBanner.jsx';

const Dining = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hours, setHours] = useState(null);
  const [activeTab, setActiveTab] = useState(null);
  const [showNotice, setShowNotice] = useState(() => {
    // Notice only applies to Jan 24-25, 2026
    const today = new Date();
    const startDate = new Date('2026-01-24');
    const endDate = new Date('2026-01-25');
    
    // Set times to compare just the dates (ignore time portion)
    today.setHours(0, 0, 0, 0);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    
    // Only show if within date bounds
    if (today < startDate || today > endDate) {
      return false;
    }
    
    // Check if already dismissed today
    const lastDismissed = localStorage.getItem('hhuc-notice-dismissed-date');
    if (!lastDismissed) return true; // Never dismissed, show it
    
    const todayString = today.toDateString();
    return lastDismissed !== todayString; // Show if dismissed on a different day
  });

  useEffect(() => {
    const fetchDiningHours = async () => {
      try {
        setLoading(true);
        const data = await facilityAPI.getDiningHours();
        if (data && data.sections) {
          setHours(data.sections);
          // Set initial active tab to The CAF if available, otherwise first facility
          const facilities = Object.keys(data.sections);
          if (facilities.length > 0) {
            const cafFacility = facilities.find(name => 
              name.toLowerCase().includes('caf') || name.toLowerCase().includes('the caf')
            );
            setActiveTab(cafFacility || facilities[0]);
          }
        } else {
          throw new Error('No dining hours data available');
        }
      } catch (err) {
        setError(`Error loading dining hours: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchDiningHours();
  }, []);

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p>Loading dining hours...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error">
        {error}
      </div>
    );
  }

  // Generate facility tabs from actual API data
  const facilityTabs = hours ? Object.keys(hours).map(facilityName => ({
    id: facilityName,
    label: facilityName.length > 12 ? facilityName.substring(0, 12) + '...' : facilityName,
    key: facilityName
  })) : [];

  const handleDismissNotice = () => {
    localStorage.setItem('hhuc-notice-dismissed-date', new Date().toDateString());
    setShowNotice(false);
  };

  return (
    <div>
      {/* Notice Popup Modal */}
      {showNotice && (
        <div className="notice-popup-overlay" onClick={handleDismissNotice}>
          <div className="notice-popup" onClick={(e) => e.stopPropagation()}>
            <button 
              className="notice-popup-close" 
              onClick={handleDismissNotice}
              aria-label="Close notice"
            >
              ×
            </button>
            <h3 className="notice-popup-title">Building Access Notice</h3>
            <div className="notice-popup-date">
              <span className="notice-popup-date-label">Effective Dates</span>
              <span className="notice-popup-date-value">Jan 24 (Sat) – 25 (Sun)</span>
            </div>
            <p className="notice-popup-message">
              The Houston Harte University Center will be accessible from the Starbucks entrance facing the Carr Education-Fine Arts Building.
            </p>
            <button className="notice-popup-button" onClick={handleDismissNotice}>
              Got it
            </button>
          </div>
        </div>
      )}

      <AnnouncementBanner 
        items={[
          "<strong>Feb. 4</strong> - Census Day, Regular Spring 2026 Semester",
          "<strong>Feb. 12</strong> - Late Registration Final Payment Deadline, Spring 2026"
        ]} 
        speedSec={280}
        link="https://www.angelo.edu/current-students/registrar/academic_calendar.php"
      />

      <div className="page-header-with-square-button">
        <div className="page-header-content">
          <h2 className="section-panel-header">Dine on Campus</h2>
          <p className="section-subtitle">
            Campus dining options, coffee shops, and food courts
          </p>
        </div>
        <div className="square-button-container">
          <a
            href="https://new.dineoncampus.com/Angelo/whats-on-the-menu/the-caf/"
            target="_blank"
            rel="noopener noreferrer"
            className="square-button"
          >
            What's CAF Menu
          </a>
        </div>
      </div>

      <div className="facility-section">
        <div className="facility-tabs">
          {facilityTabs.map((tab) => (
            <button
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
        
        {facilityTabs.map((tab) => (
          <div
            key={tab.id}
            className={`facility-content ${activeTab === tab.id ? 'active' : ''}`}
          >
            <h3 className="facility-name">{tab.key}</h3>
            <div className="facility-hours">
              {hours && hours[tab.key] && (() => {
                const todayEntry = Object.entries(hours[tab.key]).find(([day]) => isToday(day));
                
                return (
                  <>
                    {todayEntry && (() => {
                      const [day, hoursValue] = todayEntry;
                      const timeRanges = parseMultipleTimeRanges(hoursValue);
                      const dayWithDate = formatDayWithDate(day);
                      const isClosed = isClosedTime(hoursValue);
                      
                      return (
                        <div key={`today-${day}`} className="today-card">
                          <div className="today-card-header">Today's Hours</div>
                          <div className="today-card-date">{dayWithDate}</div>
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
                    
                    {Object.entries(hours[tab.key]).map(([day, hours]) => {
                      const timeRanges = parseMultipleTimeRanges(hours);
                      const dayWithDate = formatDayWithDate(day);
                      const isClosed = isClosedTime(hours);
                      
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
          </div>
        ))}
      </div>
      
      <div className="hours-info">
        Hours may vary during holidays and special events.
      </div>
      
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