import React from "react";

/**
 * AnnouncementBanner – a clean pixel-text ticker that scrolls right→left
 *
 * Props:
 *  - items: string[]               // messages to repeat across the belt
 *  - speedSec?: number             // how long one full pass takes (default 14s)
 *  - height?: number               // banner height in px (default 48)
 *  - gapPx?: number                // gap between repeats in px (default 48)
 *
 * Accessibility:
 *  - Animation pauses on hover and for users with reduced motion.
 */
export function AnnouncementBanner({
  items = ["Announcement"],
  speedSec = 140,
  height = 56,
  gapPx = 48,
}) {
  // Duplicate content so it can loop seamlessly
  const repeated = Array.from({ length: 8 }, () => items).flat();

  return (
    <div
      className="announcement-banner"
      role="img"
      aria-label={items.join(" • ")}
      style={{
        "--duration": `${speedSec}s`,
        "--gap": `${gapPx}px`,
        height: `${height}px`,
      }}
    >
      {/* Two groups with identical content create the continuous loop */}
      <div className="belt" aria-hidden="true">
        {repeated.map((msg, i) => (
          <span key={`g1-${i}`} className="item">
            {msg}
          </span>
        ))}
      </div>
      <div className="belt" aria-hidden="true">
        {repeated.map((msg, i) => (
          <span key={`g2-${i}`} className="item">
            {msg}
          </span>
        ))}
      </div>

      <style>{`
        .announcement-banner {
          position: relative;
          width: 100%;
          background: var(--bg-secondary, #ffffff);
          border: 1px solid var(--asu-blue, #003f7f);
          border-radius: 4px;
          overflow: hidden;
          user-select: none;
          display: flex;
          align-items: center;
          --duration: 14s;
          --gap: 48px;
          margin: 1.5rem 0;
        }

        .announcement-banner .belt {
          display: flex;
          flex-shrink: 0;
          align-items: center;
          gap: var(--gap);
          min-width: 100%;
          padding-inline: var(--gap);
          animation: scroll var(--duration) linear infinite;
          will-change: transform;
        }

        .announcement-banner .item {
          font-family: "Press Start 2P", "Courier New", monospace;
          font-size: 18px;
          font-weight: normal;
          letter-spacing: 1.5px;
          color: var(--asu-blue, #003f7f);
          text-transform: uppercase;
          white-space: nowrap;
          text-rendering: optimizeSpeed;
          image-rendering: pixelated;
          -webkit-font-smoothing: none;
          -moz-osx-font-smoothing: grayscale;
        }

        /* Dark mode overrides */
        [data-theme="dark"] .announcement-banner {
          border-color: #3f3f3f;
        }

        [data-theme="dark"] .announcement-banner .item {
          color: #ffffff;
        }

        @keyframes scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(calc(-100% - var(--gap))); }
        }

        /* Pause on hover */
        .announcement-banner:hover .belt { animation-play-state: paused; }

        /* Respect reduced motion */
        @media (prefers-reduced-motion: reduce) {
          .announcement-banner .belt { animation-play-state: paused; }
        }

        /* Responsive adjustments */
        @media (max-width: 768px) {
          .announcement-banner {
            margin: 1rem 0;
            border-radius: 6px;
          }

          .announcement-banner .item {
            font-size: 14px;
          }
        }

        @media (max-width: 480px) {
          .announcement-banner .item {
            font-size: 12px;
            letter-spacing: 1px;
          }
        }
      `}</style>
    </div>
  );
}

export default AnnouncementBanner;
