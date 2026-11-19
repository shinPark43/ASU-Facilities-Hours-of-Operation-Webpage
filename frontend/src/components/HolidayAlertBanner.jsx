import React, { useState, useMemo } from 'react';
import { HiOutlineCalendar, HiOutlineX } from 'react-icons/hi';
import '../styles/StatusBanners.css';

const ALERT_DISMISS_PREFIX = 'asu-alert-dismissed:';
const ALERT_WINDOW_DAYS = 14;

/**
 * Automatically surfaces Finals & Holiday/Break hour alerts derived from the live academic calendar.
 */
const HolidayAlertBanner = ({ calendarEvents = [] }) => {
  const activeAlert = useMemo(() => {
    if (!Array.isArray(calendarEvents)) return null;

    for (const ev of calendarEvents) {
      if (!ev || !ev.title || ev.title === 'Loading…') continue;
      const badge = (ev.badge || '').toUpperCase();
      const titleLower = ev.title.toLowerCase();
      const isBreakOrFinals =
        badge === 'BREAK' ||
        badge === 'EXAM' ||
        /final|break|holiday|thanksgiving|spring break|winter|closed|commencement/i.test(titleLower);

      if (!isBreakOrFinals) continue;

      // Show if event is active now or within the next 14 days (or if backend didn't attach daysUntil yet)
      const withinWindow =
        ev.isActive === true ||
        typeof ev.daysUntil !== 'number' ||
        (ev.daysUntil >= 0 && ev.daysUntil <= ALERT_WINDOW_DAYS);

      if (withinWindow) {
        return {
          key: `${ev.title}:${ev.date || ev.subtitle || ''}`,
          isFinals: badge === 'EXAM' || /final|exam/i.test(titleLower),
          title: ev.title,
          date: ev.date || ev.subtitle || '',
          isActive: Boolean(ev.isActive),
          daysUntil: typeof ev.daysUntil === 'number' ? ev.daysUntil : null,
        };
      }
    }
    return null;
  }, [calendarEvents]);

  const [dismissedKey, setDismissedKey] = useState(() => {
    try {
      return sessionStorage.getItem(ALERT_DISMISS_PREFIX) || null;
    } catch {
      return null;
    }
  });

  if (!activeAlert || dismissedKey === activeAlert.key) return null;

  const handleDismiss = () => {
    setDismissedKey(activeAlert.key);
    try {
      sessionStorage.setItem(ALERT_DISMISS_PREFIX, activeAlert.key);
    } catch {
      // ignore
    }
  };

  const timingLabel = activeAlert.isActive
    ? 'Happening now'
    : activeAlert.daysUntil === 0
      ? 'Today'
      : activeAlert.daysUntil === 1
        ? 'Tomorrow'
        : activeAlert.daysUntil > 1
          ? `In ${activeAlert.daysUntil} days`
          : activeAlert.date;

  return (
    <div
      className={`status-banner ${activeAlert.isFinals ? 'status-banner--finals' : 'status-banner--holiday'}`}
      role="status"
      aria-live="polite"
    >
      <div className="status-banner-icon" aria-hidden="true">
        <HiOutlineCalendar size={18} />
      </div>
      <div className="status-banner-body">
        <strong className="status-banner-title">
          {activeAlert.isFinals ? 'Finals Hours Alert' : 'Holiday / Break Hours Alert'} · {timingLabel}
        </strong>
        <span className="status-banner-desc">
          {activeAlert.title} ({activeAlert.date}) — Library, Gym, Dining &amp; Campus Services may run modified hours.
        </span>
      </div>
      <div className="status-banner-actions">
        <button
          type="button"
          className="status-banner-dismiss"
          onClick={handleDismiss}
          aria-label="Dismiss schedule alert"
        >
          <HiOutlineX size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};

export default HolidayAlertBanner;
