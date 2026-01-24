import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import MobileTabBar from './MobileTabBar';
import ScrollToTop from './ScrollToTop';
import HamburgerMenu from './HamburgerMenu';
import '../styles/Layout.css';

const Layout = ({ children }) => {
  const [theme, setTheme] = useState('light');
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const location = useLocation();
  
  // Check if current page should show tab bar
  const facilityPages = ['/library', '/gym', '/dining', '/tutoring'];
  const shouldShowTabBar = facilityPages.includes(location.pathname);
  
  // Check if current page is landing page
  const isLandingPage = location.pathname === '/landing';

  // Load theme from localStorage on component mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  // Scroll detection for header visibility
  useEffect(() => {
    const controlHeaderVisibility = () => {
      const currentScrollY = window.scrollY;
      const documentHeight = document.documentElement.scrollHeight;
      const windowHeight = window.innerHeight;
      const scrollThreshold = 10; // Minimum scroll distance to trigger
      
      // Prevent bounce scrolling issues by checking boundaries
      const isAtTop = currentScrollY <= 0;
      const isAtBottom = currentScrollY + windowHeight >= documentHeight - 5;
      
      // Don't process if scroll difference is too small
      if (Math.abs(currentScrollY - lastScrollY) < scrollThreshold) {
        return;
      }

      // Always show header at the top
      if (isAtTop) {
        setIsHeaderVisible(true);
        setLastScrollY(currentScrollY);
        return;
      }

      // Don't hide header when bouncing at the bottom
      if (isAtBottom && currentScrollY < lastScrollY) {
        // User is bouncing back from bottom - keep header state
        return;
      }

      // Normal scroll behavior
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        // Scrolling down & past threshold - hide header
        setIsHeaderVisible(false);
      } else if (currentScrollY < lastScrollY) {
        // Scrolling up - show header
        setIsHeaderVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    const throttledControl = throttle(controlHeaderVisibility, 16); // ~60fps
    window.addEventListener('scroll', throttledControl, { passive: true });
    
    return () => window.removeEventListener('scroll', throttledControl);
  }, [lastScrollY]);

  // Throttle function for performance
  const throttle = (func, limit) => {
    let inThrottle;
    return function() {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    }
  };

  // Toggle between light and dark themes
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  return (
    <div className="app-container">
      {!isLandingPage && (
        <header className={`app-header ${isHeaderVisible ? 'visible' : 'hidden'}`}>
          <div className="header-content">
            <div className="header-text">
              <h1 className="app-title">ASU Hours</h1>
              <p className="app-subtitle">Weekly Operating Hours</p>
            </div>
            <div className="header-controls">
              <div className="theme-toggle-container">
                <span className="theme-label">{theme.toUpperCase()}</span>
                <div className="theme-toggle-switch" onClick={toggleTheme}>
                  <div className="toggle-track">
                    <div className={`toggle-thumb ${theme === 'dark' ? 'dark' : 'light'}`}></div>
                    <div className="toggle-icons">
                      <span className="icon-light">☀️</span>
                      <span className="icon-dark">🌙</span>
                    </div>
                  </div>
                </div>
              </div>
              <HamburgerMenu />
            </div>
          </div>
        </header>
      )}
      {!isLandingPage && <Sidebar />}
      {!isLandingPage && <MobileTabBar isHeaderVisible={isHeaderVisible} />}
      <main className={`main-content-wrapper ${shouldShowTabBar ? 'with-tab-bar' : ''} ${isLandingPage ? 'landing-page' : ''}`}>
        {children}
      </main>
      {!isLandingPage && <ScrollToTop />}
    </div>
  );
};

export default Layout; 