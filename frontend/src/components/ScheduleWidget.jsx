import React, { useState, useEffect } from 'react';
import { HiOutlineTrash, HiOutlinePencil, HiChevronUp, HiChevronDown } from 'react-icons/hi';
import '../styles/ScheduleWidget.css';

const STORAGE_KEY = 'asu-schedule-courses';
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
        <button type="button" className="schedule-spinner-btn" onClick={() => stepHour(1)}><HiChevronUp size={13} /></button>
        <div className="schedule-spinner-val-wrap">
          <span className="schedule-spinner-val" onClick={() => setDropdown(d => d === 'hour' ? null : 'hour')}>{hour12}</span>
          {dropdown === 'hour' && (
            <div className="schedule-spinner-dropdown">
              {HOURS.map(hr => (
                <button key={hr} type="button"
                  className={`schedule-spinner-option${hr === hour12 ? ' active' : ''}`}
                  onClick={() => { update(hr, m, period); setDropdown(null); }}
                >{hr}</button>
              ))}
            </div>
          )}
        </div>
        <button type="button" className="schedule-spinner-btn" onClick={() => stepHour(-1)}><HiChevronDown size={13} /></button>
      </div>

      <span className="schedule-time-colon">:</span>

      <div className="schedule-time-spinner">
        <button type="button" className="schedule-spinner-btn" onClick={() => stepMinute(1)}><HiChevronUp size={13} /></button>
        <div className="schedule-spinner-val-wrap">
          <span className="schedule-spinner-val" onClick={() => setDropdown(d => d === 'minute' ? null : 'minute')}>{String(m).padStart(2, '0')}</span>
          {dropdown === 'minute' && (
            <div className="schedule-spinner-dropdown">
              {MINUTES.map(min => (
                <button key={min} type="button"
                  className={`schedule-spinner-option${min === m ? ' active' : ''}`}
                  onClick={() => { update(hour12, min, period); setDropdown(null); }}
                >{String(min).padStart(2, '0')}</button>
              ))}
            </div>
          )}
        </div>
        <button type="button" className="schedule-spinner-btn" onClick={() => stepMinute(-1)}><HiChevronDown size={13} /></button>
      </div>

      <div className="schedule-period-toggle">
        <button type="button" className={`schedule-period-btn${period === 'AM' ? ' active' : ''}`} onClick={() => update(hour12, m, 'AM')}>AM</button>
        <span className="schedule-period-sep">/</span>
        <button type="button" className={`schedule-period-btn${period === 'PM' ? ' active' : ''}`} onClick={() => update(hour12, m, 'PM')}>PM</button>
      </div>
    </div>
  );
};

// 26 half-hour slots: 8:00am – 8:30pm (ends at 9:00pm)
const TIME_SLOTS = Array.from({ length: 26 }, (_, i) => {
  const totalMins = 8 * 60 + i * 30;
  const h = Math.floor(totalMins / 60);
  const m = totalMins % 60;
  const label = m === 0
    ? `${h > 12 ? h - 12 : h}${h < 12 ? 'am' : 'pm'}`
    : '';
  return { h, m, label };
});

const rowIndexForTime = (timeStr) => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return Math.round((hours - 8) * 2 + minutes / 30) + 2;
};

const loadCourses = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
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

