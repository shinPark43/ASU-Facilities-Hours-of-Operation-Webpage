import React from 'react';

const About = () => {
  return (
    <div>
      <h2 className="section-panel-header">About This Page</h2>
      <p className="section-subtitle">
        Information about ASU Facilities Hours and how to contribute
      </p>
      
      <div className="facility-section">
        <h3 className="facility-name">Purpose</h3>
        <div style={{ lineHeight: '1.8', fontSize: '16px', color: 'var(--text-secondary)' }}>
          <p style={{ marginBottom: '24px' }}>
            This website provides students, faculty, and staff with easy access to the operating hours 
            of Angelo State University facilities. Our goal is to help the ASU community plan their 
            campus activities by having current, reliable information about when facilities are open.
          </p>
          
          <p style={{ marginBottom: '24px' }}>
            Currently, we provide hours for:
          </p>
          
          <ul style={{ 
            marginBottom: '32px', 
            paddingLeft: '24px',
            listStyle: 'none'
          }}>
            <li style={{ 
              marginBottom: '12px',
              position: 'relative',
              paddingLeft: '20px'
            }}>
              <span style={{ 
                position: 'absolute',
                left: '0',
                color: 'var(--asu-gold)',
                fontWeight: 'bold'
              }}>•</span>
              <strong>Porter Henderson Library</strong> - Study spaces, research resources, and IT support
            </li>
            <li style={{ 
              marginBottom: '12px',
              position: 'relative',
              paddingLeft: '20px'
            }}>
              <span style={{ 
                position: 'absolute',
                left: '0',
                color: 'var(--asu-gold)',
                fontWeight: 'bold'
              }}>•</span>
              <strong>Recreation Center</strong> - Fitness facilities, pool, climbing gym, and sports
            </li>
            <li style={{ 
              marginBottom: '12px',
              position: 'relative',
              paddingLeft: '20px'
            }}>
              <span style={{ 
                position: 'absolute',
                left: '0',
                color: 'var(--asu-gold)',
                fontWeight: 'bold'
              }}>•</span>
              <strong>Dining Locations</strong> - Campus restaurants, cafes, and food courts
            </li>
            <li style={{ 
              marginBottom: '12px',
              position: 'relative',
              paddingLeft: '20px'
            }}>
              <span style={{ 
                position: 'absolute',
                left: '0',
                color: 'var(--asu-gold)',
                fontWeight: 'bold'
              }}>•</span>
              <strong>Ram Tram</strong> - Campus transportation schedule and stop locations
            </li>
          </ul>
        </div>
      </div>

      <div className="facility-section">
        <h3 className="facility-name">Add New Facilities</h3>
        <div style={{ lineHeight: '1.8', fontSize: '16px', color: 'var(--text-secondary)' }}>
          <p style={{ marginBottom: '24px' }}>
            Would you like to see hours for additional ASU facilities? We're always looking to expand 
            our coverage to better serve the campus community.
          </p>
          
          <p style={{ marginBottom: '24px' }}>
            If you manage a campus facility or would like to request that we add hours for a specific 
            location, please send us an email with the following information:
          </p>
          
          <ul style={{ 
            marginBottom: '32px', 
            paddingLeft: '24px',
            listStyle: 'none'
          }}>
            <li style={{ 
              marginBottom: '12px',
              position: 'relative',
              paddingLeft: '20px'
            }}>
              <span style={{ 
                position: 'absolute',
                left: '0',
                color: 'var(--asu-blue)',
                fontWeight: 'bold'
              }}>•</span>
              Facility name
            </li>
            <li style={{ 
              marginBottom: '12px',
              position: 'relative',
              paddingLeft: '20px'
            }}>
              <span style={{ 
                position: 'absolute',
                left: '0',
                color: 'var(--asu-blue)',
                fontWeight: 'bold'
              }}>•</span>
              Location on campus
            </li>
          </ul>
        </div>
        
        <div style={{ 
          background: 'var(--bg-tertiary)', 
          padding: '20px 24px', 
          borderRadius: '12px',
          border: '1px solid var(--border-light)',
          textAlign: 'center'
        }}>
          <p style={{ 
            marginBottom: '12px', 
            fontSize: '16px', 
            color: 'var(--text-primary)',
            fontWeight: '500'
          }}>
            Send your facility request to:
          </p>
          <p style={{ 
            fontSize: '18px', 
            fontWeight: '600', 
            color: 'var(--asu-blue)',
            fontFamily: 'monospace',
            letterSpacing: '0.5px'
          }}>
            spark43@angelo.edu
          </p>
        </div>
      </div>

      <div className="facility-section">
        <h3 className="facility-name">Privacy</h3>
        <div style={{ lineHeight: '1.8', fontSize: '16px', color: 'var(--text-secondary)' }}>
          <p style={{ marginBottom: '24px' }}>
            This website uses Google Analytics to collect anonymous usage data (page visits, user interactions) 
            to help us improve the site. No personal information is collected.
          </p>
          
          <p style={{ marginBottom: '0' }}>
            Learn more at{' '}
            <a 
              href="https://policies.google.com/privacy" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ color: 'var(--asu-blue)', textDecoration: 'underline' }}
            >
              Google Privacy Policy
            </a>.
          </p>
        </div>
      </div>
      
      <div className="hours-info">
        This website is maintained by ASU students to help our campus community 
        stay informed about facility availability.
      </div>
    </div>
  );
};

export default About; 