import React, { useState, useEffect } from 'react';
import { fetchFacilityData } from '../services/api.js';
import { parseMultipleTimeRanges, formatDayWithDate, isClosedTime } from '../utils/timeUtils.js';

const RamTram = () => {
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [hours,   setHours]   = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  
  // Campus stop locations (same for both routes)
  const campusStops = [
    { name: 'Plaza Verde', address: '2010 S Van Buren St, San Angelo, TX 76904', mapUrl: 'https://maps.google.com/?q=Plaza+Verde+Angelo+State+University' },
    { name: 'Centennial Village', address: '1901 Rosemont Dr, San Angelo, TX 76904', mapUrl: 'https://maps.google.com/?q=Centennial+Village+Angelo+State+University' }
  ];

  useEffect(() => {
    const fetchRamTram = async () => {
      try {
        setLoading(true);
        // Use fetchFacilityData which includes fallback to mock data
        const data = await fetchFacilityData('ram_tram');
        
        if (data && data.sections && data.sections['Ram Tram']) {
          setHours(data.sections['Ram Tram']);
        } else {
          // Fallback to mock data directly
          setHours(data.sections['Ram Tram'] || {});
        }
      } catch (err) {
        console.error('Ram Tram fetch error:', err);
        setError(`Error loading Ram Tram hours: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchRamTram();
  }, []);

  const handleDayClick = (day) => {
    setSelectedDay(selectedDay === day ? null : day);
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p>Loading Ram Tram schedule...</p>
      </div>
    );
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="facility-page">
      <h2 className="section-panel-header">Ram Tram</h2>
      <div className="subtitle-container">
        <p className="section-subtitle">Campus transportation system</p>
        <p className="instruction-text">• Click on available time slots to view stop locations</p>
      </div>
      <div className="facility-hours">
        {hours && Object.entries(hours)
          .sort(([dayA], [dayB]) => {
            // Sort days from Sunday to Saturday
            const dayOrder = {
              'Sunday': 0,
              'Monday': 1,
              'Tuesday': 2,
              'Wednesday': 3,
              'Thursday': 4,
              'Friday': 5,
              'Saturday': 6
            };
            return dayOrder[dayA] - dayOrder[dayB];
          })
          .map(([day, times]) => {
            const closed = isClosedTime(times);
            const isSelected = selectedDay === day;
            
            // Handle route information
            let displayText = '';
            let routeInfo = '';
            
            if (typeof times === 'object' && times.time && times.route) {
              // New format with route info
              displayText = times.time;
              routeInfo = times.route;
            } else {
              // Old format - parse time ranges
              const ranges = parseMultipleTimeRanges(times);
              displayText = ranges.join(', ');
            }
            
            return (
              <div key={day}>
                <div 
                  className={`hours-row ${isSelected ? 'selected' : ''} ${!closed ? 'clickable' : ''}`}
                  onClick={() => !closed && handleDayClick(day)}
                  style={{ cursor: !closed ? 'pointer' : 'default' }}
                >
                  <span className="day-name">
                    {formatDayWithDate(day)}
                    {routeInfo && <span style={{ color: '#666', fontSize: '0.9em', marginLeft: '8px' }}>({routeInfo})</span>}
                  </span>
                  <div className="hours-time-container">
                    <span className={`hours-time${closed ? ' closed-not-available' : ''}`}>
                      {displayText}
                    </span>
                  </div>
                </div>
                
                {/* Stop locations card - shown when day is selected */}
                {isSelected && !closed && (
                  <div className="stop-locations-card">
                    <div className="stop-locations-header">
                      <h4>Campus Stop Locations</h4>
                    </div>
                    <div className="stop-locations-list">
                      {campusStops.map((stop, index) => (
                        <div key={index} className="stop-location-item">
                          <div className="stop-info">
                            <div className="stop-name">{stop.name}</div>
                            <div className="stop-address">{stop.address}</div>
                          </div>
                          <a 
                            href={stop.mapUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="stop-map-link"
                          >
                            &gt; Map
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
      </div>

      <div className="hours-info">
        Hours may vary during finals, holidays, and intersessions.
      </div>

      {/* <footer className="app-footer">
        <div className="map-container">
          <div className="map-info">
            <h3 className="map-title">Plaza Verde</h3>
            <p className="map-address">2010 S Van Buren St, San Angelo, TX 76904, United States</p>
            <div className="map-description">
              <p>Campus transportation stop location and student housing complex.</p>
            </div>
          </div>
          <div className="map-content">
            <iframe 
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d851.0054292873803!2d-100.4584980211054!3d31.441069065283866!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8657e5971c6b6471%3A0x1e7011a8901bc518!2sPlaza%20Verde!5e0!3m2!1sen!2skr!4v1754041936581!5m2!1sen!2skr"
              width="700" 
              height="300" 
              style={{border: 0}} 
              title="Map"
              allowFullScreen="" 
              loading="lazy" 
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>
        </div>

        <div className="map-container">
          <div className="map-info">
            <h3 className="map-title">Centennial Village</h3>
            <p className="map-address">1901 Rosemont Dr, San Angelo, TX 76904, United States</p>
            <div className="map-description">
              <p>Campus transportation stop location and student housing complex.</p>
            </div>
          </div>
          <div className="map-content">
            <iframe 
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1012.0122956893575!2d-100.46910558672982!3d31.44194096200112!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x8657e5bbe9c6bcf7%3A0x44cdfdc5b9bc556!2sCentennial%20Village!5e0!3m2!1sen!2skr!4v1754052104466!5m2!1sen!2skr" 
            width="700" 
            height="300" 
              style={{border: 0}} 
              title="Map"
              allowFullScreen="" 
              loading="lazy" 
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>
        </div>

        <a 
          href="https://www.angelo.edu/life-on-campus/live/parking-and-transportation/ram-tram.php"
          target="_blank"
          rel="noopener noreferrer"
          className="website-link"
        >
          View on Ram Tram Website
        </a>
      </footer> */}
      
      <a 
        href="https://www.angelo.edu/life-on-campus/live/parking-and-transportation/ram-tram.php"
        target="_blank"
        rel="noopener noreferrer"
        className="website-link"
      >
        View on Ram Tram Website
      </a>
    </div>
  );
};

export default RamTram;