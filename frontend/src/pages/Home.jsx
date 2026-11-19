import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  HiOutlineBookOpen,
  HiOutlineAcademicCap,
  HiOutlineSearch,
  HiOutlineOfficeBuilding,
} from 'react-icons/hi';
import { FaDumbbell, FaInstagram, FaUtensils } from 'react-icons/fa';
import { TbBus, TbCalendarEvent } from 'react-icons/tb';
import { fetchFacilityData, tutoringAPI, calendarAPI, eventsAPI } from '../services/api.js';
import EventCalendarMap from '../components/EventCalendarMap';
import ScheduleWidget from '../components/ScheduleWidget';
import StaleDataBanner from '../components/StaleDataBanner';
import HolidayAlertBanner from '../components/HolidayAlertBanner';
import { evaluateFacilityStatus, msUntilNextMinute } from '../utils/timeUtils.js';
import '../styles/Home.css';

const FACILITY_CONFIGS = [
  {
    key: 'library',
    sectionKey: 'Main Library',
    name: 'Library',
    IconComponent: HiOutlineBookOpen,
    iconAccent: 'blue',
    path: '/library',
  },
  {
    key: 'recreation',
    sectionKey: 'CHP (Fitness Center)',
    name: 'Gym',
    IconComponent: FaDumbbell,
    iconAccent: 'blue',
    path: '/gym',
  },
  {
    key: 'ram_tram',
    sectionKey: 'Ram Tram',
    name: 'Ram Tram',
    IconComponent: TbBus,
    iconAccent: 'blue',
    path: '/ramtram',
  },
  {
    key: 'dining',
    sectionKey: 'The CAF',
    name: 'Dining',
    IconComponent: FaUtensils,
    iconAccent: 'gold',
    path: '/dining',
    featured: true, // spans 2 cols on mobile — bento hero card
  },
  {
    key: 'tutoring',
    name: 'Tutoring',
    IconComponent: HiOutlineAcademicCap,
    iconAccent: 'blue',
    path: '/tutoring',
    static: true,
  },
  {
    key: 'essentials',
    sectionKey: 'Ram Central Station (Bookstore)',
    name: 'Essentials',
    IconComponent: HiOutlineOfficeBuilding,
    iconAccent: 'blue',
    path: '/essentials',
  },
];

const HIGHLIGHT_CARDS = [
  { id: 'hc-1', accentColor: 'red', badge: 'DEADLINE', title: 'Loading…', subtitle: '' },
  { id: 'hc-2', accentColor: 'amber', badge: 'UPCOMING', title: 'Loading…', subtitle: '' },
  { id: 'hc-3', accentColor: 'amber', badge: 'UPCOMING', title: 'Loading…', subtitle: '' },
  { id: 'hc-4', accentColor: 'amber', badge: 'UPCOMING', title: 'Loading…', subtitle: '' },
  { id: 'hc-5', accentColor: 'amber', badge: 'UPCOMING', title: 'Loading…', subtitle: '' },
];

