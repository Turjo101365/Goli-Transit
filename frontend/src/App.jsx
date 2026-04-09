import { useState } from 'react';
import { Home } from './pages/Home.jsx';
import { RoutePlanner } from './pages/RoutePlanner.jsx';

export default function App() {
  const [page, setPage] = useState('home');

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>GoliTransit</h1>
          <p>Multi-Modal Hyper-Local Routing Engine</p>
        </div>
        <nav className="app-nav">
          <button
            type="button"
            className={page === 'home' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setPage('home')}
          >
            Home
          </button>
          <button
            type="button"
            className={page === 'planner' ? 'nav-btn active' : 'nav-btn'}
            onClick={() => setPage('planner')}
          >
            Route Planner
          </button>
        </nav>
      </header>

      <main className="page-content">
        {page === 'home' ? <Home onStart={() => setPage('planner')} /> : <RoutePlanner />}
      </main>
    </div>
  );
}