import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { HiOutlineBookOpen } from 'react-icons/hi';
import { FaDumbbell } from 'react-icons/fa';
import { IoRestaurant } from 'react-icons/io5';
import '../styles/MobileTabBar.css';

const MobileTabBar = ({ isHeaderVisible = true }) => {
  const location = useLocation();
  
  // Only show tab bar on main facility pages
  const facilityPages = ['/library', '/gym', '/dining'];
  const shouldShowTabBar = facilityPages.includes(location.pathname);
  
  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };
  
  // Don't render tab bar if not on facility pages
  if (!shouldShowTabBar) {
    return null;
  }

  const tabs = [
    { path: '/library', label: 'Library', icon: HiOutlineBookOpen },
    { path: '/gym', label: 'Recreation', icon: FaDumbbell },
    { path: '/dining', label: 'Dining', icon: IoRestaurant }
  ];

  return (
    <div className={`mobile-tab-bar ${isHeaderVisible ? 'visible' : 'hidden'}`}>
      <div className="tab-container">
        {tabs.map((tab) => {
          const IconComponent = tab.icon;
          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={`tab-item ${isActive(tab.path)}`}
            >
              <div className="tab-icon">
                <IconComponent size={20} />
              </div>
              <span className="tab-label">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default MobileTabBar;