const Home = () => {
  const [facilityData, setFacilityData] = useState({});
  const [facilitiesLoading, setFacilitiesLoading] = useState(true);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [calendarEvents, setCalendarEvents] = useState(HIGHLIGHT_CARDS);
  const [campusEvents, setCampusEvents] = useState([]);
  const [now, setNow] = useState(() => new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'open'
  const navigate = useNavigate();

  // Minute-aligned clock — avoids re-rendering the entire dashboard & Mapbox map every second
  useEffect(() => {
    let intervalId;
    const timeoutId = setTimeout(() => {
      setNow(new Date());
      intervalId = setInterval(() => setNow(new Date()), 60000);
    }, msUntilNextMinute());
    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  const loadFacilities = useCallback(async () => {
    setFacilitiesLoading(true);
    const [libraryRes, gymRes, diningRes, ramTramRes, essentialsRes, tutoringRes] =
      await Promise.allSettled([
        fetchFacilityData('library'),
        fetchFacilityData('recreation'),
        fetchFacilityData('dining'),
        fetchFacilityData('ram_tram'),
        fetchFacilityData('essentials'),
        tutoringAPI.getAllTutoringData(),
      ]);

    const responses = [libraryRes, gymRes, diningRes, ramTramRes, essentialsRes, tutoringRes];
    const keys = ['library', 'recreation', 'dining', 'ram_tram', 'essentials', 'tutoring'];
    const results = {};
    keys.forEach((key, i) => {
      if (responses[i].status === 'fulfilled') results[key] = responses[i].value;
    });

    setFacilityData(results);
    setFacilitiesLoading(false);
  }, []);

  useEffect(() => {
    loadFacilities();

    const fetchCalendarData = async () => {
      const [calendarRes, eventsRes] = await Promise.allSettled([
        calendarAPI.getUpcoming(),
        eventsAPI.getUpcoming(),
      ]);

      if (calendarRes.status === 'fulfilled' && calendarRes.value?.data?.length > 0) {
        setCalendarEvents(calendarRes.value.data);
      }
      if (eventsRes.status === 'fulfilled' && eventsRes.value?.data?.length > 0) {
        setCampusEvents(eventsRes.value.data);
      }

      setCalendarLoading(false);
    };

    fetchCalendarData();
  }, [loadFacilities]);

  // Detect whether any live facility fetch fell back to cache or hardcoded sample data
  const fallbackInfo = useMemo(() => {
    const entries = Object.values(facilityData).filter(Boolean);
    const mockEntry = entries.find((d) => d._isFallback && d._source === 'mock');
    if (mockEntry) return { isFallback: true, source: 'mock', cachedAt: null };
    const cacheEntry = entries.find((d) => d._isFallback && d._source === 'cache');
    if (cacheEntry) return { isFallback: true, source: 'cache', cachedAt: cacheEntry._cachedAt };
    return { isFallback: false, source: 'live', cachedAt: null };
  }, [facilityData]);

  // Compute real-time open/closing status for every top-level facility card
  const facilityStatuses = useMemo(() => {
    const map = {};
    for (const facility of FACILITY_CONFIGS) {
      if (facility.static) continue;
      const sections = facilityData[facility.key]?.sections;
      const primarySchedule = sections?.[facility.sectionKey];
      map[facility.key] = evaluateFacilityStatus(primarySchedule, now, {
        isRamTram: facility.key === 'ram_tram',
      });
    }
    return map;
  }, [facilityData, now]);

  // Compute every individual campus venue currently open right now (for "Open Now" view)
  const openVenuesNow = useMemo(() => {
    if (facilitiesLoading) return [];
    const list = [];
    for (const facility of FACILITY_CONFIGS) {
      if (facility.static) continue;
      const sections = facilityData[facility.key]?.sections;
      if (!sections) continue;

      for (const [sectionName, schedule] of Object.entries(sections)) {
        const status = evaluateFacilityStatus(schedule, now, {
          isRamTram: facility.key === 'ram_tram',
        });
        if (status.isOpen) {
          const path =
            facility.key === 'ram_tram'
              ? facility.path
              : `${facility.path}?tab=${encodeURIComponent(sectionName)}`;
          list.push({
            id: `${facility.key}:${sectionName}`,
            name: sectionName,
            parentName: facility.name,
            path,
            IconComponent: facility.IconComponent,
            iconAccent: facility.iconAccent,
            status,
          });
        }
      }
    }
    // Sort closing-soon items to the top so urgent deadlines stand out first
    return list.sort((a, b) => (a.status.minutesUntilClose ?? 9999) - (b.status.minutesUntilClose ?? 9999));
  }, [facilityData, facilitiesLoading, now]);

  const hour = now.getHours();
  const greeting =
    hour < 5
      ? 'Good night'
      : hour < 12
        ? 'Good morning'
        : hour < 17
          ? 'Good afternoon'
          : hour < 22
            ? 'Good evening'
            : 'Good night';
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  const renderStatusText = (facility, status) => {
    if (facility.static) {
      return <span className="facility-status-text link">Schedule →</span>;
    }
    if (facilitiesLoading) {
      return <div className="status-shimmer" />;
    }
    if (!status) {
      return <span className="facility-status-text closed">Closed</span>;
    }
    if (status.state === 'closing-soon') {
      return (
        <div className="status-row">
          <span className="status-dot status-dot--closing" aria-hidden="true" />
          <span className="facility-status-text closing">{status.label}</span>
        </div>
      );
    }
    if (status.isOpen) {
      return (
        <div className="status-row">
          <span className="status-dot" aria-hidden="true" />
          <span className="facility-status-text open">{status.label}</span>
        </div>
      );
    }
    if (status.state === 'reopens-later' || status.state === 'opens-later') {
      return <span className="facility-status-text reopens">{status.label}</span>;
    }
    return <span className="facility-status-text closed">{status.label}</span>;
  };

  const searchIndex = useMemo(() => {
    const index = [];
    FACILITY_CONFIGS.forEach((facility) => {
      index.push({
        name: facility.name,
        parentFacilityName: null,
        path: facility.path,
        IconComponent: facility.IconComponent,
        iconAccent: facility.iconAccent,
      });

      if (!facility.static && facility.key !== 'ram_tram' && facilityData[facility.key]?.sections) {
        Object.keys(facilityData[facility.key].sections).forEach((sectionKey) => {
          index.push({
            name: sectionKey,
            parentFacilityName: facility.name,
            path: `${facility.path}?tab=${encodeURIComponent(sectionKey)}`,
            IconComponent: facility.IconComponent,
            iconAccent: facility.iconAccent,
          });
        });
      }
    });

    const tutoringConfig = FACILITY_CONFIGS.find((f) => f.key === 'tutoring');
    if (tutoringConfig && facilityData.tutoring?.subjects) {
      Object.keys(facilityData.tutoring.subjects).forEach((subjectKey) => {
        index.push({
          name: subjectKey,
          parentFacilityName: 'Tutoring',
          path: `/tutoring?subject=${encodeURIComponent(subjectKey)}`,
          IconComponent: tutoringConfig.IconComponent,
          iconAccent: tutoringConfig.iconAccent,
        });
      });
    }

    return index;
  }, [facilityData]);

  const searchResults = searchQuery.trim()
    ? searchIndex.filter((item) => item.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];
  const showDropdown = searchFocused && searchResults.length > 0;

  const handleResultClick = (path) => {
    setSearchQuery('');
    setSearchFocused(false);
    navigate(path);
  };

  return (
    <div className="home-page">
      {/* Live API fallback / offline notice & automatic Finals/Holiday Break alerts */}
      <StaleDataBanner
        isFallback={fallbackInfo.isFallback}
        source={fallbackInfo.source}
        cachedAt={fallbackInfo.cachedAt}
        onRetry={loadFacilities}
      />
      <HolidayAlertBanner calendarEvents={calendarEvents} />

      {/* 0. Search Bar */}
      <div className="home-search-wrapper">
        <div className={`home-search-bar${searchFocused ? ' focused' : ''}`}>
          <input
            type="text"
            className="home-search-input"
            placeholder="Search buildings, dining, bookstore, tutoring…"
            aria-label="Search ASU facilities and tutoring"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          {searchQuery ? (
            <button
              type="button"
              className="home-search-clear"
              aria-label="Clear search"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setSearchQuery('')}
            >
              ✕
            </button>
          ) : (
            <HiOutlineSearch size={18} className="home-search-icon" aria-hidden="true" />
          )}
        </div>
        {showDropdown && (
          <div className="home-search-dropdown">
            {searchResults.map((item) => {
              const { IconComponent } = item;
              return (
                <button
                  type="button"
                  key={item.path}
                  className="home-search-result"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleResultClick(item.path)}
                >
                  <div className={`home-search-result-icon ${item.iconAccent}`} aria-hidden="true">
                    <IconComponent size={16} />
                  </div>
                  <div className="home-search-result-text">
                    <span className="home-search-result-name">{item.name}</span>
                    {item.parentFacilityName && (
                      <span className="home-search-result-parent">{item.parentFacilityName}</span>
                    )}
                  </div>
                  <span className="home-search-result-arrow" aria-hidden="true">→</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* 1. Welcome Section */}
      <section className="home-welcome">
        <div className="home-welcome-row">
          <div>
            <p className="home-date">
              {dateStr} · {timeStr}
            </p>
            <h1 className="home-greeting">{greeting}</h1>
          </div>
          <button
            type="button"
            className="home-schedule-btn"
            onClick={() => setShowSchedule(true)}
            aria-label="My Schedule"
          >
            <TbCalendarEvent size={26} aria-hidden="true" />
            <span>My Schedule</span>
          </button>
        </div>
      </section>

      {showSchedule && (
        <ScheduleWidget
          onClose={() => setShowSchedule(false)}
          tutoringData={facilityData.tutoring || null}
        />
      )}

      {/* 2. Facility Status Grid + "Open Now" filter */}
      <section className="facility-status-section">
        <div className="section-header-row">
          <h2 className="home-section-title">Facility Status</h2>
          <div className="open-now-filter" role="tablist" aria-label="Filter facilities by open status">
            <button
              type="button"
              role="tab"
              aria-selected={statusFilter === 'all'}
              className={`open-now-pill${statusFilter === 'all' ? ' active' : ''}`}
              onClick={() => setStatusFilter('all')}
            >
              All
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={statusFilter === 'open'}
              className={`open-now-pill${statusFilter === 'open' ? ' active' : ''}`}
              onClick={() => setStatusFilter('open')}
            >
              <span className="open-now-pill-dot" aria-hidden="true" />
              Open Now {!facilitiesLoading ? `(${openVenuesNow.length})` : ''}
            </button>
          </div>
        </div>

        {statusFilter === 'all' ? (
          <div className="facility-icon-grid">
            {FACILITY_CONFIGS.map((facility) => {
              const status = !facilitiesLoading && !facility.static ? facilityStatuses[facility.key] : null;
              const { IconComponent } = facility;
              return (
                <Link
                  key={facility.key}
                  to={facility.path}
                  className={`facility-icon-card${facility.featured ? ' featured' : ''}`}
                >
                  <div className={`facility-icon-circle ${facility.iconAccent}`} aria-hidden="true">
                    <IconComponent size={facility.featured ? 22 : 18} />
                  </div>
                  <div className="facility-card-info">
                    <span className="facility-icon-name">{facility.name}</span>
                    {renderStatusText(facility, status)}
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="open-now-list">
            {openVenuesNow.length === 0 ? (
              <p className="open-now-empty">
                No campus venues are currently open right now. Switch to <strong>All</strong> to check next opening times.
              </p>
            ) : (
              openVenuesNow.map((venue) => {
                const { IconComponent } = venue;
                const isClosingSoon = venue.status.state === 'closing-soon';
                return (
                  <Link key={venue.id} to={venue.path} className="open-now-row">
                    <div className={`home-search-result-icon ${venue.iconAccent}`} aria-hidden="true">
                      <IconComponent size={16} />
                    </div>
                    <div className="open-now-row-info">
                      <span className="open-now-row-name">{venue.name}</span>
                      <span className="open-now-row-parent">{venue.parentName}</span>
                    </div>
                    <div className="status-row">
                      <span
                        className={`status-dot${isClosingSoon ? ' status-dot--closing' : ''}`}
                        aria-hidden="true"
                      />
                      <span className={`facility-status-text ${isClosingSoon ? 'closing' : 'open'}`}>
                        {venue.status.label}
                      </span>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        )}
      </section>

      {/* 3. Academic Highlights */}
      <section className="highlights-section">
        <div className="section-header-row">
          <h2 className="home-section-title">Academic Highlights</h2>
          <a
            href="https://www.angelo.edu/current-students/registrar/academic_calendar.php"
            target="_blank"
            rel="noopener noreferrer"
            className="section-view-all"
          >
            View All →
          </a>
        </div>
        <div className="highlights-scroll">
          {calendarEvents.map((card, i) => {
            const accentColor = card.accentColor || (i === 0 ? 'red' : 'amber');
            return (
              <a
                key={card.id || card.title + i}
                href={card.link || 'https://www.angelo.edu/current-students/registrar/academic_calendar.php'}
                target="_blank"
                rel="noopener noreferrer"
                className={`highlight-card accent-${accentColor}`}
              >
                <span className={`highlight-badge ${accentColor === 'red' ? 'red' : 'amber'}`}>
                  {card.badge}
                </span>
                <p className="highlight-card-title">{card.title}</p>
                <p className="highlight-card-subtitle">{card.subtitle || card.date}</p>
              </a>
            );
          })}
        </div>
      </section>

      {/* 4. Event Calendar & Ram Tram Map */}
      <section className="event-map-section">
        <div className="section-header-row">
          <h2 className="home-section-title">Campus Map &amp; Events</h2>
          <a
            href="https://www.angelo.edu/events/calendar/"
            target="_blank"
            rel="noopener noreferrer"
            className="section-view-all"
          >
            View All →
          </a>
        </div>
        <EventCalendarMap events={campusEvents} loading={calendarLoading} />
      </section>

      {/* 5. Instagram CTA */}
      <section className="instagram-section">
        <h2 className="home-section-title">Follow Us</h2>
        <a
          href="https://www.instagram.com/asuhours/"
          target="_blank"
          rel="noopener noreferrer"
          className="instagram-cta"
        >
          <FaInstagram size={22} style={{ color: '#e1306c', flexShrink: 0 }} aria-hidden="true" />
          <div className="instagram-cta-text">
            <span className="instagram-cta-main">Stay Connected</span>
            <span className="instagram-cta-sub">Follow @asuhours</span>
          </div>
          <span className="instagram-cta-arrow" aria-hidden="true">→</span>
        </a>
      </section>

      {/* 6. Footer */}
      <p className="home-footer-text">ASU Hours is developed and maintained by ASU students.</p>
    </div>
  );
};

export default Home;
