import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import '../styles/Layout.css';

const Layout = ({ children }) => {
  const [theme, setTheme] = useState('light');

  // Load theme from localStorage on component mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  // Toggle between light and dark themes
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <div className="header-text">
            <h1 className="app-title">ASU Facilities Hours</h1>
            <p className="app-subtitle">Weekly Operating Hours</p>
          </div>
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
        </div>
      </header>
      <Sidebar />
      <main className="main-content-wrapper">
        {children}
      </main>
    </div>
  );
};

export default Layout; 