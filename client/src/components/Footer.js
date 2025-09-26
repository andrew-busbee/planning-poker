import React from 'react';
import ConnectionIndicator from './ConnectionIndicator';

const Footer = ({ connection }) => {
  const currentYear = new Date().getFullYear();
  const copyrightYear = currentYear === 2025 ? '2025' : `2025-${currentYear}`;
  
  return (
    <footer className="app-footer">
      <div className="footer-content">
        <div className="footer-left">
          <div className="app-title">
            Planning Poker <a 
              href="https://github.com/andrew-busbee/planning-poker/releases/tag/v1.2.2" 
              target="_blank" 
              rel="noopener noreferrer"
              className="version-link"
            >
              v1.2.2
            </a>
          </div>
        </div>
        <div className="footer-center">
          {connection && <ConnectionIndicator connection={connection} />}
        </div>
        <div className="footer-right">
          <div className="copyright">
            © {copyrightYear}&nbsp;<a href="https://go2wna.com" target="_blank" rel="noopener noreferrer">Andrew Busbee</a>. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;