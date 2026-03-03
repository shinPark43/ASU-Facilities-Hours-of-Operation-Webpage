import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { HiOutlineBookOpen, HiOutlineAcademicCap, HiOutlineSearch } from 'react-icons/hi';
import { FaDumbbell, FaInstagram, FaUtensils } from 'react-icons/fa';
import { TbBus } from 'react-icons/tb';
import { fetchFacilityData, tutoringAPI, calendarAPI } from '../services/api.js';
import { getCurrentDayName, isClosedTime, parseMultipleTimeRanges } from '../utils/timeUtils.js';
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
    featured: true,       // spans 2 cols on mobile — bento hero card
  },
  {
    key: 'tutoring',
    name: 'Tutoring',
    IconComponent: HiOutlineAcademicCap,
    iconAccent: 'blue',
    path: '/tutoring',
    static: true,
  },
];

const HIGHLIGHT_CARDS = [
  { id: 'hc-1', accentColor: 'red',   badge: 'DEADLINE', title: 'Loading…', subtitle: '' },
  { id: 'hc-2', accentColor: 'amber', badge: 'UPCOMING', title: 'Loading…', subtitle: '' },
  { id: 'hc-3', accentColor: 'amber', badge: 'UPCOMING', title: 'Loading…', subtitle: '' },
  { id: 'hc-4', accentColor: 'amber', badge: 'UPCOMING', title: 'Loading…', subtitle: '' },
  { id: 'hc-5', accentColor: 'amber', badge: 'UPCOMING', title: 'Loading…', subtitle: '' },
];

const getClosingTime = (str) => {
  if (!str) return null;
  const periods = str.split(' · ');
  const last = periods[periods.length - 1];
  const match = last.match(/[-–]\s*(.+)$/);
  return match ? match[1].trim() : null;
};

const isCurrentlyRunning = (timeString, now) => {
  if (!timeString) return false;
  // Matches: "4:30 - 8:30 p.m."  or  "11:30 a.m. - 11:30 p.m."
  const match = timeString.match(
    /(\d{1,2}):(\d{2})\s*(?:([ap])\.?m?\.?)?\s*[-–]\s*(\d{1,2}):(\d{2})\s*([ap])\.?m?\.?/i
  );
  if (!match) return false;

  const toMins = (h, m, period) => {
    let hrs = parseInt(h);
    const mins = parseInt(m);
    const p = period.toLowerCase();
    if (p === 'p' && hrs !== 12) hrs += 12;
    if (p === 'a' && hrs === 12) hrs = 0;
    return hrs * 60 + mins;
  };

  const endPeriod   = match[6];                          // always present
  const startPeriod = match[3] ? match[3] : endPeriod;  // infer from end if missing

  const startMins = toMins(match[1], match[2], startPeriod);
  const endMins   = toMins(match[4], match[5], endPeriod);
  const nowMins   = now.getHours() * 60 + now.getMinutes();

  return nowMins >= startMins && nowMins < endMins;
};

