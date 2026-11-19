import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { tutoringAPI } from '../services/api.js';
import { AnnouncementBanner } from '../components/AnnouncementBanner.jsx';
import StaleDataBanner from '../components/StaleDataBanner';
import { loadScheduleCourses, matchScheduleToTutoring } from '../utils/scheduleUtils.js';
import { TbCalendarEvent } from 'react-icons/tb';

// Controlled via Vite env var so semester transitions don't require code edits
const COMING_SOON =
  String(import.meta.env.VITE_TUTORING_COMING_SOON || import.meta.env.REACT_APP_TUTORING_COMING_SOON || 'false') ===
  'true';

const TUTORING_MEMO = {
  notices: [
    'Free tutoring available to all ASU students',
    'No appointment necessary for in-person sessions',
    'Upswing: 2 hrs/week free online tutoring',
    'ASU tutors are at the top of Upswing list — they do NOT count against your 2 hours',
  ],
  hoursChanged: [],
  links: {
    main: 'https://www.angelo.edu/current-students/freshman-college/academic-tutoring.php',
    upswing: 'https://angelostate.upswing.io/',
  },
};

const Tutoring = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tutoringData, setTutoringData] = useState(null);
  const [activeSubject, setActiveSubject] = useState(null);
  const [searchParams] = useSearchParams();
  const [expandedCourses, setExpandedCourses] = useState({});
  const [showNoticePopup, setShowNoticePopup] = useState(false);
  const [scheduleCourses, setScheduleCourses] = useState(loadScheduleCourses);

  // Sync if My Schedule changes in another component or tab
  useEffect(() => {
    const syncSchedule = () => setScheduleCourses(loadScheduleCourses());
    window.addEventListener('asu-schedule-updated', syncSchedule);
    window.addEventListener('storage', syncSchedule);
    return () => {
      window.removeEventListener('asu-schedule-updated', syncSchedule);
      window.removeEventListener('storage', syncSchedule);
    };
  }, []);

  const fetchTutoringData = useCallback(async () => {
    if (COMING_SOON) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await tutoringAPI.getAllTutoringData();
      if (data && data.subjects && Object.keys(data.subjects).length > 0) {
        setTutoringData(data);

        const subjects = Object.keys(data.subjects);
        const defaultSubject =
          subjects.find((s) => s.toLowerCase().includes('computer science')) || subjects[0];
        setActiveSubject((prev) => (prev && data.subjects[prev] ? prev : defaultSubject));

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
  }, []);

  useEffect(() => {
    fetchTutoringData();
  }, [fetchTutoringData]);

  // Handle ?subject=... and optional ?course=... query params (from Search or My Schedule)
  useEffect(() => {
    const subjectParam = searchParams.get('subject');
    const courseParam = searchParams.get('course');
    if (!subjectParam || !tutoringData?.subjects?.[subjectParam]) return;

    setActiveSubject(subjectParam);
    const subjectCourses = tutoringData.subjects[subjectParam]?.courses || {};
    if (courseParam && subjectCourses[courseParam]) {
      setExpandedCourses({ [courseParam]: true });
    } else if (Object.keys(subjectCourses).length === 1) {
      const firstCourseName = Object.keys(subjectCourses)[0];
      setExpandedCourses({ [firstCourseName]: true });
    } else {
      setExpandedCourses({});
    }
  }, [searchParams, tutoringData]);

  // Auto-match student's saved My Schedule classes to ASU tutoring sessions
  const matchedScheduleTutoring = useMemo(
    () => matchScheduleToTutoring(scheduleCourses, tutoringData),
    [scheduleCourses, tutoringData]
  );

  const handleJumpToMatch = (subjectName, courseName) => {
    setActiveSubject(subjectName);
    setExpandedCourses({ [courseName]: true });
  };

  const toggleCourse = (courseName) => {
    setExpandedCourses((prev) => ({
      ...prev,
      [courseName]: !prev[courseName],
    }));
  };

  const getDayAbbreviation = (day) => {
    const abbreviations = {
      Sunday: 'Sun',
      Monday: 'Mon',
      Tuesday: 'Tue',
      Wednesday: 'Wed',
      Thursday: 'Thu',
      Friday: 'Fri',
      Saturday: 'Sat',
    };
    return abbreviations[day] || day;
  };

  const formatTime = (time) => {
    if (!time || time === 'TBA') return 'TBA';
    return time;
  };

  const hasMultipleTimeRanges = (time) => {
    if (!time || time === 'TBA') return false;
    return time.includes(',');
  };

  const splitTimeRanges = (time) => {
    if (!time || time === 'TBA') return ['TBA'];
    return time.split(',').map((t) => t.trim());
  };

  const formatCourseName = (name) => {
    if (!name) return '';
    const splitPattern = /(?<=[a-z0-9\-)IVX])(?=[A-Z]{3,4}\s\d{4})/g;
    const courses = name
      .split(splitPattern)
      .map((c) => c.trim())
      .filter(Boolean);

    if (courses.length <= 1) return name;
    return courses;
  };

  const parseTimeToMinutes = (timeStr) => {
    if (!timeStr || timeStr === 'TBA') return 9999;

    const lowerStr = timeStr.toLowerCase();
    if (lowerStr.includes('noon')) return 12 * 60;
    if (lowerStr.includes('midnight')) return 0;

    const startTime = timeStr.split('-')[0].split(',')[0].trim();
    const isPM = lowerStr.includes('p.m') || lowerStr.includes('pm');
    const isAM = lowerStr.includes('a.m') || lowerStr.includes('am');

    const timeMatch = startTime.match(/(\d{1,2})(?::(\d{2}))?/);
    if (!timeMatch) return 9999;

    let hours = parseInt(timeMatch[1], 10);
    const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;

    if (isPM && hours < 12) hours += 12;
    else if (isAM && hours === 12) hours = 0;

    return hours * 60 + minutes;
  };

  const groupSessionsByDay = (sessions) => {
    const dayOrder = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const grouped = {};

    sessions.forEach((session) => {
      const day = session.day;
      if (!grouped[day]) grouped[day] = [];
      grouped[day].push(session);
    });

    const sortedDays = Object.keys(grouped).sort((a, b) => {
      const aIndex = dayOrder.indexOf(a);
      const bIndex = dayOrder.indexOf(b);
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;
      return aIndex - bIndex;
    });

    return sortedDays.map((day) => ({
      day,
      sessions: grouped[day].sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time)),
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
    return <div className="error">{error}</div>;
  }

  if (COMING_SOON) {
    return (
      <div>
        <AnnouncementBanner
          items={[
            '<strong>Free Tutoring</strong> - Available to all ASU students, no appointment necessary',
            '<strong>Upswing</strong> - 2 hours/week of free online tutoring available',
            '<strong>Click for more info</strong>',
          ]}
          speedSec={280}
          onClick={() => setShowNoticePopup(true)}
        />

        <div className="page-header-with-square-button">
          <div className="page-header-content">
            <h2 className="section-panel-header">Academic Support Center</h2>
            <p className="section-subtitle">Free tutoring services for ASU students</p>
          </div>
        </div>

        <div className="facility-section">
          <div
            style={{
              textAlign: 'center',
              padding: '3rem 1rem',
              minHeight: '35vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <TbCalendarEvent size={48} style={{ color: 'var(--primary-color)', marginBottom: '0.75rem' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: '600', marginBottom: '0.5rem' }}>
              Tutor Center Schedule Coming Soon!
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
              Check back once the semester schedule is posted.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <a
            href="https://www.angelo.edu/current-students/freshman-college/academic-tutoring.php"
            target="_blank"
            rel="noopener noreferrer"
            className="website-link"
          >
            View on ASU Website
          </a>
        </div>
      </div>
    );
  }

  const subjects = tutoringData?.subjects ? Object.keys(tutoringData.subjects) : [];

  return (
    <div>
      <StaleDataBanner
        isFallback={Boolean(tutoringData?._isFallback)}
        source={tutoringData?._source}
        cachedAt={tutoringData?._cachedAt}
        onRetry={fetchTutoringData}
      />

      <AnnouncementBanner
        items={[
          '<strong>Free Tutoring</strong> - Available to all ASU students, no appointment necessary',
          '<strong>Upswing</strong> - 2 hours/week of free online tutoring available',
          '<strong>Click for more info</strong>',
        ]}
        speedSec={280}
        onClick={() => setShowNoticePopup(true)}
      />

      {showNoticePopup && (
        <div className="memo-overlay" onClick={() => setShowNoticePopup(false)}>
          <div className="memo-popup" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
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
          <p className="section-subtitle">Free tutoring services for ASU students</p>
        </div>
      </div>

      {/* Auto-matched Tutoring for Student's Saved My Schedule Classes */}
      {matchedScheduleTutoring.length > 0 && (
        <section className="matched-tutoring-section" aria-label="Tutoring matched to your schedule">
          <div className="matched-tutoring-header">
            <h3 className="matched-tutoring-title">Tutoring For Your Classes</h3>
            <span className="matched-tutoring-count">
              {matchedScheduleTutoring.length}{' '}
              {matchedScheduleTutoring.length === 1 ? 'class matched' : 'classes matched'}
            </span>
          </div>
          <div className="matched-tutoring-grid">
            {matchedScheduleTutoring.map(({ scheduleCourse, matches }) => {
              const primary = matches[0];
              const sessionCount = primary.course?.sessions?.length || 0;
              return (
                <button
                  type="button"
                  key={scheduleCourse.id}
                  className="matched-tutoring-card"
                  onClick={() => handleJumpToMatch(primary.subjectName, primary.courseName)}
                >
                  <div className="matched-tutoring-info">
                    <span className="matched-tutoring-course">
                      <span
                        className="matched-course-pill"
                        style={{ background: scheduleCourse.color || '#3b82f6' }}
                        aria-hidden="true"
                      />
                      {scheduleCourse.name}
                    </span>
                    <span className="matched-tutoring-meta">
                      {primary.subjectName} · {primary.courseName}
                      {sessionCount > 0 ? ` (${sessionCount} sessions)` : ''}
                    </span>
                  </div>
                  <span className="matched-tutoring-cta">View →</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      <div className="facility-section">
        <div className="facility-tabs tutoring-tabs">
          {subjects.map((subject) => (
            <button
              type="button"
              key={subject}
              className={`facility-tab ${activeSubject === subject ? 'active' : ''}`}
              onClick={() => {
                setActiveSubject(subject);
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

        <div className="facility-dropdown-wrapper">
          <select
            className="facility-dropdown"
            aria-label="Select tutoring subject"
            value={activeSubject || ''}
            onChange={(e) => {
              const subject = e.target.value;
              setActiveSubject(subject);
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
                  const isExpanded = Boolean(expandedCourses[courseName]);
                  const sessions = course.sessions || [];
                  const hasSessions = sessions.length > 0 && !sessions.every((s) => s.is_tba);

                  return (
                    <div key={courseName} className="tutoring-course-card">
                      <button
                        type="button"
                        className={`tutoring-course-header ${isExpanded ? 'expanded' : ''}`}
                        onClick={() => toggleCourse(courseName)}
                        aria-expanded={isExpanded}
                      >
                        <div className="tutoring-course-info">
                          <span className="tutoring-course-name">
                            {(() => {
                              const formatted = formatCourseName(courseName);
                              if (Array.isArray(formatted)) {
                                return formatted.map((c, i) => (
                                  <span key={i} className="tutoring-course-item">
                                    {c}
                                  </span>
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
                                <span>Time &amp; Location</span>
                              </div>
                              {groupSessionsByDay(sessions).map((dayGroup, index) => {
                                const isOnlineSession = (session) => {
                                  const loc = (session.location || '').toLowerCase();
                                  return loc.includes('upswing') || loc.includes('online');
                                };

                                return (
                                  <div key={index} className="tutoring-session-row">
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
                                            {hasMultipleTimeRanges(session.time)
                                              ? splitTimeRanges(session.time).map((timeRange, i) => (
                                                  <span key={i} className="tutoring-time-range">
                                                    {timeRange}
                                                  </span>
                                                ))
                                              : formatTime(session.time)}
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

      <div className="hours-info">Hours may vary during holidays and special events.</div>

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
