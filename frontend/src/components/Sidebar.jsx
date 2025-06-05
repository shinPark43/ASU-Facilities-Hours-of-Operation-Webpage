import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = () => {
  const location = useLocation();
  
  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  return (
    <aside className="sidebar">
      <nav>
        <ul className="sidebar-nav">
          <li>
            <Link to="/library" className={isActive('/library')}>
              Library
            </Link>
          </li>
          <li>
            <Link to="/gym" className={isActive('/gym')}>
              Recreation Center
            </Link>
          </li>
          <li>
            <Link to="/dining" className={isActive('/dining')}>
              Dine on Campus
            </Link>
          </li>
          <li>
            <Link to="/about" className={isActive('/about')}>
              About
            </Link>
          </li>
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar; 