const Home = () => {
  const [facilityData, setFacilityData] = useState({});
  const [loading, setLoading] = useState(true);
  const [calendarEvents, setCalendarEvents] = useState(HIGHLIGHT_CARDS);
  const [now, setNow] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const clock = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(clock);
  }, []);

  useEffect(() => {
    const fetchAll = async () => {
      const [libraryRes, gymRes, diningRes, ramTramRes, tutoringRes, calendarRes] = await Promise.allSettled([
        fetchFacilityData('library'),
        fetchFacilityData('recreation'),
        fetchFacilityData('dining'),
        fetchFacilityData('ram_tram'),
        tutoringAPI.getAllTutoringData(),
        calendarAPI.getUpcoming(),
      ]);

      const responses = [libraryRes, gymRes, diningRes, ramTramRes, tutoringRes];
      const keys = ['library', 'recreation', 'dining', 'ram_tram', 'tutoring'];
      const results = {};
      keys.forEach((key, i) => {
        if (responses[i].status === 'fulfilled') {
          results[key] = responses[i].value;
        }
      });

      if (calendarRes.status === 'fulfilled' && calendarRes.value?.data?.length > 0) {
        setCalendarEvents(calendarRes.value.data);
      }

      setFacilityData(results);
      setLoading(false);
    };

    fetchAll();
  }, []);

  const hour = now.getHours();
  const greeting = hour < 5
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

  const today = getCurrentDayName();

  const getFacilityStatus = (facilityKey, sectionKey) => {
    const data = facilityData[facilityKey];
    if (!data || !data.sections || !data.sections[sectionKey]) {
      return { isOpen: false, hoursStr: null };
    }

    const sectionData = data.sections[sectionKey];
    const todayValue = sectionData[today];

    if (facilityKey === 'ram_tram') {
      const isObject = todayValue && typeof todayValue === 'object';
      const isClosed = !isObject && isClosedTime(todayValue);

      if (!todayValue || isClosed) {
        return { isOpen: false, hoursStr: 'Not running today' };
      }
      if (isObject) {
        const currentlyRunning = isCurrentlyRunning(todayValue.time, now);
        return { isOpen: currentlyRunning, hoursStr: `${todayValue.time} · ${todayValue.route}` };
      }
      return { isOpen: false, hoursStr: todayValue };
    }

    if (!todayValue) {
      return { isOpen: false, hoursStr: null };
    }

    const isClosed = isClosedTime(todayValue);
    if (isClosed) {
      return { isOpen: false, hoursStr: 'Closed today' };
    }

    const ranges = parseMultipleTimeRanges(todayValue);
    return { isOpen: true, hoursStr: ranges.join(' · ') };
  };

  const renderStatusText = (facility, isOpen, hoursStr) => {
    if (facility.static) {
      return <span className="facility-status-text link">Schedule →</span>;
    }
    if (loading) {
      return <div className="status-shimmer" />;
    }
    if (facility.key === 'ram_tram') {
      if (isOpen) {
        return (
          <div className="status-row">
            <span className="status-dot" />
            <span className="facility-status-text open">Running</span>
          </div>
        );
      }
      return <span className="facility-status-text closed">Not running</span>;
    }
    if (isOpen) {
      const ct = getClosingTime(hoursStr);
      return (
        <div className="status-row">
          <span className="status-dot" />
          <span className="facility-status-text open">
            {ct ? `'til ${ct}` : 'Open'}
          </span>
        </div>
      );
    }
    return <span className="facility-status-text closed">Closed</span>;
  };

  const searchIndex = useMemo(() => {
    const index = [];
    FACILITY_CONFIGS.forEach(facility => {
      index.push({
        name: facility.name,
        parentFacilityName: null,
        path: facility.path,
        IconComponent: facility.IconComponent,
        iconAccent: facility.iconAccent,
      });

      if (!facility.static && facility.key !== 'ram_tram' && facilityData[facility.key]?.sections) {
        Object.keys(facilityData[facility.key].sections).forEach(sectionKey => {
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

    // Tutoring subjects (uses .subjects, not .sections)
    const tutoringConfig = FACILITY_CONFIGS.find(f => f.key === 'tutoring');
    if (tutoringConfig && facilityData['tutoring']?.subjects) {
      Object.keys(facilityData['tutoring'].subjects).forEach(subjectKey => {
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
    ? searchIndex.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : [];
  const showDropdown = searchFocused && searchResults.length > 0;

  const handleResultClick = (path) => {
    setSearchQuery('');
    setSearchFocused(false);
    navigate(path);
  };

  return (
    <div className="home-page">
      {/* 0. Search Bar */}
      <div className="home-search-wrapper">
        <div className={`home-search-bar${searchFocused ? ' focused' : ''}`}>
          <input
            type="text"
            className="home-search-input"
            placeholder="Search"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
          {searchQuery
            ? (
              <button
                className="home-search-clear"
                onMouseDown={e => e.preventDefault()}
                onClick={() => setSearchQuery('')}
              >
                ✕
              </button>
            )
            : <HiOutlineSearch size={18} className="home-search-icon" />
          }
        </div>
        {showDropdown && (
          <div className="home-search-dropdown">
            {searchResults.map(item => {
              const { IconComponent } = item;
              return (
                <div
                  key={item.path}
                  className="home-search-result"
                  onMouseDown={e => e.preventDefault()}
                  onClick={() => handleResultClick(item.path)}
                >
                  <div className={`home-search-result-icon ${item.iconAccent}`}>
                    <IconComponent size={16} />
                  </div>
                  <div className="home-search-result-text">
                    <span className="home-search-result-name">{item.name}</span>
                    {item.parentFacilityName && (
                      <span className="home-search-result-parent">{item.parentFacilityName}</span>
                    )}
                  </div>
                  <span className="home-search-result-arrow">→</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 1. Welcome Section */}
      <section className="home-welcome">
        <p className="home-date">{dateStr} · {timeStr}</p>
        <h1 className="home-greeting">{greeting}</h1>
      </section>

      {/* 2. Facility Status Grid */}
      <section className="facility-status-section">
        <h2 className="home-section-title">Facility Status</h2>
        <div className="facility-icon-grid">
          {FACILITY_CONFIGS.map((facility) => {
            const { isOpen, hoursStr } = (!loading && !facility.static)
              ? getFacilityStatus(facility.key, facility.sectionKey)
              : { isOpen: false, hoursStr: null };

            const { IconComponent } = facility;
            return (
              <Link
                key={facility.key}
                to={facility.path}
                className={`facility-icon-card${facility.featured ? ' featured' : ''}`}
              >
                <div className={`facility-icon-circle ${facility.iconAccent}`}>
                  <IconComponent size={facility.featured ? 22 : 18} />
                </div>
                <div className="facility-card-info">
                  <span className="facility-icon-name">{facility.name}</span>
                  {renderStatusText(facility, isOpen, hoursStr)}
                </div>
              </Link>
            );
          })}
        </div>
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
            const accentColor = i === 0 ? 'red' : 'amber';
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

      {/* 4. Instagram CTA */}
      <section className="instagram-section">
        <h2 className="home-section-title">Follow Us</h2>
        <a
          href="https://www.instagram.com/asuhours/"
          target="_blank"
          rel="noopener noreferrer"
          className="instagram-cta"
        >
          <FaInstagram size={22} style={{ color: '#e1306c', flexShrink: 0 }} />
          <div className="instagram-cta-text">
            <span className="instagram-cta-main">Stay Connected</span>
            <span className="instagram-cta-sub">Follow @asuhours</span>
          </div>
          <span className="instagram-cta-arrow">→</span>
        </a>
      </section>

      {/* 5. Footer */}
      <p className="home-footer-text">ASU Hours is developed and maintained by ASU students.</p>
    </div>
  );
};

export default Home;
