import { Link } from 'react-router-dom';
import { useLanguage } from '../state/LanguageContext.jsx';

export function Footer() {
  const { lang } = useLanguage();

  const isEn = lang === 'en';

  return (
    <footer className="main-footer">
      <div className="footer-top-accent" />
      <div className="footer-container">
        <div className="footer-grid">
          {/* Brand & Overview Column */}
          <div className="footer-col footer-col--brand">
            <div className="footer-brand">
              <div className="footer-logo-icon">
                <svg width="32" height="32" viewBox="0 0 36 36" aria-hidden="true">
                  <rect width="36" height="36" rx="9" fill="#F2A878" />
                  <text x="17" y="25" textAnchor="middle" fontFamily="var(--head)" fontSize="19" fontWeight="800" fill="#221F1C">ফ</text>
                  <circle cx="31" cy="6" r="4.5" fill="#C3E2A6" />
                </svg>
              </div>
              <span className="footer-brand-name">ফুরুৎ</span>
            </div>
            <p className="footer-about">
              {isEn
                ? 'Dhaka’s intelligent multi-modal transit intelligence network. Computing real-time multi-modal routes across MRT-6 Metro, Buses, Rickshaws, CNGs, and Walking paths with traffic delay forecasting.'
                : 'ঢাকার বুদ্ধিমান মাল্টি-মোডাল ট্রানজিট সিস্টেম। এমআরটি-৬ মেট্রোরেল, বাস, রিকশা, সিএনজি ও হাঁটার পথের সমন্বয়ে রিয়েলটাইম জ্যাম পর্যবেক্ষণ ও দ্রুততম নির্ভরযোগ্য রুট নির্দেশক।'}
            </p>
            <div className="footer-status-pill">
              <span className="live-dot" />
              <span>{isEn ? 'MRT-6 & Live Congestion Online' : 'মেট্রোরেল ও লাইভ ট্র্যাফিক ডেটা সক্রিয়'}</span>
            </div>
          </div>

          {/* Navigation Links Column */}
          <div className="footer-col">
            <h4 className="footer-heading">{isEn ? 'Services' : 'সেবাসমূহ'}</h4>
            <ul className="footer-links">
              <li>
                <Link to="/map">{isEn ? 'Interactive Transit Map' : 'ইন্টারেক্টিভ মানচিত্র'}</Link>
              </li>
              <li>
                <Link to="/live">{isEn ? 'Live Journey Rerouter' : 'লাইভ জার্নি ট্র্যাকার'}</Link>
              </li>
              <li>
                <Link to="/belt">{isEn ? 'Traffic Jam Belt Analysis' : 'জ্যাম বেল্ট পর্যবেক্ষণ'}</Link>
              </li>
            </ul>
          </div>

          {/* Multi-Modal Transport Supported */}
          <div className="footer-col">
            <h4 className="footer-heading">{isEn ? 'Supported Modes' : 'পরিবহন মাধ্যম'}</h4>
            <div className="footer-modes-grid">
              <div className="mode-tag mode-tag--metro">
                <span className="mode-indicator" />
                <span>{isEn ? 'MRT-6 Metro' : 'এমআরটি-৬ মেট্রোরেল'}</span>
              </div>
              <div className="mode-tag mode-tag--bus">
                <span className="mode-indicator" />
                <span>{isEn ? 'Public Bus Corridors' : 'পাবলিক বাস করিডোর'}</span>
              </div>
              <div className="mode-tag mode-tag--cng">
                <span className="mode-indicator" />
                <span>{isEn ? 'CNG Auto-Rickshaw' : 'সিএনজি অটো'}</span>
              </div>
              <div className="mode-tag mode-tag--rickshaw">
                <span className="mode-indicator" />
                <span>{isEn ? 'Rickshaw / Goli Network' : 'রিকশা / অলিগলি'}</span>
              </div>
              <div className="mode-tag mode-tag--bike">
                <span className="mode-indicator" />
                <span>{isEn ? 'Motorbike Ride-share' : 'মোটরবাইক'}</span>
              </div>
              <div className="mode-tag mode-tag--walk">
                <span className="mode-indicator" />
                <span>{isEn ? 'Pedestrian Walkway' : 'হাঁটার পথ'}</span>
              </div>
            </div>
          </div>

          {/* System Data & Coverage */}
          <div className="footer-col">
            <h4 className="footer-heading">{isEn ? 'Realtime Feeds' : 'রিয়েলটাইম তথ্য'}</h4>
            <ul className="footer-stats-list">
              <li>
                <strong>16</strong> {isEn ? 'Metro MRT-6 Stations' : 'মেট্রো স্টেশন কানেক্টিভিটি'}
              </li>
              <li>
                <strong>Open-Meteo</strong> {isEn ? 'Live Precipitation Sync' : 'লাইভ বৃষ্টির পূর্বাভাস'}
              </li>
              <li>
                <strong>Peak Engine</strong> {isEn ? 'School, Office & Jummah Schedule' : 'অফিস ও জুম্মা শিফট পর্যবেক্ষণ'}
              </li>
              <li>
                <strong>Graph Network</strong> {isEn ? 'Road-Snapped A* Engine' : 'রাস্তার প্রকৃত পথ ধরে রাউটিং'}
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom copyright & attribution */}
        <div className="footer-bottom">
          <p className="footer-copy">
            © {new Date().getFullYear()} ফুরুৎ. {isEn ? 'All rights reserved. Designed for Dhaka commuters.' : 'সর্বস্বত্ব সংরক্ষিত। ঢাকা শহরের যাত্রীদের জন্য নির্মিত।'}
          </p>
          <div className="footer-bottom-links">
            <span className="footer-meta-item">{isEn ? 'Dhaka Urban Mobility' : 'ঢাকা নগর পরিবহন'}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
