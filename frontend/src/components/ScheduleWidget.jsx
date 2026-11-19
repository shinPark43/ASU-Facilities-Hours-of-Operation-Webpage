import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HiOutlineTrash,
  HiOutlinePencil,
  HiChevronUp,
  HiChevronDown,
  HiOutlineDownload,
  HiOutlineAcademicCap,
  HiOutlineCalendar,
} from 'react-icons/hi';
import {
  loadScheduleCourses,
  saveScheduleCourses,
  matchScheduleToTutoring,
} from '../utils/scheduleUtils.js';
import {
  downloadScheduleIcs,
  buildCourseGoogleCalendarUrl,
} from '../utils/calendarExport.js';
import '../styles/ScheduleWidget.css';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const DAY_TO_COL = { Monday: 2, Tuesday: 3, Wednesday: 4, Thursday: 5, Friday: 6 };
const DAY_SHORT = { Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri' };
const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#f59e0b', '#22c55e', '#14b8a6'];
const MINUTE_STEP = 5;

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 / MINUTE_STEP }, (_, i) => i * MINUTE_STEP);

const TimeSelector = ({ value, onChange }) => {
  const [h, m] = value.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  const [dropdown, setDropdown] = useState(null); // 'hour' | 'minute' | null

  const update = (newH12, newM, newPeriod) => {
    let h24 = newH12 % 12;
    if (newPeriod === 'PM') h24 += 12;
    onChange(`${String(h24).padStart(2, '0')}:${String(newM).padStart(2, '0')}`);
  };

  const stepHour = (dir) => {
    const next = ((hour12 - 1 + dir + 12) % 12) + 1;
    update(next, m, period);
  };

  const stepMinute = (dir) => {
    const total = 60 / MINUTE_STEP;
    const idx = Math.round(m / MINUTE_STEP);
    const next = ((idx + dir + total) % total) * MINUTE_STEP;
    update(hour12, next, period);
  };

  return (
    <div className="schedule-time-selector">
      {dropdown && <div className="schedule-spinner-backdrop" onClick={() => setDropdown(null)} />}

      <div className="schedule-time-spinner">
        <button type="button" className="schedule-spinner-btn" onClick={() => stepHour(1)} aria-label="Increase hour">
          <HiChevronUp size={18} aria-hidden="true" />
        </button>
        <div className="schedule-spinner-val-wrap">
          <button
            type="button"
            className="schedule-spinner-val"
            onClick={() => setDropdown((d) => (d === 'hour' ? null : 'hour'))}
            aria-label={`Hour ${hour12}`}
          >
            {hour12}
          </button>
          {dropdown === 'hour' && (
            <div className="schedule-spinner-dropdown">
              {HOURS.map((hr) => (
                <button
                  key={hr}
                  type="button"
                  className={`schedule-spinner-option${hr === hour12 ? ' active' : ''}`}
                  onClick={() => {
                    update(hr, m, period);
                    setDropdown(null);
                  }}
                >
                  {hr}
                </button>
              ))}
            </div>
          )}
        </div>
        <button type="button" className="schedule-spinner-btn" onClick={() => stepHour(-1)} aria-label="Decrease hour">
          <HiChevronDown size={18} aria-hidden="true" />
        </button>
      </div>

      <span className="schedule-time-colon">:</span>

      <div className="schedule-time-spinner">
        <button type="button" className="schedule-spinner-btn" onClick={() => stepMinute(1)} aria-label="Increase minute">
          <HiChevronUp size={18} aria-hidden="true" />
        </button>
        <div className="schedule-spinner-val-wrap">
          <button
            type="button"
            className="schedule-spinner-val"
            onClick={() => setDropdown((d) => (d === 'minute' ? null : 'minute'))}
            aria-label={`Minute ${String(m).padStart(2, '0')}`}
          >
            {String(m).padStart(2, '0')}
          </button>
          {dropdown === 'minute' && (
            <div className="schedule-spinner-dropdown">
              {MINUTES.map((min) => (
                <button
                  key={min}
                  type="button"
                  className={`schedule-spinner-option${min === m ? ' active' : ''}`}
                  onClick={() => {
                    update(hour12, min, period);
                    setDropdown(null);
                  }}
                >
                  {String(min).padStart(2, '0')}
                </button>
              ))}
            </div>
          )}
        </div>
        <button type="button" className="schedule-spinner-btn" onClick={() => stepMinute(-1)} aria-label="Decrease minute">
          <HiChevronDown size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="schedule-period-toggle">
        <button type="button" className={`schedule-period-btn${period === 'AM' ? ' active' : ''}`} onClick={() => update(hour12, m, 'AM')}>
          AM
        </button>
        <span className="schedule-period-sep">/</span>
        <button type="button" className={`schedule-period-btn${period === 'PM' ? ' active' : ''}`} onClick={() => update(hour12, m, 'PM')}>
          PM
        </button>
      </div>
    </div>
  );
};

