import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { HiOutlineHome, HiOutlineBookOpen, HiOutlineAcademicCap, HiOutlineDotsHorizontal } from 'react-icons/hi';
import { FaDumbbell } from 'react-icons/fa';
import { IoRestaurant } from 'react-icons/io5';
import { TbBus } from 'react-icons/tb';
import '../styles/MobileTabBar.css';

const tabs = [
  { path: '/home',    label: 'Home',      IconComponent: HiOutlineHome },
  { path: '/library', label: 'Library',   IconComponent: HiOutlineBookOpen },
  { path: '/gym',     label: 'Gym',       IconComponent: FaDumbbell },
  { path: '/dining',  label: 'Dining',    IconComponent: IoRestaurant },
];

const moreItems = [
  { path: '/tutoring', label: 'Tutoring', IconComponent: HiOutlineAcademicCap },
  { path: '/ramtram',  label: 'Ram Tram', IconComponent: TbBus },
];

const morePages = ['/tutoring', '/ramtram'];
const hiddenPages = ['/landing'];

const MobileTabBar = ({ isHeaderVisible = true }) => {
  const location = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  // Close sheet on route change
  useEffect(() => { setMoreOpen(false); }, [location.pathname]);

  if (hiddenPages.includes(location.pathname)) return null;

  const moreIsActive = moreOpen || morePages.includes(location.pathname);

  return (
    <>
      {moreOpen && (
        <>
          <div className="more-backdrop" onClick={() => setMoreOpen(false)} />
          <div className="more-sheet">
            {moreItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={`more-sheet-item ${location.pathname === item.path ? 'active' : ''}`}
                onClick={() => setMoreOpen(false)}
              >
                <div className="more-sheet-item-icon">
                  <item.IconComponent size={22} />
                </div>
                <span className="more-sheet-item-label">{item.label}</span>
                <span className="more-sheet-item-arrow">→</span>
              </Link>
            ))}
          </div>
        </>
      )}
      <div className={`mobile-tab-bar ${isHeaderVisible ? 'visible' : 'hidden'}`}>
        <div className="tab-container">
          {tabs.map((tab) => (
            <Link
              key={tab.path}
              to={tab.path}
              className={`tab-item ${location.pathname === tab.path ? 'active' : ''}`}
            >
              <div className="tab-icon">
                <tab.IconComponent size={20} />
              </div>
              <span className="tab-label">{tab.label}</span>
            </Link>
          ))}
          <button
            className={`tab-item ${moreIsActive ? 'active' : ''}`}
            onClick={() => setMoreOpen(prev => !prev)}
          >
            <div className="tab-icon"><HiOutlineDotsHorizontal size={20} /></div>
            <span className="tab-label">More</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default MobileTabBar;
