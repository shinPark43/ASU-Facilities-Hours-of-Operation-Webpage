import React, { useState, useEffect, useRef, useCallback } from 'react';
import '../styles/Landing.css';

// Local image assets
import backgroundImage from '../assets/images/ASU.jpg';
import imgQrCode from '../assets/images/qr-code.png';
import apllicationImage1 from '../assets/images/phone_view1.png';
import apllicationImage2 from '../assets/images/phone_view2.png';
import instagram_icon_team_page from '../assets/images/instagram_icon_team_page.svg';
import youtube_icon_team_page from '../assets/images/youtube_icon_team_page.svg';
import envelope_icon_team_page from '../assets/images/email_icon_team_page.svg';
import white_arrow_icon from '../assets/images/white_arrow_icon.svg';
import gray_arrow_icon from '../assets/images/gray_arrow_icon.svg';

//How to Install guide images
import chrome1 from '../assets/images/Chrome1.png';
import chrome2 from '../assets/images/Chrome2.png';
import chrome3 from '../assets/images/Chrome3.png';
import chrome4 from '../assets/images/Chrome4.png';
import si1 from '../assets/images/SI1.png';
import si2 from '../assets/images/SI2.png';
import si3 from '../assets/images/SI3.png';
import si4 from '../assets/images/SI4.png';
import safari1 from '../assets/images/safari1.png';
import safari2 from '../assets/images/safari2.png';
import safari3 from '../assets/images/safari3.png';