// 26 half-hour slots: 8:00am – 8:30pm (ends at 9:00pm)
const TIME_SLOTS = Array.from({ length: 26 }, (_, i) => {
  const totalMins = 8 * 60 + i * 30;
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  const label = m === 0 ? `${h > 12 ? h - 12 : h}${h < 12 ? 'am' : 'pm'}` : '';
  return { h, m, label };
});

const rowIndexForTime = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return Math.round((hours - 8) * 2 + minutes / 30) + 2;
};

const formatTime = (timeStr) => {
  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hours = h % 12 || 12;
  return `${hours}:${m.toString().padStart(2, '0')} ${period}`;
};

const emptyForm = () => ({
  name: '',
  days: [],
  startTime: '09:00',
  endTime: '09:50',
  location: '',
  professor: '',
  color: COLORS[0],
});

const ScheduleWidget = ({ onClose, tutoringData = null }) => {
  const [courses, setCourses] = useState(loadScheduleCourses);
  const [view, setView] = useState('grid');
  const [editingCourse, setEditingCourse] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [detailCourse, setDetailCourse] = useState(null);
  const [exportFeedback, setExportFeedback] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    navigator.storage?.persist?.();
  }, []);

  useEffect(() => {
    saveScheduleCourses(courses);
  }, [courses]);

  // Dismiss modal/popup with Escape key
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key !== 'Escape') return;
      if (detailCourse) {
        setDetailCourse(null);
      } else if (view === 'form') {
        setView('grid');
      } else {
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [detailCourse, view, onClose]);

  const tutoringMatchesByCourseId = useMemo(() => {
    if (!tutoringData) return {};
    const matched = matchScheduleToTutoring(courses, tutoringData);
    const map = {};
    for (const entry of matched) {
      map[entry.scheduleCourse.id] = entry.matches;
    }
    return map;
  }, [courses, tutoringData]);

  const openAddForm = () => {
    setEditingCourse(null);
    setForm(emptyForm());
    setView('form');
  };

  const openEditForm = (course) => {
    setEditingCourse(course);
    setForm({ ...course });
    setView('form');
  };

  const handleSave = () => {
    if (!form.name.trim() || form.days.length === 0) return;
    const id =
      editingCourse?.id ||
      (typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `course-${Date.now()}`);

    if (editingCourse) {
      setCourses((prev) => prev.map((c) => (c.id === editingCourse.id ? { ...form, id } : c)));
    } else {
      setCourses((prev) => [...prev, { ...form, id }]);
    }
    setView('grid');
  };

  const handleDelete = (courseToDelete) => {
    setCourses((prev) => prev.filter((c) => c.id !== courseToDelete.id));
    setView('grid');
    setDetailCourse(null);
  };

  const toggleDay = (day) => {
    setForm((f) => ({
      ...f,
      days: f.days.includes(day) ? f.days.filter((d) => d !== day) : [...f.days, day],
    }));
  };

  const handleExportAllIcs = () => {
    if (courses.length === 0) return;
    downloadScheduleIcs(courses, 'asu-class-schedule.ics');
    setExportFeedback(true);
    setTimeout(() => setExportFeedback(false), 2500);
  };

  const handleGoToTutoring = (match) => {
    onClose();
    navigate(
      `/tutoring?subject=${encodeURIComponent(match.subjectName)}&course=${encodeURIComponent(match.courseName)}`
    );
  };

  const detailMatches = detailCourse ? tutoringMatchesByCourseId[detailCourse.id] || [] : [];

  return (
    <div className="schedule-overlay" onClick={onClose}>
      <div
        className="schedule-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="schedule-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="schedule-modal-header">
          <h2 id="schedule-modal-title" className="schedule-modal-title">My Schedule</h2>
          <div className="schedule-header-actions">
            {view === 'grid' && courses.length > 0 && (
              <button
                type="button"
                className="schedule-export-btn"
                onClick={handleExportAllIcs}
                title="Export full class schedule (.ics) for Apple, Google, or Outlook Calendar"
              >
                <HiOutlineDownload size={14} aria-hidden="true" />
                <span>{exportFeedback ? 'Exported!' : 'Export .ics'}</span>
              </button>
            )}
            {view === 'grid' && (
              <button type="button" className="schedule-add-btn" onClick={openAddForm}>
                + Add
              </button>
            )}
            {view === 'form' && editingCourse && (
              <button
                type="button"
                className="schedule-delete-icon-btn"
                onClick={() => handleDelete(editingCourse)}
                aria-label="Delete course"
              >
                <HiOutlineTrash size={18} aria-hidden="true" />
              </button>
            )}
            <button
              type="button"
              className="schedule-close-btn"
              onClick={view === 'form' ? () => setView('grid') : onClose}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {view === 'grid' && (
          <div className="schedule-grid-wrapper">
            <div className="schedule-grid">
              {/* Header row */}
              <div className="schedule-corner" style={{ gridColumn: 1, gridRow: 1 }} />
              {DAYS.map((day, i) => (
                <div key={day} className="schedule-day-header" style={{ gridColumn: i + 2, gridRow: 1 }}>
                  {DAY_SHORT[day]}
                </div>
              ))}

              {/* Time slots */}
              {TIME_SLOTS.map((slot, i) => {
                const rowIndex = i + 2;
                return (
                  <React.Fragment key={i}>
                    <div className="schedule-time-label" style={{ gridColumn: 1, gridRow: rowIndex }}>
                      {slot.label}
                    </div>
                    {DAYS.map((day, di) => (
                      <div
                        key={day}
                        className={`schedule-slot${slot.m === 0 ? ' hour-start' : ''}`}
                        style={{ gridColumn: di + 2, gridRow: rowIndex }}
                      />
                    ))}
                  </React.Fragment>
                );
              })}

              {/* Course blocks */}
              {courses.map((course) =>
                course.days.map((day) => {
                  const col = DAY_TO_COL[day];
                  if (!col) return null;
                  const startRow = rowIndexForTime(course.startTime);
                  const endRow = rowIndexForTime(course.endTime);
                  const hasTutoring = (tutoringMatchesByCourseId[course.id] || []).length > 0;
                  return (
                    <button
                      type="button"
                      key={`${course.id}-${day}`}
                      className="schedule-course-block"
                      style={{
                        gridColumn: col,
                        gridRowStart: startRow,
                        gridRowEnd: endRow,
                        background: course.color,
                      }}
                      onClick={() => setDetailCourse(course)}
                    >
                      <span className="schedule-block-name">{course.name}</span>
                      {course.location && (
                        <span className="schedule-block-loc">{course.location}</span>
                      )}
                      {hasTutoring && (
                        <span className="schedule-block-tutoring-tag" title="Free tutoring available">
                          Tutoring
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        {view === 'form' && (
          <div className="schedule-form-panel">
            <h3 className="schedule-form-title">
              {editingCourse ? 'Edit Course' : 'Add Course'}
            </h3>

            <label className="schedule-form-label" htmlFor="schedule-course-name">
              Course Name <span className="schedule-required">*</span>
            </label>
            <input
              id="schedule-course-name"
              className="schedule-form-input"
              type="text"
              placeholder="e.g. MATH 1314 or CS 1336"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />

            <span className="schedule-form-label">
              Days <span className="schedule-required">*</span>
            </span>
            <div className="schedule-day-checkboxes">
              {DAYS.map((day) => (
                <label key={day} className={`schedule-day-chip${form.days.includes(day) ? ' selected' : ''}`}>
                  <input type="checkbox" checked={form.days.includes(day)} onChange={() => toggleDay(day)} />
                  {DAY_SHORT[day]}
                </label>
              ))}
            </div>

            <span className="schedule-form-label">Time</span>
            <div className="schedule-time-range">
              <TimeSelector
                value={form.startTime}
                onChange={(v) =>
                  setForm((f) => {
                    const toMins = (t) => {
                      const [h, m] = t.split(':').map(Number);
                      return h * 60 + m;
                    };
                    const toTime = (mins) => {
                      const h = Math.floor(mins / 60);
                      const m = mins % 60;
                      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                    };
                    const duration = Math.max(toMins(f.endTime) - toMins(f.startTime), 0);
                    const newEndMins = Math.min(toMins(v) + duration, 21 * 60);
                    return { ...f, startTime: v, endTime: toTime(newEndMins) };
                  })
                }
              />
              <span className="schedule-time-range-sep">–</span>
              <TimeSelector
                value={form.endTime}
                onChange={(v) => setForm((f) => ({ ...f, endTime: v }))}
              />
            </div>

            <label className="schedule-form-label" htmlFor="schedule-course-location">
              Location (optional)
            </label>
            <input
              id="schedule-course-location"
              className="schedule-form-input"
              type="text"
              placeholder="e.g. MCS 216"
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            />

            <label className="schedule-form-label" htmlFor="schedule-course-prof">
              Professor (optional)
            </label>
            <input
              id="schedule-course-prof"
              className="schedule-form-input"
              type="text"
              placeholder="e.g. Dr. Smith"
              value={form.professor}
              onChange={(e) => setForm((f) => ({ ...f, professor: e.target.value }))}
            />

            <span className="schedule-form-label">Color</span>
            <div className="schedule-color-swatches">
              {COLORS.map((color) => (
                <button
                  type="button"
                  key={color}
                  className={`schedule-color-swatch${form.color === color ? ' selected' : ''}`}
                  style={{ background: color }}
                  onClick={() => setForm((f) => ({ ...f, color }))}
                  aria-label={`Color ${color}`}
                />
              ))}
            </div>

            <div className="schedule-form-actions">
              <button type="button" className="schedule-btn-cancel" onClick={() => setView('grid')}>
                Cancel
              </button>
              <button
                type="button"
                className="schedule-btn-save"
                onClick={handleSave}
                disabled={!form.name.trim() || form.days.length === 0}
              >
                Save
              </button>
            </div>
          </div>
        )}

        {detailCourse && (
          <>
            <div className="schedule-detail-backdrop" onClick={() => setDetailCourse(null)} />
            <div className="schedule-detail-popup" role="dialog" aria-label={detailCourse.name}>
              <div className="schedule-detail-popup-header">
                <div className="schedule-detail-color-dot" style={{ background: detailCourse.color }} />
                <span className="schedule-detail-popup-name">{detailCourse.name}</span>
                <div className="schedule-detail-popup-btns">
                  <button
                    type="button"
                    className="schedule-edit-icon-btn"
                    onClick={() => {
                      openEditForm(detailCourse);
                      setDetailCourse(null);
                    }}
                    aria-label="Edit course"
                  >
                    <HiOutlinePencil size={16} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="schedule-delete-icon-btn"
                    onClick={() => handleDelete(detailCourse)}
                    aria-label="Delete course"
                  >
                    <HiOutlineTrash size={16} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="schedule-close-btn"
                    onClick={() => setDetailCourse(null)}
                    aria-label="Close"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="schedule-detail-rows">
                <div className="schedule-detail-row">
                  <span className="schedule-detail-label">Days</span>
                  <div className="schedule-detail-days">
                    {detailCourse.days.map((d) => (
                      <span key={d} className="schedule-detail-day-chip">
                        {DAY_SHORT[d]}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="schedule-detail-row">
                  <span className="schedule-detail-label">Time</span>
                  <span className="schedule-detail-value">
                    {formatTime(detailCourse.startTime)} – {formatTime(detailCourse.endTime)}
                  </span>
                </div>
                {detailCourse.location && (
                  <div className="schedule-detail-row">
                    <span className="schedule-detail-label">Location</span>
                    <span className="schedule-detail-value">{detailCourse.location}</span>
                  </div>
                )}
                {detailCourse.professor && (
                  <div className="schedule-detail-row">
                    <span className="schedule-detail-label">Professor</span>
                    <span className="schedule-detail-value">{detailCourse.professor}</span>
                  </div>
                )}

                {/* Calendar export actions for this course */}
                <div className="schedule-detail-actions">
                  <a
                    href={buildCourseGoogleCalendarUrl(detailCourse)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="schedule-detail-action-btn"
                  >
                    <HiOutlineCalendar size={14} aria-hidden="true" />
                    Google Cal
                  </a>
                  <button
                    type="button"
                    className="schedule-detail-action-btn"
                    onClick={() =>
                      downloadScheduleIcs(
                        [detailCourse],
                        `${detailCourse.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.ics`
                      )
                    }
                  >
                    <HiOutlineDownload size={14} aria-hidden="true" />
                    Apple / .ics
                  </button>
                </div>

                {/* Auto-matched ASU Tutoring sessions */}
                {detailMatches.length > 0 && (
                  <div className="schedule-detail-tutoring">
                    <span className="schedule-detail-tutoring-label">
                      <HiOutlineAcademicCap size={14} aria-hidden="true" />
                      Free Tutoring Available
                    </span>
                    {detailMatches.slice(0, 2).map((match) => (
                      <button
                        type="button"
                        key={`${match.subjectName}-${match.courseName}`}
                        className="schedule-detail-tutoring-btn"
                        onClick={() => handleGoToTutoring(match)}
                      >
                        <span>{match.subjectName}: {match.courseName}</span>
                        <span>→</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ScheduleWidget;
