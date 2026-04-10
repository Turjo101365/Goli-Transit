import { useState, useEffect } from 'react';
import { Home } from './pages/Home.jsx';
import { RoutePlanner } from './pages/RoutePlanner.jsx';

export default function App() {
  const [page, setPage] = useState('home');
  const [activeSection, setActiveSection] = useState('hero');
  const [targetSection, setTargetSection] = useState(null);

  // Hash-based navigation persistence
  useEffect(() => {
    const hashPage = window.location.hash.replace('#', '') || 'home';
    if (['home', 'planner'].includes(hashPage)) {
      setPage(hashPage);
    }
  }, []);

  const navigateTo = (newPage) => {
    setPage(newPage);
    window.location.hash = newPage;
  };

  useEffect(() => {
    const handleHashChange = () => {
      const hashPage = window.location.hash.replace('#', '') || 'home';
      if (['home', 'planner'].includes(hashPage)) {
        setPage(hashPage);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const scrollToSection = (sectionId) => {
    setActiveSection(sectionId);
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
  };

  // Scroll after page switch to home
  useEffect(() => {
    if (page === 'home' && targetSection) {
      const timer = setTimeout(() => {
        scrollToSection(targetSection);
        setTargetSection(null);
      }, 100); // Delay for Home to render
      return () => clearTimeout(timer);
    }
  }, [page, targetSection]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="logo-container">
          <div className="logo-3d" onClick={() => navigateTo('home')} style={{cursor: 'pointer'}}>G🚀li</div>
          <span className="logo-tagline">Transit </span>
        </div>
        <nav className="app-nav">
          <button
            type="button"
            className={page === 'home' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => navigateTo('home')}
          >
            Home
          </button>
          <button
            type="button"
            className={page === 'planner' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => navigateTo('planner')}
          >
            Route Planner
          </button>
          <button
            type="button"
            className={`nav-btn ${activeSection === 'about' ? 'active' : ''}`}
            onClick={() => { setTargetSection('about'); navigateTo('home'); }}
          >
            About
          </button>
          <button
            type="button"
            className={`nav-btn ${activeSection === 'contact' ? 'active' : ''}`}
            onClick={() => { setTargetSection('contact'); navigateTo('home'); }}
          >
            Contact
          </button>
        </nav>
      </header>

      <main className="page-content">
        {page === 'home' ? (
          <Home 
            onStart={() => navigateTo('planner')} 
            activeSection={activeSection} 
            setActiveSection={setActiveSection} 
          />
        ) : (
          <RoutePlanner 
            activeSection={activeSection} 
            setActiveSection={setActiveSection} 
            scrollToSection={scrollToSection} 
            navigateTo={navigateTo} 
            page={page} 
          />
        )}
      </main>

      <footer className="special-footer">
        <div className="footer-content">
          {/* Logo */}
          <div className="footer-logo">
            <div
              className="logo-3d"
              onClick={() => navigateTo('home')}
              style={{ cursor: 'pointer' }}
            >
              GoliTransit
            </div>
            <span>Smart Navigation for Dhaka</span>
          </div>

          {/* Links */}
          <div className="footer-links">
            <h4>Navigation</h4>
            <a href="#home" onClick={(e) => { e.preventDefault(); navigateTo('home'); }}>Home</a>
            <a href="#about" onClick={(e) => { e.preventDefault(); setTargetSection('about'); navigateTo('home'); }}>About</a>
            <a href="#contact" onClick={(e) => { e.preventDefault(); setTargetSection('contact'); navigateTo('home'); }}>Contact</a>
            <a href="#planner" onClick={(e) => { e.preventDefault(); navigateTo('planner'); }}>Planner</a>
          </div>

          {/* Contact */}
          <div className="footer-contact">
            <div className="contact-block">
              <span className="label">Email</span>
              <a href="mailto:abcd@golitranist.com" className="value">
                abcd@golitranist.com
              </a>
            </div>
            <div className="contact-block">
              <span className="label">Phone</span>
              <a href="tel:+8801968776048" className="value">
                +880 196 877 6048
              </a>
            </div>
            <div className="contact-block">
              <span className="label">Office</span>
              <div className="value">
                Eastern Galaxy, Mohammadpur, Dhaka-1207
              </div>
            </div>
          </div>
        </div>

        {/* Copy */}
        <div className="footer-copy">
          © 2026 GoliTransit • Built for Dhaka's chaos • Powered by Three.js & Real-time Graphs
        </div>
      </footer>
    </div>
  );
}

