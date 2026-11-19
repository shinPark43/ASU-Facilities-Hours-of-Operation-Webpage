import React from 'react';
import '../styles/StatusBanners.css';

/**
 * Reusable live Open / Closing Soon / Reopens / Closed badge for facility detail pages.
 */
const LiveStatusBadge = ({ status }) => {
  if (!status) return null;

  const variantClass =
    status.state === 'closing-soon'
      ? 'live-badge--closing'
      : status.isOpen
        ? 'live-badge--open'
        : status.state === 'reopens-later' || status.state === 'opens-later'
          ? 'live-badge--reopens'
          : 'live-badge--closed';

  return (
    <span className={`live-badge ${variantClass}`}>
      {status.isOpen && <span className="live-badge-dot" aria-hidden="true" />}
      <span>{status.detail || status.label}</span>
    </span>
  );
};

export default LiveStatusBadge;
