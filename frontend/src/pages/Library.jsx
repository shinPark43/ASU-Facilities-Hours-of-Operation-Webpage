import React, { useState, useEffect } from 'react';
import { facilityAPI } from '../services/api.js';
import { parseMultipleTimeRanges, formatDayWithDate, isClosedTime, isToday } from '../utils/timeUtils.js';
import { AnnouncementBanner } from '../components/AnnouncementBanner.jsx';

const Library = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hours, setHours] = useState(null);
  const [activeTab, setActiveTab] = useState('main-library');

  useEffect(() => {
    const fetchLibraryHours = async () => {
      try {
        setLoading(true);
        const data = await facilityAPI.getLibraryHours();
        if (data && data.sections) {
          setHours(data.sections);
        } else {
          throw new Error('No library hours data available');
        }
      } catch (err) {
        setError(`Error loading library hours: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchLibraryHours();
  }, []);

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p>Loading library hours...</p>
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

  const facilityTabs = [
    { id: 'main-library', label: 'Main Library', key: 'Main Library' },
    { id: 'research-desk', label: 'Research Assistance', key: 'Research Assistance Desk' },
    { id: 'west-texas', label: 'West Texas', key: 'West Texas Collection' }
  ];

  return (
    <div>
      <AnnouncementBanner 
        items={[
          "<strong>Jan. 16 until January 23</strong> - Late Registration Period, Spring 2026", 
          "<strong>Jan. 19</strong> - University Closed in Observance of Martin Luther King, Jr. Day", 
          "<strong>Jan. 20</strong> - First Class Day of Regular Term and 1st 8-Week Session, Spring 2026"
        ]} 
        speedSec={280}
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
                                {timeRange}
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
        ))}
      </div>
      
      <div className="hours-info">
        Hours may vary during finals, holidays, and intersessions.
      </div>
      
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