const Landing = () => {
  const [currentSection, setCurrentSection] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const containerRef = useRef(null);
  const totalSections = 8;

  // Scroll to specific section
  const scrollToSection = useCallback((sectionIndex) => {
    if (isScrolling) return;
    
    setIsScrolling(true);
    setCurrentSection(sectionIndex);
    
    const section = document.querySelector(`[data-section="${sectionIndex}"]`);
    if (section) {
      // Use direct scrollTop for smoother, snap-friendly scrolling
      const container = containerRef.current;
      if (container) {
        container.scrollTo({
          top: section.offsetTop,
          behavior: 'smooth'
        });
      }
    }
    
    // Longer timeout to ensure scroll completes
    setTimeout(() => {
      setIsScrolling(false);
    }, 1200);
  }, [isScrolling]);

  // Handle wheel scroll
  useEffect(() => {
    const handleWheel = (e) => {
      if (isScrolling) {
        e.preventDefault();
        return;
      }

      if (e.deltaY > 0 && currentSection < totalSections - 1) {
        // Scroll down
        scrollToSection(currentSection + 1);
      } else if (e.deltaY < 0 && currentSection > 0) {
        // Scroll up
        scrollToSection(currentSection - 1);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
    }

    return () => {
      if (container) {
        container.removeEventListener('wheel', handleWheel);
      }
    };
  }, [currentSection, isScrolling, scrollToSection]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isScrolling) return;

      if (e.key === 'ArrowDown' && currentSection < totalSections - 1) {
        scrollToSection(currentSection + 1);
      } else if (e.key === 'ArrowUp' && currentSection > 0) {
        scrollToSection(currentSection - 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentSection, isScrolling, scrollToSection]);

  // Navigate to next section
  const goToNextSection = () => {
    if (currentSection < totalSections - 1) {
      scrollToSection(currentSection + 1);
    }
  };

  return (
    <div className="landing-container" ref={containerRef}>
      {/* Navigation Indicators - Hidden on first section */}
      {currentSection !== 0 && (
        <div className="fixed-scroll-indicator">
          {[...Array(totalSections)].map((_, i) => (
            <button
              key={i}
              className={`fixed-scroll-dot ${currentSection === i ? 'active' : ''}`}
              onClick={() => scrollToSection(i)}
              aria-label={`Go to section ${i + 1}`}
            ></button>
          ))}
        </div>
      )}

      {/* Down Arrow Button */}
      {currentSection < totalSections - 1 && (
        <button 
          className={`fixed-down-arrow ${currentSection === 0 ? 'white-arrow' : 'gray-arrow'}`}
          onClick={goToNextSection}
          aria-label="Scroll to next section"
        >
          <img src={currentSection === 0 ? white_arrow_icon : gray_arrow_icon} alt="Scroll down" />
        </button>
      )}

      {/* ASU Hours Title */}
      <p className={`section-title ${currentSection === 0 ? 'main-hero-title' : ''} ${currentSection === 7 ? 'team-title' : ''}`}>
        ASU Hours
      </p>

      {/* First page (Main)- Section 0 (First) */}
      <div className="landing-section main-hero-section" data-section="0">
        <img className="hero-background-image" src={backgroundImage} alt="ASU Campus" />
        <div className="hero-overlay"></div>
        
        {/* How to Install Dropdown Menu */}
        {/* <div className="install-dropdown">
          <span className="install-dropdown-title">How to Install</span>
          <div className="install-dropdown-menu">
            <button onClick={() => scrollToSection(4)}>Safari</button>
            <button onClick={() => scrollToSection(5)}>Chrome</button>
            <button onClick={() => scrollToSection(6)}>Samsung Internet</button>
          </div>
        </div> */}
        
        <div className="main-hero-heading">
          <p>Real-Time</p>
          <p>Operating Hours</p>
          <p>For ASU Facilities</p>
        </div>
        <img className="hero-icon" src={imgQrCode} alt="QR Code" />
        <div className="hero-feature-text">
          <p>Anytime, Anywhere</p>
          <p>Access with Mobile Device</p>
            </div>
        <img className="hero-image-1" src={apllicationImage1} alt="Mobile App Screenshot 1" />
        <img className="hero-image-2" src={apllicationImage2} alt="Mobile App Screenshot 2" />
            </div>

      {/* Second page (Information1) - Section 1 */}
      <div className="landing-section hero-section" data-section="1">
        <div className="section-gradient hero-gradient"></div>
        <div className="hero-heading">
          <p>The All-in-One</p>
          <p>Campus Operating Hours App</p>
            </div>
        <div className="hero-description">
          <p>Our solution</p>
          <p>for the inconvenience of checking</p>
          <p>facility operating hours</p>
            </div>
    </div>

      {/* Third page (Information2) - Section 2 */}
      <div className="landing-section" data-section="2">
        <div className="section-gradient"></div>
        <p className="section-heading">Quick Mobile Access</p>
        <div className="section-description">
          <p>Students and faculty</p>
          <p>can check essential information instantly</p>
          <p>from their phones</p>
          <p>without repeating searches.</p>
        </div>
      </div>

      {/* Fourth page (Information3) - Section 3 */}
      <div className="landing-section" data-section="3">
        <div className="section-gradient"></div>
        <p className="section-heading">Up-to-Date Information</p>
        <div className="section-description">
          <p>Operating hours and schedules</p>
          <p>are automatically updated every day,</p>
          <p>ensuring accuracy without manual checks.</p>
        </div>
      </div>

      {/* Fifth page (How to Install1)- Section 4 */}
      <div className="landing-section install-section" data-section="4">
        <div className="section-gradient hero-gradient"></div>
        <p className="install-guide-title">How to install - Safari</p>
        <div className="install-guide-row chrome-row">
          <div className="install-guide-item">
            <img src={safari1} alt="Safari Step 1" className="install-guide-img" />
            <p className="install-guide-label">Tap share icon</p>
          </div>
          <span className="install-guide-arrow">→</span>
          <div className="install-guide-item">
            <img src={safari2} alt="Safari Step 2" className="install-guide-img" />
            <p className="install-guide-label">Add to Home screen</p>
          </div>
          <span className="install-guide-arrow">→</span>
          <div className="install-guide-item">
            <img src={safari3} alt="Safari Step 3" className="install-guide-img" />
            <p className="install-guide-label">Tap Add</p>
          </div>
        </div>
      </div>

      {/* Sixth page (How to Install2)- Section 5 */}
      <div className="landing-section install-section" data-section="5">
        <div className="section-gradient"></div>
        <p className="install-guide-title">How to install - Chrome</p>
        <div className="install-guide-row chrome-row">
          <div className="install-guide-item">
            <img src={chrome1} alt="Chrome Step 1" className="install-guide-img" />
            <p className="install-guide-label">Tap menu icon</p>
          </div>
          <span className="install-guide-arrow">→</span>
          <div className="install-guide-item">
            <img src={chrome2} alt="Chrome Step 2" className="install-guide-img" />
            <p className="install-guide-label">Add to Home screen</p>
          </div>
          <span className="install-guide-arrow">→</span>
          <div className="install-guide-item">
            <img src={chrome3} alt="Chrome Step 3" className="install-guide-img" />
            <p className="install-guide-label">Tap Install</p>
          </div>
          <span className="install-guide-arrow">→</span>
          <div className="install-guide-item">
            <img src={chrome4} alt="Chrome Step 4" className="install-guide-img" />
            <p className="install-guide-label">Confirm Install</p>
          </div>
        </div>
      </div>

      {/* Seventh page (How to Install3)- Section 6 */}
      <div className="landing-section install-section" data-section="6">
        <div className="section-gradient"></div>
        <p className="install-guide-title">How to install - Samsung Internet</p>
        <div className="install-guide-row samsung-internet-row">
          <div className="install-guide-item">
            <img src={si1} alt="Samsung Internet Step 1" className="install-guide-img" />
            <p className="install-guide-label">Open menu</p>
          </div>
          <span className="install-guide-arrow">→</span>
          <div className="install-guide-item">
            <img src={si2} alt="Samsung Internet Step 2" className="install-guide-img" />
            <p className="install-guide-label">Tap Add to</p>
          </div>
          <span className="install-guide-arrow">→</span>
          <div className="install-guide-item">
            <img src={si3} alt="Samsung Internet Step 3" className="install-guide-img" />
            <p className="install-guide-label">Install as web app</p>
          </div>
          <span className="install-guide-arrow">→</span>
          <div className="install-guide-item">
            <img src={si4} alt="Samsung Internet Step 4" className="install-guide-img" />
            <p className="install-guide-label">Confirm Add</p>
          </div>
        </div>
      </div>

      {/* Last page (Team) - Section 7 */}
      <div className="landing-section team-section" data-section="7">
        <p className="section-heading team-heading">ASU Student Dev Team</p>
        <p className="section-subtitle">We create a better campus experience together</p>
        <div className="team-info">
          <p className="team-member-name">Shin Park</p>
          <p className="team-member-email">spark43@angelo.edu</p>
          <p className="team-member-name">&nbsp;</p>
          <p className="team-member-name">Dohyeong Kwon</p>
          <p className="team-member-email">dkwon1@angelo.edu</p>
          <p className="team-member-name">&nbsp;</p>
          <p className="team-member-name">Yoona Nam</p>
          <p className="team-member-email">ynam3@angelo.edu</p>
        </div>
        <a className="social-icon instagram-icon" href="https://www.instagram.com/asuhours/?next=%2F" target="_blank" rel="noopener noreferrer">
          <img src={instagram_icon_team_page} alt="Instagram" />
        </a>
        <a className="social-icon youtube-icon" href="https://www.youtube.com/channel/UCi5WsmDEHtfI6_BeSipnKrg" target="_blank" rel="noopener noreferrer">
          <img src={youtube_icon_team_page} alt="YouTube" />
        </a>
        <a className="social-icon email-icon" href="mailto:asuhours@gmail.com">
          <img src={envelope_icon_team_page} alt="Email" />
        </a>
        </div>
    </div>
  );
};

export default Landing;
