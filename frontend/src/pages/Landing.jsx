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
import asuHoursLogo from '../assets/images/logo_1.png';

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
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const [isTabletOrBelow, setIsTabletOrBelow] = useState(() => window.innerWidth <= 1024);
  const [safariActiveStep, setSafariActiveStep] = useState(0);
  const [chromeActiveStep, setChromeActiveStep] = useState(0);
  const [samsungActiveStep, setSamsungActiveStep] = useState(0);
  const containerRef = useRef(null);
  const safariCarouselRef = useRef(null);
  const chromeCarouselRef = useRef(null);
  const samsungCarouselRef = useRef(null);
  const safariSectionIndex = isTabletOrBelow ? 3 : 4;
  const chromeSectionIndex = isTabletOrBelow ? 4 : 5;
  const samsungSectionIndex = isTabletOrBelow ? 5 : 6;
  const teamSectionIndex = isTabletOrBelow ? 6 : 7;
  const shouldHideSectionTitle =
    isTabletOrBelow &&
    [1, 2, safariSectionIndex, chromeSectionIndex, samsungSectionIndex].includes(currentSection);
  const sectionNames = isTabletOrBelow
    ? ['Home', 'About', 'Quick+Up-to-Date', 'Safari', 'Chrome', 'Samsung', 'Team']
    : ['Home', 'About', 'Quick Access', 'Up-to-Date', 'Safari', 'Chrome', 'Samsung', 'Team'];
  const mobileDrawerItems = [
    { label: 'Home', index: 0 },
    { label: 'About', index: 1 },
    { label: 'Safari', index: safariSectionIndex },
    { label: 'Chrome', index: chromeSectionIndex },
    { label: 'Samsung', index: samsungSectionIndex },
    { label: 'Team', index: teamSectionIndex }
  ];
  const totalSections = sectionNames.length;
  const safariOnboardingSteps = [
    { image: safari1, label: 'Tap share icon', stepTitle: 'Step 1', isIndented: true },
    { image: safari2, label: 'Add to Home Screen', stepTitle: 'Step 2', isIndented: true },
    { image: safari3, label: 'Tap Add', stepTitle: 'Step 3', isIndented: true }
  ];
  const chromeOnboardingSteps = [
    { image: chrome1, label: 'Tap menu icon', stepTitle: 'Step 1', isIndented: true },
    { image: chrome2, label: 'Add to Home Screen', stepTitle: 'Step 2', isIndented: true },
    { image: chrome3, label: 'Tap Install', stepTitle: 'Step 3', isIndented: true },
    { image: chrome4, label: 'Confirm Install', stepTitle: 'Step 4', isIndented: true }
  ];
  const samsungOnboardingSteps = [
    { image: si1, label: 'Open menu', stepTitle: 'Step 1', isIndented: true },
    { image: si2, label: 'Tap Add to', stepTitle: 'Step 2', isIndented: true },
    { image: si3, label: 'Install as web app', stepTitle: 'Step 3', isIndented: true },
    { image: si4, label: 'Confirm Add', stepTitle: 'Step 4', isIndented: true }
  ];
  const safariOnboardingPages = [
    safariOnboardingSteps.slice(0, 2),
    safariOnboardingSteps.slice(2)
  ];
  const chromeOnboardingPages = [
    chromeOnboardingSteps.slice(0, 2),
    chromeOnboardingSteps.slice(2, 4)
  ];
  const samsungOnboardingPages = [
    samsungOnboardingSteps.slice(0, 2),
    samsungOnboardingSteps.slice(2, 4)
  ];

  useEffect(() => {
    const handleResize = () => {
      setIsTabletOrBelow(window.innerWidth <= 1024);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (currentSection >= totalSections) {
      setCurrentSection(totalSections - 1);
    }
  }, [currentSection, totalSections]);

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
  }, [currentSection, isScrolling, scrollToSection, totalSections]);

  // Keep currentSection synced when user scrolls manually
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let rafId = null;
    const handleScroll = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        const sections = Array.from(container.querySelectorAll('[data-section]'));
        if (!sections.length) return;

        const scrollTop = container.scrollTop;
        let nearestIndex = currentSection;
        let minDistance = Number.POSITIVE_INFINITY;

        sections.forEach((section) => {
          const index = Number(section.getAttribute('data-section'));
          const distance = Math.abs(section.offsetTop - scrollTop);
          if (distance < minDistance) {
            minDistance = distance;
            nearestIndex = index;
          }
        });

        if (nearestIndex !== currentSection) {
          setCurrentSection(nearestIndex);
        }
      });
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [currentSection]);

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
  }, [currentSection, isScrolling, scrollToSection, totalSections]);

  // Navigate to next section
  const goToNextSection = () => {
    if (currentSection < totalSections - 1) {
      scrollToSection(currentSection + 1);
    }
  };

  const goToPreviousSection = () => {
    if (currentSection > 0) {
      scrollToSection(currentSection - 1);
    }
  };

  const handleChromeCarouselScroll = useCallback(() => {
    const carousel = chromeCarouselRef.current;
    if (!carousel) return;
    const stepWidth = carousel.clientWidth;
    if (!stepWidth) return;

    const nextStep = Math.round(carousel.scrollLeft / stepWidth);
    const boundedStep = Math.max(0, Math.min(chromeOnboardingPages.length - 1, nextStep));
    setChromeActiveStep(boundedStep);
  }, [chromeOnboardingPages.length]);

  const scrollToChromeStep = useCallback((stepIndex) => {
    const carousel = chromeCarouselRef.current;
    if (!carousel) return;

    carousel.scrollTo({
      left: stepIndex * carousel.clientWidth,
      behavior: 'smooth'
    });
    setChromeActiveStep(stepIndex);
  }, []);

  const handleSafariCarouselScroll = useCallback(() => {
    const carousel = safariCarouselRef.current;
    if (!carousel) return;
    const stepWidth = carousel.clientWidth;
    if (!stepWidth) return;

    const nextStep = Math.round(carousel.scrollLeft / stepWidth);
    const boundedStep = Math.max(0, Math.min(safariOnboardingPages.length - 1, nextStep));
    setSafariActiveStep(boundedStep);
  }, [safariOnboardingPages.length]);

  const scrollToSafariStep = useCallback((stepIndex) => {
    const carousel = safariCarouselRef.current;
    if (!carousel) return;

    carousel.scrollTo({
      left: stepIndex * carousel.clientWidth,
      behavior: 'smooth'
    });
    setSafariActiveStep(stepIndex);
  }, []);

  const handleSamsungCarouselScroll = useCallback(() => {
    const carousel = samsungCarouselRef.current;
    if (!carousel) return;
    const stepWidth = carousel.clientWidth;
    if (!stepWidth) return;

    const nextStep = Math.round(carousel.scrollLeft / stepWidth);
    const boundedStep = Math.max(0, Math.min(samsungOnboardingPages.length - 1, nextStep));
    setSamsungActiveStep(boundedStep);
  }, [samsungOnboardingPages.length]);

  const scrollToSamsungStep = useCallback((stepIndex) => {
    const carousel = samsungCarouselRef.current;
    if (!carousel) return;

    carousel.scrollTo({
      left: stepIndex * carousel.clientWidth,
      behavior: 'smooth'
    });
    setSamsungActiveStep(stepIndex);
  }, []);

  return (
    <div className="landing-container" ref={containerRef}>
      {/* Navigation Indicators - Hidden on first section */}
      {currentSection !== 0 && (
      <div 
        className={`fixed-scroll-indicator ${currentSection === teamSectionIndex ? 'dark-section' : 'light-section'}`}
        onMouseEnter={() => setIsMenuVisible(true)}
        onMouseLeave={() => setIsMenuVisible(false)}
      >
        {/* Section names menu */}
        <div className={`section-names-menu ${isMenuVisible ? 'visible' : ''}`}>
          {sectionNames.map((name, i) => (
            <button
              key={i}
              className={`section-name-item ${currentSection === i ? 'active' : ''}`}
              onClick={() => scrollToSection(i)}
            >
              {name}
            </button>
          ))}
        </div>
        <div className="scroll-dots-container">
          {[...Array(totalSections)].map((_, i) => (
            <button
              key={i}
              className={`fixed-scroll-dot ${currentSection === i ? 'active' : ''}`}
              onClick={() => scrollToSection(i)}
              aria-label={`Go to ${sectionNames[i]}`}
            ></button>
          ))}
        </div>
      </div>
      )}

      {/* Hamburger menu - iPad and smaller only, always visible */}
      <div className="hamburger-nav">
        <button
          className={`hamburger-btn ${currentSection === 0 || currentSection === teamSectionIndex ? 'hamburger-dark' : 'hamburger-light'}`}
          onClick={() => setIsMenuVisible(!isMenuVisible)}
          aria-label="Toggle navigation menu"
        >
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
          <span className="hamburger-line"></span>
        </button>
        <div
          className={`hamburger-backdrop ${isMenuVisible ? 'visible' : ''}`}
          onClick={() => setIsMenuVisible(false)}
        ></div>
        <div className={`hamburger-menu ${isMenuVisible ? 'visible' : ''}`}>
          <p className="hamburger-menu-title">ASU Hours</p>
          {mobileDrawerItems.map((item) => (
            <button
              key={item.label}
              className={`section-name-item ${currentSection === item.index ? 'active' : ''}`}
              onClick={() => { scrollToSection(item.index); setIsMenuVisible(false); }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

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

      {/* Up Arrow Button - only on install pages */}
      {isTabletOrBelow && [safariSectionIndex, chromeSectionIndex, samsungSectionIndex].includes(currentSection) && (
        <button
          className={`fixed-up-arrow ${currentSection === teamSectionIndex ? 'white-arrow' : 'gray-arrow'}`}
          onClick={goToPreviousSection}
          aria-label="Scroll to previous section"
        >
          <img src={currentSection === teamSectionIndex ? white_arrow_icon : gray_arrow_icon} alt="Scroll up" />
        </button>
      )}

      {/* ASU Hours Title */}
      {!shouldHideSectionTitle && (
        <p className={`section-title ${currentSection === 0 ? 'main-hero-title' : ''} ${currentSection === teamSectionIndex ? 'team-title' : ''}`}>
          ASU Hours
        </p>
      )}

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
          <p>
            {isTabletOrBelow ? (
              'Operating Hours'
            ) : (
              <>
                Real-Time<br className="hero-heading-desktop-br" /> Operating Hours
              </>
            )}
          </p>
          <p>For ASU Facilities</p>
        </div>
        <img className="hero-icon" src={imgQrCode} alt="QR Code" />
        <div className="hero-feature-text">
          <p>Anytime, Anywhere</p>
          <p>{isTabletOrBelow ? 'Access with Your Mobile Device' : 'Access with Mobile Device'}</p>
        </div>
        <div className="hero-download-actions">
          <button type="button" className="hero-download-btn hero-download-btn-app" aria-label="ASU Hours App">
            <img className="hero-download-app-logo" src={asuHoursLogo} alt="" aria-hidden="true" />
            <span className="hero-download-app-text">ASU Hours</span>
          </button>
          <button type="button" className="hero-download-btn hero-download-btn-qr" aria-label="Show QR">
            <img src={imgQrCode} alt="QR" />
          </button>
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
          <p>Our solution for the inconvenience</p>
          <p>of checking facility operating hours</p>
          <p>across campus</p>
            </div>
    </div>

      {/* Third page (Information2) - Section 2 */}
      <div className={`landing-section ${isTabletOrBelow ? 'combined-info-section' : ''}`} data-section="2">
        <div className="section-gradient"></div>
        {isTabletOrBelow ? (
          <div className="combined-info-content">
            <div className="combined-info-block">
              <p className="combined-info-heading">Quick Mobile Access</p>
              <div className="combined-info-description">
                <p>Students and faculty can check</p>
                <p>essential information instantly from</p>
                <p>their phones without repeating searches.</p>
              </div>
            </div>
            <div className="combined-info-block">
              <p className="combined-info-heading">Up-to-Date Information</p>
              <div className="combined-info-description">
                <p>Operating hours and schedules are</p>
                <p>automatically updated every day,</p>
                <p>ensuring accuracy without manual checks.</p>
              </div>
            </div>
          </div>
        ) : (
          <>
            <p className="section-heading">Quick Mobile Access</p>
            <div className="section-description">
              <p>Students and faculty</p>
              <p>can check essential information <span className="section2-ipad-br"></span><span className="section2-line2">instantly <br className="section2-desktop-br" />from their phones</span></p>
              <p>without repeating searches.</p>
            </div>
          </>
        )}
      </div>

      {!isTabletOrBelow && (
      <div className="landing-section" data-section="3">
        <div className="section-gradient"></div>
        <p className="section-heading">Up-to-Date Information</p>
        <div className="section-description">
          <p>Operating hours and schedules</p>
          <p>are automatically updated every day,</p>
          <p>ensuring accuracy without manual checks.</p>
        </div>
      </div>
      )}

      {/* Fifth page (How to Install1)- Section 4 */}
      <div className="landing-section install-section onboarding-install-section safari-install-section" data-section={safariSectionIndex}>
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
        <div className="chrome-onboarding-wrapper" aria-label="Safari installation onboarding cards">
          <article className="chrome-onboarding-card">
            <div
              className="chrome-onboarding-carousel"
              ref={safariCarouselRef}
              onScroll={handleSafariCarouselScroll}
            >
              {safariOnboardingPages.map((pageSteps, pageIndex) => (
                <div className="chrome-onboarding-slide" key={`safari-page-${pageIndex}`}>
                  <div className={`chrome-onboarding-pair ${pageSteps.length === 1 ? 'is-single' : ''}`}>
                    {pageSteps.map((step, stepIndex) => (
                      <div className="chrome-onboarding-panel" key={step.label}>
                        <div className="chrome-onboarding-media">
                          <img
                            src={step.image}
                            alt={`Safari onboarding step ${pageIndex * 2 + stepIndex + 1}`}
                            className="chrome-onboarding-image"
                          />
                        </div>
                        <div className="chrome-onboarding-text-block">
                          {step.stepTitle && (
                            <p className="chrome-onboarding-step-title">{step.stepTitle}</p>
                          )}
                          <p className={`chrome-onboarding-text ${step.isIndented ? 'is-indented' : ''}`}>
                            {step.label}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {pageIndex < safariOnboardingPages.length - 1 && (
                    <span className="chrome-onboarding-boundary-arrow" aria-hidden="true">→</span>
                  )}
                </div>
              ))}
            </div>
            <div className="chrome-onboarding-dots">
              <button
                type="button"
                className={`chrome-onboarding-dot ${safariActiveStep === 0 ? 'is-active' : ''}`}
                onClick={() => scrollToSafariStep(0)}
                aria-label="Show Safari Step 1 and Step 2"
              ></button>
              <button
                type="button"
                className={`chrome-onboarding-dot ${safariActiveStep === 1 ? 'is-active' : ''}`}
                onClick={() => scrollToSafariStep(1)}
                aria-label="Show Safari Step 3"
              ></button>
            </div>
          </article>
        </div>
      </div>

      {/* Sixth page (How to Install2)- Section 5 */}
      <div className="landing-section install-section onboarding-install-section chrome-install-section" data-section={chromeSectionIndex}>
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
        <div className="chrome-onboarding-wrapper" aria-label="Chrome installation onboarding cards">
          <article className="chrome-onboarding-card">
            <div
              className="chrome-onboarding-carousel"
              ref={chromeCarouselRef}
              onScroll={handleChromeCarouselScroll}
            >
              {chromeOnboardingPages.map((pageSteps, pageIndex) => (
                <div className="chrome-onboarding-slide" key={`chrome-page-${pageIndex}`}>
                  <div className={`chrome-onboarding-pair ${pageSteps.length === 1 ? 'is-single' : ''}`}>
                    {pageSteps.map((step, stepIndex) => (
                      <div className="chrome-onboarding-panel" key={step.label}>
                        <div className="chrome-onboarding-media">
                          <img
                            src={step.image}
                            alt={`Chrome onboarding step ${pageIndex * 2 + stepIndex + 1}`}
                            className="chrome-onboarding-image"
                          />
                        </div>
                        <div className="chrome-onboarding-text-block">
                          {step.stepTitle && (
                            <p className="chrome-onboarding-step-title">{step.stepTitle}</p>
                          )}
                          <p className={`chrome-onboarding-text ${step.isIndented ? 'is-indented' : ''}`}>
                            {step.label}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {pageIndex < chromeOnboardingPages.length - 1 && (
                    <span className="chrome-onboarding-boundary-arrow" aria-hidden="true">→</span>
                  )}
                </div>
              ))}
            </div>
            <div className="chrome-onboarding-dots">
              <button
                type="button"
                className={`chrome-onboarding-dot ${chromeActiveStep === 0 ? 'is-active' : ''}`}
                onClick={() => scrollToChromeStep(0)}
                aria-label="Show Step 1 and Step 2"
              ></button>
              <button
                type="button"
                className={`chrome-onboarding-dot ${chromeActiveStep === 1 ? 'is-active' : ''}`}
                onClick={() => scrollToChromeStep(1)}
                aria-label="Show Step 3 and Step 4"
              ></button>
            </div>
          </article>
        </div>
      </div>

      {/* Seventh page (How to Install3)- Section 6 */}
      <div className="landing-section install-section onboarding-install-section samsung-install-section" data-section={samsungSectionIndex}>
        <div className="section-gradient"></div>
        <p className="install-guide-title">How to install - Samsung<span className="samsung-title-internet"> Internet</span></p>
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
        <div className="chrome-onboarding-wrapper" aria-label="Samsung installation onboarding cards">
          <article className="chrome-onboarding-card">
            <div
              className="chrome-onboarding-carousel"
              ref={samsungCarouselRef}
              onScroll={handleSamsungCarouselScroll}
            >
              {samsungOnboardingPages.map((pageSteps, pageIndex) => (
                <div className="chrome-onboarding-slide" key={`samsung-page-${pageIndex}`}>
                  <div className={`chrome-onboarding-pair ${pageSteps.length === 1 ? 'is-single' : ''}`}>
                    {pageSteps.map((step, stepIndex) => (
                      <div className="chrome-onboarding-panel" key={step.label}>
                        <div className="chrome-onboarding-media">
                          <img
                            src={step.image}
                            alt={`Samsung onboarding step ${pageIndex * 2 + stepIndex + 1}`}
                            className="chrome-onboarding-image"
                          />
                        </div>
                        <div className="chrome-onboarding-text-block">
                          {step.stepTitle && (
                            <p className="chrome-onboarding-step-title">{step.stepTitle}</p>
                          )}
                          <p className={`chrome-onboarding-text ${step.isIndented ? 'is-indented' : ''}`}>
                            {step.label}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {pageIndex < samsungOnboardingPages.length - 1 && (
                    <span className="chrome-onboarding-boundary-arrow" aria-hidden="true">→</span>
                  )}
                </div>
              ))}
            </div>
            <div className="chrome-onboarding-dots">
              <button
                type="button"
                className={`chrome-onboarding-dot ${samsungActiveStep === 0 ? 'is-active' : ''}`}
                onClick={() => scrollToSamsungStep(0)}
                aria-label="Show Samsung Step 1 and Step 2"
              ></button>
              <button
                type="button"
                className={`chrome-onboarding-dot ${samsungActiveStep === 1 ? 'is-active' : ''}`}
                onClick={() => scrollToSamsungStep(1)}
                aria-label="Show Samsung Step 3 and Step 4"
              ></button>
            </div>
          </article>
        </div>
      </div>

      {/* Last page (Team) - Section 7 */}
      <div className="landing-section team-section" data-section={teamSectionIndex}>
        <p className="section-heading team-heading">ASU Student Dev Team</p>
        <p className="section-subtitle">We create a better campus experience together</p>
        <div className="team-info">
          <div className="team-column team-column-1">
            <div className="team-member">
              <p className="team-member-name">Shin Park</p>
              <p className="team-member-email">spark43@angelo.edu</p>
            </div>
            <div className="team-member">
              <p className="team-member-name">Dohyeong Kwon</p>
              <p className="team-member-email">dkwon1@angelo.edu</p>
            </div>
            <div className="team-member">
              <p className="team-member-name">Bumjun Ko</p>
              <p className="team-member-email">bko@angelo.edu</p>
            </div>
          </div>
          <div className="team-column team-column-2">
            <div className="team-member">
              <p className="team-member-name">Jane Ha</p>
              <p className="team-member-email">jane.ha44@gmail.com</p>
            </div>
            <div className="team-member">
              <p className="team-member-name">Yoona Nam</p>
              <p className="team-member-email">ynam3@angelo.edu</p>
            </div>
          </div>
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
