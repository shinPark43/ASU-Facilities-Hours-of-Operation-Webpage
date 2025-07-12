import React, { useState, useEffect } from 'react';
import { facilityAPI } from '../services/api.js';
import { parseMultipleTimeRanges, formatWeekRange, formatDayWithDate, isClosedTime, getRelativeUpdateTime } from '../utils/timeUtils.js';

const Gym = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('CHP (Fitness Center)');
  const [facilities, setFacilities] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    const fetchRecreationHours = async () => {
      try {
        setLoading(true);
        const data = await facilityAPI.getRecreationHours();
        if (data && data.sections) {
          setFacilities(data.sections);
          setLastUpdated(data.last_updated);
        } else {
          throw new Error('No recreation hours data available');
        }
      } catch (err) {
        setError(`Error loading recreation hours: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchRecreationHours();
  }, []);

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p>Loading recreation center hours...</p>
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
  const facilityTabs = facilities ? Object.keys(facilities).map(facilityName => ({
    id: facilityName,
    label: facilityName
  })) : [];

  // Set initial active tab when data loads
  if (facilities && !facilities[activeTab] && facilityTabs.length > 0) {
    setActiveTab(facilityTabs[0].id);
  }

  return (
    <div>
      <h2 className="section-panel-header">Recreation Center</h2>
      <p className="section-subtitle">
        Fitness facilities, swimming, climbing, and recreational activities
      </p>
      <div className="week-context-card">
        <div className="week-context-header">
          <span className="week-context-label">CURRENT WEEK</span>
        </div>
        <div className="week-context-date">
          {formatWeekRange()}
        </div>
        <div className="week-context-status">
          Last updated: {getRelativeUpdateTime(lastUpdated)}
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
        
        {facilities && Object.keys(facilities).map((facilityName) => (
          <div
            key={facilityName}
            className={`facility-content ${activeTab === facilityName ? 'active' : ''}`}
          >
            <h3 className="facility-name">{facilityName}</h3>
            <div className="facility-hours">
              {Object.entries(facilities[facilityName]).map(([day, hours]) => {
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
                          {timeRange}
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
        href="https://www.angelo.edu/life-on-campus/play/university-recreation/urec-hours-of-operation.php" 
        target="_blank" 
        rel="noopener noreferrer"
        className="website-link"
      >
        View on Recreation Website
      </a>
    </div>
  );
};

export default Gym;