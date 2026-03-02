import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { HiOutlineMenu, HiOutlineX, HiOutlineHome, HiOutlineInformationCircle,
         HiOutlineDownload, HiOutlineBookOpen, HiOutlineAcademicCap } from 'react-icons/hi';
import { FaInstagram, FaDumbbell } from 'react-icons/fa';
import { IoRestaurant } from 'react-icons/io5';
import { TbBus } from 'react-icons/tb';
import '../styles/HamburgerMenu.css';

const HamburgerMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  const facilityItems = [
    { path: '/home',     label: 'Home',          icon: HiOutlineHome },
    { path: '/library',  label: 'Library',        icon: HiOutlineBookOpen },
    { path: '/gym',      label: 'Gym',            icon: FaDumbbell },
    { path: '/dining',   label: 'Dining',         icon: IoRestaurant },
    { path: '/tutoring', label: 'Tutoring',       icon: HiOutlineAcademicCap },
    { path: '/ramtram',  label: 'Ram Tram',       icon: TbBus },
  ];

  const utilityItems = [
    { path: '/install',  label: 'How to Install', icon: HiOutlineDownload },
    { path: '/about',    label: 'About',          icon: HiOutlineInformationCircle },
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
          {facilityItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <button
                key={item.path}
                className={`menu-item ${location.pathname === item.path ? 'active' : ''}`}
                onClick={() => handleMenuItemClick(item.path)}
              >
                <span className="menu-icon"><IconComponent size={22} /></span>
                <span className="menu-label">{item.label}</span>
              </button>
            );
          })}
          <div className="menu-divider" />
          {utilityItems.map((item) => {
            const IconComponent = item.icon;
            return (
              <button
                key={item.path}
                className={`menu-item ${location.pathname === item.path ? 'active' : ''}`}
                onClick={() => handleMenuItemClick(item.path)}
              >
                <span className="menu-icon"><IconComponent size={22} /></span>
                <span className="menu-label">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="menu-footer">
          <div className="footer-info">
            <p>ASU Facilities Hours</p>
            <p className="footer-subtitle">Real-time operating hours</p>
          </div>
          <a
            href="https://www.instagram.com/asuhours/"
            target="_blank"
            rel="noopener noreferrer"
            className="menu-instagram-link"
            aria-label="Follow us on Instagram"
          >
            <FaInstagram size={22} />
          </a>
        </div>
      </div>
    </div>
  );
};

export default HamburgerMenu;