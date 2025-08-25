import React, { useState, useEffect } from 'react';
import { facilityAPI } from '../services/api.js';
import { parseMultipleTimeRanges, formatDayWithDate, isClosedTime, normalizeTimeFormat } from '../utils/timeUtils.js';

const Dining = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hours, setHours] = useState(null);
  const [activeTab, setActiveTab] = useState(null);

  useEffect(() => {
    const fetchDiningHours = async () => {
      try {
        setLoading(true);
        const data = await facilityAPI.getDiningHours();
        if (data && data.sections) {
          setHours(data.sections);
          // Set initial active tab to first facility
          const facilities = Object.keys(data.sections);
          if (facilities.length > 0) {
            setActiveTab(facilities[0]);
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

  return (
    <div>
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
              {hours && hours[tab.key] && Object.entries(hours[tab.key]).map(([day, hours]) => {
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