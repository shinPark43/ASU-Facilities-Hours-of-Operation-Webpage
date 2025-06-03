import React, { useState, useEffect } from 'react';

const Gym = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('chp');
  const [facilities, setFacilities] = useState(null);

  useEffect(() => {
    // Temporary mock data - will be replaced with API call
    const mockFacilities = {
      chp: {
        name: 'CHP (Fitness Center)',
        hours: {
          'Monday': '6:00 AM - 10:00 PM',
          'Tuesday': '6:00 AM - 10:00 PM',
          'Wednesday': '6:00 AM - 10:00 PM',
          'Thursday': '6:00 AM - 10:00 PM',
          'Friday': '6:00 AM - 8:00 PM',
          'Saturday': '8:00 AM - 5:00 PM',
          'Sunday': '1:00 PM - 5:00 PM'
        }
      },
      pool: {
        name: 'Swimming Pool',
        hours: {
          'Monday': '6:30 AM - 8:00 PM',
          'Tuesday': '6:30 AM - 8:00 PM',
          'Wednesday': '6:30 AM - 8:00 PM',
          'Thursday': '6:30 AM - 8:00 PM',
          'Friday': '6:30 AM - 6:00 PM',
          'Saturday': 'Closed',
          'Sunday': 'Closed'
        }
      },
      climbing: {
        name: 'Climbing Gym',
        hours: {
          'Monday': '3:00 PM - 8:00 PM',
          'Tuesday': '3:00 PM - 8:00 PM',
          'Wednesday': '3:00 PM - 8:00 PM',
          'Thursday': '3:00 PM - 8:00 PM',
          'Friday': '3:00 PM - 6:00 PM',
          'Saturday': 'Closed',
          'Sunday': 'Closed'
        }
      },
      lake: {
        name: 'Lake House',
        hours: {
          'Monday': '3:00 PM - 7:00 PM',
          'Tuesday': '3:00 PM - 7:00 PM',
          'Wednesday': '3:00 PM - 7:00 PM',
          'Thursday': '3:00 PM - 7:00 PM',
          'Friday': '3:00 PM - 6:00 PM',
          'Saturday': '10:00 AM - 4:00 PM',
          'Sunday': 'Closed'
        }
      },
      intramural: {
        name: 'Intramural Complex',
        hours: {
          'Monday': '6:00 AM - 11:00 PM',
          'Tuesday': '6:00 AM - 11:00 PM',
          'Wednesday': '6:00 AM - 11:00 PM',
          'Thursday': '6:00 AM - 11:00 PM',
          'Friday': '6:00 AM - 9:00 PM',
          'Saturday': '9:00 AM - 6:00 PM',
          'Sunday': '1:00 PM - 11:00 PM'
        }
      }
    };

    // Simulate API call
    setTimeout(() => {
      setFacilities(mockFacilities);
      setLoading(false);
    }, 1000);
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

  const facilityTabs = [
    { id: 'chp', label: 'CHP (Fitness Center)' },
    { id: 'pool', label: 'Swimming Pool' },
    { id: 'climbing', label: 'Climbing Gym' },
    { id: 'lake', label: 'Lake House' },
    { id: 'intramural', label: 'Intramural Complex' }
  ];

  return (
    <div>
      <h2 className="section-panel-header">Recreation Center</h2>
      <p className="section-subtitle">
        Fitness facilities, swimming, climbing, and recreational activities
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
        
        {facilities && Object.keys(facilities).map((facilityId) => (
          <div
            key={facilityId}
            className={`facility-content ${activeTab === facilityId ? 'active' : ''}`}
          >
            <h3 className="facility-name">{facilities[facilityId].name}</h3>
            <div className="facility-hours">
              {Object.entries(facilities[facilityId].hours).map(([day, hours]) => (
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