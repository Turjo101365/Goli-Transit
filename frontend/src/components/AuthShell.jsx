import { Link } from 'react-router-dom';
import '../styles/tokens.css';
import { useLanguage } from '../state/LanguageContext.jsx';

const TEXT = {
  bn: {
    back: '← হোম'
  },
  en: {
    back: '← Home'
  }
};

export function AuthShell({ title, subtitle, children, footer }) {
  const { lang } = useLanguage();
  const t = TEXT[lang];

  return (
    <section style={{ background: 'var(--ground)', color: 'var(--cream)', paddingBottom: 40, paddingTop: 20 }}>
      <div className="page-wrap" style={{ '--wrap-max': '440px' }}>
        <div className="panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', margin: '8px 0 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="live-dot" />
            <span className="t-place" style={{ fontSize: 14 }}>
              {lang === 'bn' ? 'মেট্রোরেল (MRT-6) ও লাইভ ট্র্যাফিক' : 'Metro (MRT-6) & Live Traffic'}
            </span>
          </div>
          <span className="t-label" style={{ color: 'var(--metro)' }}>
            {lang === 'bn' ? 'সক্রিয়' : 'Online'}
          </span>
        </div>

        <div className="panel" style={{ padding: '22px 22px 24px' }}>
          <h1 className="t-brand" style={{ fontSize: 24, marginBottom: 4 }}>{title}</h1>
          <p className="t-body" style={{ color: 'var(--c70)', marginBottom: 20 }}>{subtitle}</p>
          {children}
        </div>

        {footer}

        <div className="rule-hair" style={{ margin: '26px 0 14px' }} />
        <Link to="/" className="t-label" style={{ color: 'var(--c45)', textDecoration: 'none' }}>{t.back}</Link>
      </div>
    </section>
  );
}

export function AuthField({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <span className="t-label" style={{ display: 'block', marginBottom: 5 }}>{label}</span>
      {children}
    </div>
  );
}

export const authInputStyle = {
  width: '100%',
  background: 'var(--ground2)',
  border: '1.5px solid var(--line)',
  color: 'var(--cream)',
  padding: '10px 12px',
  fontFamily: 'var(--data)',
  fontSize: 14
};
