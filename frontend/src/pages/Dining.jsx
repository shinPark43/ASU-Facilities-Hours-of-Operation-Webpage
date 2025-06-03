import React, { useState, useEffect } from 'react';

const Dining = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hours, setHours] = useState(null);
  const [activeTab, setActiveTab] = useState('tea-co');

  useEffect(() => {
    // Temporary mock data - will be replaced with API call
    const mockHours = {
      'TEA Co': {
        'Monday': '7:30 AM - 5:00 PM',
        'Tuesday': '7:30 AM - 5:00 PM',
        'Wednesday': '7:30 AM - 5:00 PM',
        'Thursday': '7:30 AM - 5:00 PM',
        'Friday': '7:30 AM - 2:30 PM',
        'Saturday': 'Closed',
        'Sunday': 'Closed'
      },
      'The CAF': {
        'Monday': '7:00 AM - 8:00 PM',
        'Tuesday': '7:00 AM - 8:00 PM',
        'Wednesday': '7:00 AM - 8:00 PM',
        'Thursday': '7:00 AM - 8:00 PM',
        'Friday': '7:00 AM - 7:00 PM',
        'Saturday': '11:00 AM - 7:00 PM',
        'Sunday': '11:00 AM - 8:00 PM'
      },
      'Einstein Bros Bagels': {
        'Monday': '7:30 AM - 3:00 PM',
        'Tuesday': '7:30 AM - 3:00 PM',
        'Wednesday': '7:30 AM - 3:00 PM',
        'Thursday': '7:30 AM - 3:00 PM',
        'Friday': '7:30 AM - 2:00 PM',
        'Saturday': 'Closed',
        'Sunday': 'Closed'
      },
      'Starbucks': {
        'Monday': '7:00 AM - 8:00 PM',
        'Tuesday': '7:00 AM - 8:00 PM',
        'Wednesday': '7:00 AM - 8:00 PM',
        'Thursday': '7:00 AM - 8:00 PM',
        'Friday': '7:00 AM - 5:00 PM',
        'Saturday': '9:00 AM - 2:00 PM',
        'Sunday': '2:00 PM - 8:00 PM'
      },
      'Chick-Fil-A': {
        'Monday': '11:00 AM - 7:00 PM',
        'Tuesday': '11:00 AM - 7:00 PM',
        'Wednesday': '11:00 AM - 7:00 PM',
        'Thursday': '11:00 AM - 7:00 PM',
        'Friday': '11:00 AM - 5:00 PM',
        'Saturday': 'Closed',
        'Sunday': 'Closed'
      },
      'Subway': {
        'Monday': '10:30 AM - 8:00 PM',
        'Tuesday': '10:30 AM - 8:00 PM',
        'Wednesday': '10:30 AM - 8:00 PM',
        'Thursday': '10:30 AM - 8:00 PM',
        'Friday': '10:30 AM - 5:00 PM',
        'Saturday': 'Closed',
        'Sunday': '4:00 PM - 8:00 PM'
      },
      'Tu Taco': {
        'Monday': '11:00 AM - 7:00 PM',
        'Tuesday': '11:00 AM - 7:00 PM',
        'Wednesday': '11:00 AM - 7:00 PM',
        'Thursday': '11:00 AM - 7:00 PM',
        'Friday': '11:00 AM - 3:00 PM',
        'Saturday': 'Closed',
        'Sunday': 'Closed'
      },
      'Ranch Smokehouse': {
        'Monday': '11:00 AM - 2:00 PM',
        'Tuesday': '11:00 AM - 2:00 PM',
        'Wednesday': '11:00 AM - 2:00 PM',
        'Thursday': '11:00 AM - 2:00 PM',
        'Friday': '11:00 AM - 2:00 PM',
        'Saturday': 'Closed',
        'Sunday': 'Closed'
      },
      'Market': {
        'Monday': '7:30 AM - 12:00 AM',
        'Tuesday': '7:30 AM - 12:00 AM',
        'Wednesday': '7:30 AM - 12:00 AM',
        'Thursday': '7:30 AM - 12:00 AM',
        'Friday': '7:30 AM - 8:00 PM',
        'Saturday': '12:00 PM - 8:00 PM',
        'Sunday': '2:00 PM - 12:00 AM'
      },
      'Sushi': {
        'Monday': '11:00 AM - 5:00 PM',
        'Tuesday': '11:00 AM - 5:00 PM',
        'Wednesday': '11:00 AM - 5:00 PM',
        'Thursday': '11:00 AM - 5:00 PM',
        'Friday': '11:00 AM - 3:00 PM',
        'Saturday': 'Closed',
        'Sunday': 'Closed'
      },
      "Roscoe's Den": {
        'Monday': '7:00 AM - 12:00 AM',
        'Tuesday': '7:00 AM - 12:00 AM',
        'Wednesday': '7:00 AM - 12:00 AM',
        'Thursday': '7:00 AM - 12:00 AM',
        'Friday': '7:00 AM - 8:00 PM',
        'Saturday': '12:00 PM - 8:00 PM',
        'Sunday': '2:00 PM - 12:00 AM'
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

  const facilityTabs = [
    { id: 'tea-co', label: 'TEA Co', key: 'TEA Co' },
    { id: 'caf', label: 'The CAF', key: 'The CAF' },
    { id: 'einstein', label: 'Einstein', key: 'Einstein Bros Bagels' },
    { id: 'starbucks', label: 'Starbucks', key: 'Starbucks' },
    { id: 'chick-fil-a', label: 'Chick-Fil-A', key: 'Chick-Fil-A' },
    { id: 'subway', label: 'Subway', key: 'Subway' },
    { id: 'tu-taco', label: 'Tu Taco', key: 'Tu Taco' },
    { id: 'ranch', label: 'Ranch', key: 'Ranch Smokehouse' },
    { id: 'market', label: 'Market', key: 'Market' },
    { id: 'sushi', label: 'Sushi', key: 'Sushi' },
    { id: 'roscoes', label: "Roscoe's", key: "Roscoe's Den" }
  ];

  return (
    <div>
      <h2 className="section-panel-header">Dine on Campus</h2>
      <p className="section-subtitle">
        Campus dining options, coffee shops, and food courts
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
        Hours may vary during holidays and special events.
      </div>
      
      <a 
        href="https://dineoncampus.com/Angelo/hours-of-operation" 
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