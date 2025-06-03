import React, { useState, useEffect } from 'react';

const Library = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hours, setHours] = useState(null);
  const [activeTab, setActiveTab] = useState('main-library');

  useEffect(() => {
    // Temporary mock data - will be replaced with API call
    const mockHours = {
      'Main Library': {
        'Monday': '7:30 AM - 2:00 AM',
        'Tuesday': '7:30 AM - 2:00 AM',
        'Wednesday': '7:30 AM - 2:00 AM',
        'Thursday': '7:30 AM - 2:00 AM',
        'Friday': '7:30 AM - 6:00 PM',
        'Saturday': '10:00 AM - 6:00 PM',
        'Sunday': '12:00 PM - 2:00 AM'
      },
      'IT Desk': {
        'Monday': '8:00 AM - 8:00 PM',
        'Tuesday': '8:00 AM - 8:00 PM',
        'Wednesday': '8:00 AM - 8:00 PM',
        'Thursday': '8:00 AM - 8:00 PM',
        'Friday': '8:00 AM - 5:00 PM',
        'Saturday': 'Closed',
        'Sunday': '2:00 PM - 8:00 PM'
      },
      'West Texas Collection': {
        'Monday': '10:00 AM - 5:00 PM',
        'Tuesday': '10:00 AM - 5:00 PM',
        'Wednesday': '10:00 AM - 5:00 PM',
        'Thursday': '10:00 AM - 5:00 PM',
        'Friday': '10:00 AM - 4:00 PM',
        'Saturday': 'Closed',
        'Sunday': 'Closed'
      }
    };

    // Simulate API call
    setTimeout(() => {
      setHours(mockHours);
      setLoading(false);
    }, 1000);
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
    { id: 'it-desk', label: 'IT Desk', key: 'IT Desk' },
    { id: 'west-texas', label: 'West Texas', key: 'West Texas Collection' }
  ];

  return (
    <div>
      <h2 className="section-panel-header">Porter Henderson Library</h2>
      <p className="section-subtitle">
        Academic resources, research support, and study spaces
      </p>
      
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
              {hours && Object.entries(hours[tab.key]).map(([day, hours]) => (
                <div key={day} className="hours-row">
                  <span className="day-name">{day}</span>
                  <span className={`hours-time ${hours.toLowerCase() === 'closed' ? 'closed-not-available' : ''}`}>
                    {hours}
                  </span>
                </div>
              ))}
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