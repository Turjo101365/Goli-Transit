import { Header } from './Header.jsx';
import { Footer } from './Footer.jsx';

export function Layout({ authUser, onLogout, children }) {
  return (
    <div className="app-layout">
      <Header authUser={authUser} onLogout={onLogout} />
      <main className="app-main-content">{children}</main>
      <Footer />
    </div>
  );
}
