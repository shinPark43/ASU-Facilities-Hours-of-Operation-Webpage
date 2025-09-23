import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { HiOutlineMenu, HiOutlineX, HiOutlineHome, HiOutlineInformationCircle, HiOutlineDownload } from 'react-icons/hi';
import { TbBus } from 'react-icons/tb';
import '../styles/HamburgerMenu.css';

const HamburgerMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { path: '/library', label: 'Home', icon: HiOutlineHome },
    { path: '/ramtram', label: 'Ram Tram', icon: TbBus },
    { path: '/install', label: 'How to Install', icon: HiOutlineDownload },
    { path: '/about', label: 'About', icon: HiOutlineInformationCircle }
  ];

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleMenuItemClick = (path) => {
    navigate(path);
    setIsOpen(false);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'hidden'; // Prevent background scroll
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Close menu on route change
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  return (
    <div className="hamburger-menu" ref={menuRef}>
      <button 
        className={`hamburger-button ${isOpen ? 'open' : ''}`}
        onClick={toggleMenu}
        aria-label="Toggle menu"
        aria-expanded={isOpen}
      >
        <HiOutlineMenu size={24} color="white" />
      </button>

      {/* Backdrop */}
      {isOpen && <div className="menu-backdrop" onClick={() => setIsOpen(false)}></div>}

      {/* Menu Dropdown */}
      <div className={`menu-dropdown ${isOpen ? 'open' : ''}`}>
        <div className="menu-header">
          <h3>ASU Hours</h3>
          <button 
            className="menu-close-button"
            onClick={() => setIsOpen(false)}
            aria-label="Close menu"
          >
            <HiOutlineX size={24} />
          </button>
        </div>
        
        <nav className="menu-nav">
          {menuItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <button
                key={item.path}
                className={`menu-item ${location.pathname === item.path ? 'active' : ''}`}
                onClick={() => handleMenuItemClick(item.path)}
              >
                <span className="menu-icon">
                  <IconComponent size={22} />
                </span>
                <span className="menu-label">{item.label}</span>
                {location.pathname === item.path && (
                  <span className="active-indicator">•</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="menu-footer">
          <div className="footer-info">
            <p>ASU Facilities Hours</p>
            <p className="footer-subtitle">Real-time operating hours</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HamburgerMenu;