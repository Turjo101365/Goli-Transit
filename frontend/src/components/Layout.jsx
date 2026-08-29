import { Header } from './Header.jsx';
import { Footer } from './Footer.jsx';
import { SideRail } from './SideRail.jsx';

export function Layout({ authUser, onLogout, children }) {
  return (
    <div className="app-layout">
      <Header authUser={authUser} onLogout={onLogout} />
      <SideRail />
      <main className="app-main-content">{children}</main>
      <Footer />
    </div>
  );
}
