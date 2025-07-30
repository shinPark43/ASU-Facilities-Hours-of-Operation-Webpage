import React, { useState, useEffect } from 'react';
import { fetchFacilityData } from '../services/api.js';
import { parseMultipleTimeRanges, formatDayWithDate, isClosedTime } from '../utils/timeUtils.js';

const RamTram = () => {
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [hours,   setHours]   = useState(null);

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
      <p className="section-subtitle">Campus transportation system</p>
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
              <div key={day} className="hours-row">
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
            );
          })}
      </div>

      <div className="hours-info">
        Hours may vary during finals, holidays, and intersessions.
      </div>

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