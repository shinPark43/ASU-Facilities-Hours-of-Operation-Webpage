import React from 'react';
import '../styles/HowToInstall.css';

const HowToInstall = () => {
  return (
    <div>
      <div className="page-header">
        <h2 className="section-panel-header">How to Install ASU Hours</h2>
        <p className="section-subtitle">
          Install this app on your mobile device for quick access to facility hours
        </p>
      </div>

      <div className="install-card">
        <div className="install-page-content">
            <h3 className="facility-name">Mobile Installation Instructions</h3>

            <div className="install-platforms">
              <div className="platform-section">
                <h4 className="platform-title">For iOS (iPhone/iPad):</h4>
                <ol className="install-steps">
                  <li>
                    <strong>Scan the QR code</strong>: Use your phone's camera to scan the QR code below to access ASU Hours page (skip this step if you're already viewing this on your phone)
                  </li>
                  <li>
                    <strong>Tap the Share button</strong>: Locate and tap the Share button (square with an arrow) at the bottom of the screen
                  </li>
                  <li>
                    <strong>Add to Home Screen</strong>: Scroll down and tap "Add to Home Screen"
                  </li>
                </ol>
              </div>

              <div className="platform-section">
                <h4 className="platform-title">For Android:</h4>
                <ol className="install-steps">
                  <li>
                    <strong>Scan the QR code</strong>: Use your phone's camera to scan the QR code below to access ASU Hours page (skip this step if you're already viewing this on your phone)
                  </li>
                  <li>
                    <strong>Access the menu</strong>: Tap the three dots (or three lines) in the top right corner of the browser
                  </li>
                  <li>
                    <strong>Add to Home screen</strong>: Select "Add to Home Screen" from the menu (Chrome browser recommended)
                  </li>
                </ol>
              </div>
            </div>


            {/* QR Code Section */}
            <div className="qr-code-container">
              <div className="qr-code-wrapper">
                <img 
                  src="/ASU-Facilities-Hours-of-Operation-Webpage/images/qr-code.png" 
                  alt="QR Code to access ASU Hours website" 
                  className="qr-code-image"
                />
              </div>
              <p className="qr-code-instructions">
                <strong>Scan the QR code to get started</strong>
              </p>
            </div>
          </div>
        </div>

      <div className="hours-info">
        <strong>Need help?</strong> If you're having trouble installing the app, try refreshing 
        the page or contact me at spark43@angelo.edu for assistance.
      </div>

    </div>
  );
};

export default HowToInstall;
