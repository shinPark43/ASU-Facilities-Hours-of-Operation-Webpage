import React, { useState, useEffect } from 'react';
import { tutoringAPI } from '../services/api.js';
import { AnnouncementBanner } from '../components/AnnouncementBanner.jsx';

// Tutoring notice data - can be moved to backend later
const TUTORING_MEMO = {
  notices: [
    "Free tutoring available to all ASU students",
    "No appointment necessary for in-person sessions",
    "Upswing: 2 hrs/week free online tutoring",
    "ASU tutors are at the top of Upswing list — they do NOT count against your 2 hours"
  ],
  hoursChanged: [
    // Add any temporary hour changes here
    // "Math tutoring closed Jan 20 for MLK Day"
  ],
  links: {
    main: "https://www.angelo.edu/current-students/freshman-college/academic-tutoring.php",
    upswing: "https://angelostate.upswing.io/"
  }
};

const Tutoring = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tutoringData, setTutoringData] = useState(null);
  const [activeSubject, setActiveSubject] = useState(null);
  const [expandedCourses, setExpandedCourses] = useState({});
  const [showNoticePopup, setShowNoticePopup] = useState(false);

  useEffect(() => {
    const fetchTutoringData = async () => {
      try {
        setLoading(true);
        const data = await tutoringAPI.getAllTutoringData();
        if (data && data.subjects && Object.keys(data.subjects).length > 0) {
          setTutoringData(data);
          
          // Set Computer Science as default if available, otherwise use first subject
          const subjects = Object.keys(data.subjects);
          const defaultSubject = subjects.find(s => s.toLowerCase().includes('computer science')) || subjects[0];
          setActiveSubject(defaultSubject);
          
          // Only expand if there's exactly one course in the subject
          const defaultSubjectCourses = data.subjects[defaultSubject]?.courses;
          if (defaultSubjectCourses && Object.keys(defaultSubjectCourses).length === 1) {
            const firstCourseName = Object.keys(defaultSubjectCourses)[0];
            setExpandedCourses({ [firstCourseName]: true });
          }
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

  // Check if time string has multiple ranges (contains comma)
  const hasMultipleTimeRanges = (time) => {
    if (!time || time === 'TBA') return false;
    return time.includes(',');
  };

  // Split time string into separate ranges
  const splitTimeRanges = (time) => {
    if (!time || time === 'TBA') return ['TBA'];
    return time.split(',').map(t => t.trim());
  };

  // Format course name - split if multiple courses are concatenated
  // Pattern: Course codes like "POLS 2305", "MATH 1314", etc.
  const formatCourseName = (name) => {
    if (!name) return '';
    
    // Split where text ends and a new course code begins
    // Handles: lowercase letters, digits, punctuation, and roman numerals (I, V, X)
    // Requires 3-4 letter course codes to avoid splitting "BIOL" into "BI" + "OL"
    // e.g., "FinancialACCT 2302" or "Spanish ISPAN 1302"
    const splitPattern = /(?<=[a-z0-9\-)IVX])(?=[A-Z]{3,4}\s\d{4})/g;
    const courses = name.split(splitPattern).map(c => c.trim()).filter(Boolean);
    
    if (courses.length <= 1) {
      return name;
    }
    
    return courses;
  };

  // Parse time string to minutes for sorting
  const parseTimeToMinutes = (timeStr) => {
    if (!timeStr || timeStr === 'TBA') return 9999; // Put TBA at the end
    
    const lowerStr = timeStr.toLowerCase();
    
    // Handle "noon" anywhere in the string
    if (lowerStr.includes('noon')) {
      return 12 * 60; // 12:00 PM = 720 minutes
    }
    
    // Handle "midnight"
    if (lowerStr.includes('midnight')) {
      return 0;
    }
    
    // Get the start time (before the dash or comma)
    let startTime = timeStr.split('-')[0].split(',')[0].trim();
    
    // Check AM/PM from the FULL string (not just start time)
    // because "7-10 p.m." has PM only at the end
    const isPM = lowerStr.includes('p.m') || lowerStr.includes('pm');
    const isAM = lowerStr.includes('a.m') || lowerStr.includes('am');
    
    // Extract hours and minutes from start time
    const timeMatch = startTime.match(/(\d{1,2})(?::(\d{2}))?/);
    if (!timeMatch) return 9999;
    
    let hours = parseInt(timeMatch[1], 10);
    const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    
    // Convert to 24-hour format
    if (isPM && hours < 12) {
      hours += 12;
    } else if (isAM && hours === 12) {
      hours = 0;
    }
    
    return hours * 60 + minutes;
  };

  // Group sessions by day for merged display
  const groupSessionsByDay = (sessions) => {
    const dayOrder = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const grouped = {};
    
    sessions.forEach(session => {
      const day = session.day;
      if (!grouped[day]) {
        grouped[day] = [];
      }
      grouped[day].push(session);
    });
    
    // Sort by day of week
    const sortedDays = Object.keys(grouped).sort((a, b) => {
      const aIndex = dayOrder.indexOf(a);
      const bIndex = dayOrder.indexOf(b);
      // Handle days not in the list (put them at the end)
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });
    
    return sortedDays.map(day => ({
      day,
      // Sort sessions within each day by start time
      sessions: grouped[day].sort((a, b) => {
        return parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time);
      })
    }));
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
          "<strong>Upswing</strong> - 2 hours/week of free online tutoring available",
          "<strong>Click for more info</strong>"
        ]} 
        speedSec={280}
        onClick={() => setShowNoticePopup(true)}
      />

      {/* Notice Popup Modal - Memo Style */}
      {showNoticePopup && (
        <div className="memo-overlay" onClick={() => setShowNoticePopup(false)}>
          <div className="memo-popup" onClick={(e) => e.stopPropagation()}>
            <button 
              className="memo-close" 
              onClick={() => setShowNoticePopup(false)}
              aria-label="Close"
            >
              ×
            </button>
            
            <div className="memo-content">
              {TUTORING_MEMO.notices.length > 0 && (
                <div className="memo-section">
                  <span className="memo-label">notices:</span>
                  <ul className="memo-list">
                    {TUTORING_MEMO.notices.map((notice, i) => (
                      <li key={i}>{notice}</li>
                    ))}
                  </ul>
                </div>
              )}

              {TUTORING_MEMO.hoursChanged.length > 0 && (
                <div className="memo-section">
                  <span className="memo-label">hours changed:</span>
                  <ul className="memo-list">
                    {TUTORING_MEMO.hoursChanged.map((change, i) => (
                      <li key={i}>{change}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="memo-section memo-links">
                <span className="memo-label">links:</span>
                <div className="memo-link-list">
                  <a href={TUTORING_MEMO.links.main} target="_blank" rel="noopener noreferrer">
                    ASU Tutoring →
                  </a>
                  <a href={TUTORING_MEMO.links.upswing} target="_blank" rel="noopener noreferrer">
                    Upswing →
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="page-header-with-square-button">
        <div className="page-header-content">
          <h2 className="section-panel-header">Academic Support Center</h2>
          <p className="section-subtitle">
            Free tutoring services for ASU students
          </p>
        </div>
      </div>

      <div className="facility-section">
        {/* Subject Tabs */}
        <div className="facility-tabs tutoring-tabs">
          {subjects.map((subject) => (
            <button
              key={subject}
              className={`facility-tab ${activeSubject === subject ? 'active' : ''}`}
              onClick={() => {
                setActiveSubject(subject);
                // Only expand if there's exactly one course in the subject
                const subjectCourses = tutoringData?.subjects[subject]?.courses;
                if (subjectCourses && Object.keys(subjectCourses).length === 1) {
                  const firstCourseName = Object.keys(subjectCourses)[0];
                  setExpandedCourses({ [firstCourseName]: true });
                } else {
                  setExpandedCourses({});
                }
              }}
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
            onChange={(e) => {
              const subject = e.target.value;
              setActiveSubject(subject);
              // Only expand if there's exactly one course in the subject
              const subjectCourses = tutoringData?.subjects[subject]?.courses;
              if (subjectCourses && Object.keys(subjectCourses).length === 1) {
                const firstCourseName = Object.keys(subjectCourses)[0];
                setExpandedCourses({ [firstCourseName]: true });
              } else {
                setExpandedCourses({});
              }
            }}
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
                          <span className="tutoring-course-name">
                            {(() => {
                              const formatted = formatCourseName(courseName);
                              if (Array.isArray(formatted)) {
                                return formatted.map((course, i) => (
                                  <span key={i} className="tutoring-course-item">{course}</span>
                                ));
                              }
                              return formatted;
                            })()}
                          </span>
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
                                <span>Time & Location</span>
                              </div>
                              {groupSessionsByDay(sessions).map((dayGroup, index) => {
                                // Check if any session in this day group is online
                                const isOnlineSession = (session) => {
                                  const loc = (session.location || '').toLowerCase();
                                  return loc.includes('upswing') || loc.includes('online');
                                };
                                
                                return (
                                  <div 
                                    key={index} 
                                    className="tutoring-session-row"
                                  >
                                    <span className="tutoring-session-day">
                                      {getDayAbbreviation(dayGroup.day)}
                                    </span>
                                    <div className="tutoring-session-details">
                                      {dayGroup.sessions.map((session, sessionIndex) => (
                                        <div 
                                          key={sessionIndex} 
                                          className={`tutoring-session-entry ${isOnlineSession(session) ? 'online' : ''} ${hasMultipleTimeRanges(session.time) ? 'multi-time' : ''}`}
                                        >
                                          <div className="tutoring-session-time">
                                            {hasMultipleTimeRanges(session.time) ? (
                                              splitTimeRanges(session.time).map((timeRange, i) => (
                                                <span key={i} className="tutoring-time-range">
                                                  {timeRange}
                                                </span>
                                              ))
                                            ) : (
                                              formatTime(session.time)
                                            )}
                                          </div>
                                          <span className="tutoring-session-location">
                                            {session.location || 'TBA'}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })}
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
        Hours may vary during holidays and special events.
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
