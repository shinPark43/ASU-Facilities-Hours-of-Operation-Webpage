import React, { useState, useEffect } from 'react';
import { tutoringAPI } from '../services/api.js';
import { AnnouncementBanner } from '../components/AnnouncementBanner.jsx';

const Tutoring = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tutoringData, setTutoringData] = useState(null);
  const [activeSubject, setActiveSubject] = useState(null);
  const [expandedCourses, setExpandedCourses] = useState({});

  useEffect(() => {
    const fetchTutoringData = async () => {
      try {
        setLoading(true);
        const data = await tutoringAPI.getAllTutoringData();
        if (data && data.subjects && Object.keys(data.subjects).length > 0) {
          setTutoringData(data);
          // Set the first subject as active by default
          const firstSubject = Object.keys(data.subjects)[0];
          setActiveSubject(firstSubject);
        } else {
          throw new Error('No tutoring data available');
        }
      } catch (err) {
        setError(`Error loading tutoring data: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchTutoringData();
  }, []);

  const toggleCourse = (courseName) => {
    setExpandedCourses(prev => ({
      ...prev,
      [courseName]: !prev[courseName]
    }));
  };

  const getDayAbbreviation = (day) => {
    const abbreviations = {
      'Sunday': 'Sun',
      'Monday': 'Mon',
      'Tuesday': 'Tue',
      'Wednesday': 'Wed',
      'Thursday': 'Thu',
      'Friday': 'Fri',
      'Saturday': 'Sat'
    };
    return abbreviations[day] || day;
  };

  const formatTime = (time) => {
    if (!time || time === 'TBA') return 'TBA';
    return time;
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner"></div>
        <p>Loading tutoring schedule...</p>
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

  const subjects = tutoringData?.subjects ? Object.keys(tutoringData.subjects) : [];

  return (
    <div>
      <AnnouncementBanner 
        items={[
          "<strong>Free Tutoring</strong> - Available to all ASU students, no appointment necessary",
          "<strong>Upswing</strong> - 2 hours/week of free online tutoring available"
        ]} 
        speedSec={280}
        link="https://www.angelo.edu/current-students/freshman-college/academic-tutoring.php"
      />

      <h2 className="section-panel-header">Academic Support Center</h2>
      <p className="section-subtitle">
        Free tutoring services for ASU students
      </p>

      <div className="facility-section">
        {/* Subject Tabs */}
        <div className="facility-tabs tutoring-tabs">
          {subjects.map((subject) => (
            <button
              key={subject}
              className={`facility-tab ${activeSubject === subject ? 'active' : ''}`}
              onClick={() => setActiveSubject(subject)}
            >
              {subject}
            </button>
          ))}
        </div>
        
        {/* Subject Dropdown for Mobile */}
        <div className="facility-dropdown-wrapper">
          <select 
            className="facility-dropdown"
            value={activeSubject || ''}
            onChange={(e) => setActiveSubject(e.target.value)}
          >
            {subjects.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
        </div>
        
        {/* Course List */}
        {subjects.map((subjectName) => {
          const subject = tutoringData.subjects[subjectName];
          const courses = subject?.courses || {};
          
          return (
            <div
              key={subjectName}
              className={`facility-content ${activeSubject === subjectName ? 'active' : ''}`}
            >
              <div className="tutoring-courses-list">
                {Object.entries(courses).map(([courseName, course]) => {
                  const isExpanded = expandedCourses[courseName];
                  const sessions = course.sessions || [];
                  const hasSessions = sessions.length > 0 && !sessions.every(s => s.is_tba);
                  
                  return (
                    <div key={courseName} className="tutoring-course-card">
                      <button
                        className={`tutoring-course-header ${isExpanded ? 'expanded' : ''}`}
                        onClick={() => toggleCourse(courseName)}
                        aria-expanded={isExpanded}
                      >
                        <div className="tutoring-course-info">
                          <span className="tutoring-course-name">{courseName}</span>
                          {!!course.has_online && (
                            <span className="tutoring-online-badge">Online Available</span>
                          )}
                        </div>
                        <span className={`tutoring-expand-icon ${isExpanded ? 'expanded' : ''}`}>
                          ▼
                        </span>
                      </button>
                      
                      {isExpanded && (
                        <div className="tutoring-course-sessions">
                          {!hasSessions ? (
                            <div className="tutoring-session-row tba">
                              <span className="tutoring-tba">Schedule TBA - Check back later</span>
                            </div>
                          ) : (
                            <div className="tutoring-sessions-table">
                              <div className="tutoring-sessions-header">
                                <span>Day</span>
                                <span>Time</span>
                                <span>Location</span>
                              </div>
                              {sessions.map((session, index) => (
                                <div 
                                  key={index} 
                                  className={`tutoring-session-row ${session.is_tba ? 'tba' : ''} ${session.is_online ? 'online' : ''}`}
                                >
                                  <span className="tutoring-session-day">
                                    {getDayAbbreviation(session.day)}
                                  </span>
                                  <span className="tutoring-session-time">
                                    {formatTime(session.time)}
                                  </span>
                                  <span className="tutoring-session-location">
                                    {session.location || 'TBA'}
                                    {session.is_online && (
                                      <span className="online-indicator"> (Online)</span>
                                    )}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="hours-info">
        Tutoring is free to all ASU students. No appointment necessary for in-person tutoring.
        <br />
        Online tutoring via Upswing: 2 free hours per week.
      </div>
      
      <a 
        href="https://www.angelo.edu/current-students/freshman-college/academic-tutoring.php" 
        target="_blank" 
        rel="noopener noreferrer"
        className="website-link"
      >
        View on ASU Website
      </a>
    </div>
  );
};

export default Tutoring;