const ScheduleWidget = ({ onClose }) => {
  const [courses, setCourses] = useState(loadCourses);
  const [view, setView] = useState('grid');
  const [editingCourse, setEditingCourse] = useState(null);
  const [form, setForm] = useState(emptyForm());
  const [detailCourse, setDetailCourse] = useState(null);

  useEffect(() => {
    navigator.storage?.persist?.();
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(courses));
  }, [courses]);

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
    if (editingCourse) {
      setCourses(prev => prev.map(c => c.id === editingCourse.id ? { ...form, id: editingCourse.id } : c));
    } else {
      setCourses(prev => [...prev, { ...form, id: crypto.randomUUID() }]);
    }
    setView('grid');
  };

  const handleDelete = (courseToDelete) => {
    setCourses(prev => prev.filter(c => c.id !== courseToDelete.id));
    setView('grid');
    setDetailCourse(null);
  };

  const toggleDay = (day) => {
    setForm(f => ({
      ...f,
      days: f.days.includes(day) ? f.days.filter(d => d !== day) : [...f.days, day],
    }));
  };

  return (
    <div className="schedule-overlay" onClick={onClose}>
      <div className="schedule-modal" onClick={e => e.stopPropagation()}>
        <div className="schedule-modal-header">
          <h2 className="schedule-modal-title">My Schedule</h2>
          <div className="schedule-header-actions">
            {view === 'grid' && (
              <button className="schedule-add-btn" onClick={openAddForm}>+ Add</button>
            )}
            {view === 'form' && editingCourse && (
              <button className="schedule-delete-icon-btn" onClick={() => handleDelete(editingCourse)} aria-label="Delete course">
                <HiOutlineTrash size={18} />
              </button>
            )}
            <button className="schedule-close-btn" onClick={view === 'form' ? () => setView('grid') : onClose} aria-label="Close">✕</button>
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
              {courses.map(course =>
                course.days.map(day => {
                  const col = DAY_TO_COL[day];
                  if (!col) return null;
                  const startRow = rowIndexForTime(course.startTime);
                  const endRow = rowIndexForTime(course.endTime);
                  return (
                    <div
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
                    </div>
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

            <label className="schedule-form-label">
              Course Name <span className="schedule-required">*</span>
            </label>
            <input
              className="schedule-form-input"
              type="text"
              placeholder="e.g. MATH 1314"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            />

            <label className="schedule-form-label">
              Days <span className="schedule-required">*</span>
            </label>
            <div className="schedule-day-checkboxes">
              {DAYS.map(day => (
                <label key={day} className={`schedule-day-chip${form.days.includes(day) ? ' selected' : ''}`}>
                  <input type="checkbox" checked={form.days.includes(day)} onChange={() => toggleDay(day)} />
                  {DAY_SHORT[day]}
                </label>
              ))}
            </div>

            <label className="schedule-form-label">Time</label>
            <div className="schedule-time-range">
              <TimeSelector
                value={form.startTime}
                onChange={v => setForm(f => ({ ...f, startTime: v }))}
              />
              <span className="schedule-time-range-sep">–</span>
              <TimeSelector
                value={form.endTime}
                onChange={v => setForm(f => ({ ...f, endTime: v }))}
              />
            </div>

            <label className="schedule-form-label">Location (optional)</label>
            <input
              className="schedule-form-input"
              type="text"
              placeholder="e.g. MCS 216"
              value={form.location}
              onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
            />

            <label className="schedule-form-label">Professor (optional)</label>
            <input
              className="schedule-form-input"
              type="text"
              placeholder="e.g. Dr. Smith"
              value={form.professor}
              onChange={e => setForm(f => ({ ...f, professor: e.target.value }))}
            />

            <label className="schedule-form-label">Color</label>
            <div className="schedule-color-swatches">
              {COLORS.map(color => (
                <button
                  key={color}
                  className={`schedule-color-swatch${form.color === color ? ' selected' : ''}`}
                  style={{ background: color }}
                  onClick={() => setForm(f => ({ ...f, color }))}
                  aria-label={`Color ${color}`}
                />
              ))}
            </div>

            <div className="schedule-form-actions">
              <button className="schedule-btn-cancel" onClick={() => setView('grid')}>Cancel</button>
              <button
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
            <div className="schedule-detail-popup">
              <div className="schedule-detail-popup-header">
                <div className="schedule-detail-color-dot" style={{ background: detailCourse.color }} />
                <span className="schedule-detail-popup-name">{detailCourse.name}</span>
                <div className="schedule-detail-popup-btns">
                  <button
                    className="schedule-edit-icon-btn"
                    onClick={() => { openEditForm(detailCourse); setDetailCourse(null); }}
                    aria-label="Edit course"
                  >
                    <HiOutlinePencil size={16} />
                  </button>
                  <button
                    className="schedule-delete-icon-btn"
                    onClick={() => handleDelete(detailCourse)}
                    aria-label="Delete course"
                  >
                    <HiOutlineTrash size={16} />
                  </button>
                  <button className="schedule-close-btn" onClick={() => setDetailCourse(null)} aria-label="Close">✕</button>
                </div>
              </div>
              <div className="schedule-detail-rows">
                <div className="schedule-detail-row">
                  <span className="schedule-detail-label">Days</span>
                  <div className="schedule-detail-days">
                    {detailCourse.days.map(d => (
                      <span key={d} className="schedule-detail-day-chip">{DAY_SHORT[d]}</span>
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
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ScheduleWidget;
