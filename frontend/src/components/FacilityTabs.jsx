import React, { useState } from 'react';

const FacilityTabs = ({ facilities }) => {
  const [activeTab, setActiveTab] = useState(facilities[0]?.id);

  return (
    <div className="facility-tabs">
      {facilities.map((facility) => (
        <div
          key={facility.id}
          className={`facility-tab ${activeTab === facility.id ? 'active' : ''}`}
          onClick={() => setActiveTab(facility.id)}
        >
          {facility.name}
        </div>
      ))}
      {facilities.map((facility) => (
        <div
          key={`content-${facility.id}`}
          className={`facility-content ${activeTab === facility.id ? 'active' : ''}`}
        >
          <div className="facility-section">
            <h3 className="facility-name">{facility.name}</h3>
            <div className="facility-hours">
              {Object.entries(facility.hours).map(([day, hours]) => (
                <div key={day} className="hours-row">
                  <span className="day-name">{day}</span>
                  <span className={`hours-time ${hours.toLowerCase() === 'closed' ? 'closed-not-available' : ''}`}>
                    {hours}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default FacilityTabs; 