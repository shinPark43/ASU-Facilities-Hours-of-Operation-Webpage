import React, { useState, useEffect } from 'react';
import { HiOutlineExclamation, HiOutlineRefresh, HiOutlineWifi, HiOutlineX } from 'react-icons/hi';
import { getRelativeUpdateTime } from '../utils/timeUtils.js';
import '../styles/StatusBanners.css';

/**
 * Non-blocking status banner shown when live API data is unreachable (showing cached or sample hours)
 * or when the user is offline in PWA mode.
 */
const StaleDataBanner = ({ isFallback = false, source = 'live', cachedAt = null, onRetry = null }) => {
  const [dismissed, setDismissed] = useState(false);
  const [isOffline, setIsOffline] = useState(() =>
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );

  useEffect(() => {
    const goOnline = () => setIsOffline(false);
    const goOffline = () => {
      setIsOffline(true);
      setDismissed(false);
    };
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Re-show if fallback state flips back on
  useEffect(() => {
    if (isFallback) setDismissed(false);
  }, [isFallback, source, cachedAt]);

  if (dismissed || (!isFallback && !isOffline)) return null;

  const isMock = source === 'mock';
  const title = isOffline
    ? 'Offline mode'
    : isMock
      ? 'Live hours unavailable'
      : 'Showing cached hours';

  const description = isOffline
    ? 'You appear to be offline. Showing saved campus hours until your connection returns.'
    : isMock
      ? 'Could not reach the ASU Hours server — showing sample hours that may be outdated.'
      : `Live server unreachable — showing saved hours from ${getRelativeUpdateTime(cachedAt)}.`;

  return (
    <div
      className={`status-banner ${isMock ? 'status-banner--warning' : 'status-banner--info'}`}
      role="status"
      aria-live="polite"
    >
      <div className="status-banner-icon" aria-hidden="true">
        {isOffline ? <HiOutlineWifi size={18} /> : <HiOutlineExclamation size={18} />}
      </div>
      <div className="status-banner-body">
        <strong className="status-banner-title">{title}</strong>
        <span className="status-banner-desc">{description}</span>
      </div>
      <div className="status-banner-actions">
        {onRetry && (
          <button type="button" className="status-banner-retry" onClick={onRetry}>
            <HiOutlineRefresh size={14} aria-hidden="true" />
            Retry
          </button>
        )}
        <button
          type="button"
          className="status-banner-dismiss"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss notice"
        >
          <HiOutlineX size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};

export default StaleDataBanner;
