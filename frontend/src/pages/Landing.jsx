import React, { useState, useEffect, useRef } from 'react';
import '../styles/Landing.css';

// Local image assets
import backgroundImage from '../assets/images/ASU.jpg';
import imgQrCode from '../assets/images/qr-code.png';
import apllicationImage1 from '../assets/images/phone_view1.png';
import apllicationImage2 from '../assets/images/phone_view2.png';
import instagram_icon_team_page from '../assets/images/instagram_icon_team_page.svg';
import youtube_icon_team_page from '../assets/images/youtube_icon_team_page.svg';
import envelope_icon_team_page from '../assets/images/email_icon_team_page.svg';

// Image assets from Figma (Updated)

const white_arrow_icon = "https://www.figma.com/api/mcp/asset/58946e94-5dfb-4207-a711-c48121944086";
// const youtube_icon = "https://www.figma.com/api/mcp/asset/cc96215d-1ccc-4d46-be86-d155305e5950";
// const instagram_icon = "https://www.figma.com/api/mcp/asset/8d46e32d-bd23-4ec4-a0e2-db15776e9d47";
const gray_arrow_icon = "https://www.figma.com/api/mcp/asset/c9a1bfdf-6922-4ef2-82e1-45292c794760";

const Landing = () => {
  const [currentSection, setCurrentSection] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const containerRef = useRef(null);
  const totalSections = 7;

  // Scroll to specific section
  const scrollToSection = (sectionIndex) => {
    if (isScrolling) return;
    
    setIsScrolling(true);
    setCurrentSection(sectionIndex);
    
    const section = document.querySelector(`[data-section="${sectionIndex}"]`);
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    
    setTimeout(() => {
      setIsScrolling(false);
    }, 1000);
  };

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
  }, [currentSection, isScrolling]);

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
  }, [currentSection, isScrolling]);

  // Navigate to next section
  const goToNextSection = () => {
    if (currentSection < totalSections - 1) {
      scrollToSection(currentSection + 1);
    }
  };

  return (
    <div className="landing-container" ref={containerRef}>
      {/* Fixed Navigation Indicators - Hidden on first section */}
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

      {/* Fixed Down Arrow Button */}
      {currentSection < totalSections - 1 && (
        <button 
          className={`fixed-down-arrow ${currentSection === 0 ? 'white-arrow' : 'gray-arrow'}`}
          onClick={goToNextSection}
          aria-label="Scroll to next section"
        >
          <img src={currentSection === 0 ? white_arrow_icon : gray_arrow_icon} alt="Scroll down" />
        </button>
      )}

      {/* Fixed ASU Hours Title */}
      <p className={`section-title ${currentSection === 0 ? 'main-hero-title' : ''} ${currentSection === 6 ? 'team-title' : ''}`}>
        ASU Hours
      </p>

      {/* Main Hero Section with Image - Section 0 (First) */}
      <div className="landing-section main-hero-section" data-section="0">
        <img className="hero-background-image" src={backgroundImage} alt="ASU Campus" />
        <div className="hero-overlay"></div>
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

      {/* Hero Section - Section 1 */}
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
        {/* <div className="decorative-icons">
          <a href="https://www.instagram.com/asuhours/?next=%2F" target="_blank" rel="noopener noreferrer" className="icon-link icon-phone-1">
            <img src={youtube_icon} alt="Phone icon" />
          </a>
          <a href="https://www.youtube.com/channel/UCi5WsmDEHtfI6_BeSipnKrg" target="_blank" rel="noopener noreferrer" className="icon-link icon-phone-2">
            <img src={instagram_icon} alt="Phone icon" />
          </a>
        </div> */}
    </div>

      {/* Centralized Platform Section - Section 2 */}
      <div className="landing-section platform-section" data-section="2">
        <div className="section-gradient"></div>
        <p className="section-heading">Centralized Platform</p>
        <div className="section-description">
          <p>Combines</p>
          <p>the most frequently used<br aria-hidden="true" />campus facilities and services</p>
          <p>into a single, easy-to-use application.</p>
        </div>
        {/* <div className="decorative-icons">
          <a href="https://www.instagram.com/asuhours/?next=%2F" target="_blank" rel="noopener noreferrer" className="icon-link icon-phone-1">
            <img src={youtube_icon} alt="Phone icon" />
          </a>
          <a href="https://www.youtube.com/channel/UCi5WsmDEHtfI6_BeSipnKrg" target="_blank" rel="noopener noreferrer" className="icon-link icon-phone-2">
            <img src={instagram_icon} alt="Phone icon" />
          </a>
        </div> */}
      </div>

      {/* Quick Mobile Access Section - Section 3 */}
      <div className="landing-section mobile-section" data-section="3">
        <div className="section-gradient"></div>
        <p className="section-heading">Quick Mobile Access</p>
        <div className="section-description">
          <p>Students and faculty</p>
          <p>can check essential information instantly</p>
          <p>from their phones</p>
          <p>without repeating searches.</p>
        </div>
        {/* <div className="decorative-icons">
          <a href="https://www.instagram.com/asuhours/?next=%2F" target="_blank" rel="noopener noreferrer" className="icon-link icon-phone-1">
            <img src={youtube_icon} alt="Phone icon" />
          </a>
          <a href="https://www.youtube.com/channel/UCi5WsmDEHtfI6_BeSipnKrg" target="_blank" rel="noopener noreferrer" className="icon-link icon-phone-2">
            <img src={instagram_icon} alt="Phone icon" />
          </a>
        </div> */}
      </div>

      {/* Up-to-Date Information Section - Section 4 */}
      <div className="landing-section info-section" data-section="4">
        <div className="section-gradient"></div>
        <p className="section-heading">Up-to-Date Information</p>
        <div className="section-description">
          <p>Operating hours and schedules</p>
          <p>are automatically updated every day,</p>
          <p>ensuring accuracy without manual checks.</p>
        </div>
        {/* <div className="decorative-icons">
          <a href="https://www.instagram.com/asuhours/?next=%2F" target="_blank" rel="noopener noreferrer" className="icon-link icon-phone-1">
            <img src={youtube_icon} alt="Phone icon" />
          </a>
          <a href="https://www.youtube.com/channel/UCi5WsmDEHtfI6_BeSipnKrg" target="_blank" rel="noopener noreferrer" className="icon-link icon-phone-2">
            <img src={instagram_icon} alt="Phone icon" />
          </a>
        </div> */}
    </div>

      {/* Comprehensive Services Section - Section 5 */}
      <div className="landing-section services-section" data-section="5">
        <div className="section-gradient"></div>
        <p className="section-heading">Comprehensive Services</p>
        <div className="section-description">
          <p>Includes library hours, recreation facilities</p>
          <p>(gym, pool, climbing wall, Lake House),</p>
          <p>dining options (CAF, Chick-fil-A, Subway, Starbucks, etc.), and Ram Tram schedules.</p>
        </div>
        {/* <div className="decorative-icons">
          <a href="https://www.instagram.com/asuhours/?next=%2F" target="_blank" rel="noopener noreferrer" className="icon-link icon-phone-1">
            <img src={youtube_icon} alt="Phone icon" />
          </a>
          <a href="https://www.youtube.com/channel/UCi5WsmDEHtfI6_BeSipnKrg" target="_blank" rel="noopener noreferrer" className="icon-link icon-phone-2">
            <img src={instagram_icon} alt="Phone icon" />
          </a>
        </div> */}
      </div>

      {/* Team Section - Section 6 (Last) */}
      <div className="landing-section team-section" data-section="6">
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
