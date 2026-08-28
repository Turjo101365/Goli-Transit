import { Link } from 'react-router-dom';
import '../styles/tokens.css';
import { useLanguage } from '../state/LanguageContext.jsx';

const BRAND = 'ফুরুৎ';

// Same real corridor numbers as FurutHero.jsx (routeOptions.service.js's
// frozen /route contract, bus option: p50=68, p90=112) — repeated here so
// the auth pages carry a real reminder of the product instead of empty
// space, not a fresh invented stat.
const STUB_USUAL = 68;
const STUB_BAD = 112;

const TEXT = {
  bn: {
    tag: 'জ্যাম লাগার আগেই',
    pitch: 'মিরপুর ১০ → মতিঝিল, বাসে — সাধারণত',
    pitchBad: 'খারাপ দিনে',
    min: 'মিনিট',
    back: '← হোম'
  },
  en: {
    tag: 'Out before the jam',
    pitch: 'Mirpur 10 → Motijheel, by bus — usually',
    pitchBad: 'bad day',
    min: 'min',
    back: '← Home'
  }
};

export function AuthShell({ title, subtitle, children, footer }) {
  const { lang, toggleLang } = useLanguage();
  const t = TEXT[lang];

  return (
    <section style={{ background: 'var(--ground)', color: 'var(--cream)', minHeight: '100vh', paddingBottom: 40 }}>
      <div
        style={{
          height: 7,
          background: 'repeating-linear-gradient(115deg, var(--metro) 0 16px, var(--stamp) 16px 26px, var(--cream) 26px 30px, var(--metro) 30px 34px)'
        }}
      />

      <div className="page-wrap" style={{ '--wrap-max': '440px' }}>
        <header style={{ display: 'flex', alignItems: 'baseline', gap: 12, padding: '18px 0 6px' }}>
          <Link to="/" className="t-brand" style={{ color: 'var(--cream)', textDecoration: 'none' }}>{BRAND}</Link>
          <p className="t-label" lang={lang} style={{ margin: 0 }}>{t.tag}</p>
          <button type="button" className="chip" style={{ marginLeft: 'auto' }} onClick={toggleLang}>
            {lang === 'bn' ? 'English' : 'বাংলা'}
          </button>
        </header>

        <div className="panel" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', margin: '14px 0 22px' }}>
          <div>
            <span className="t-label">{t.pitch}</span>
            <div className="t-big" style={{ fontSize: 24, marginTop: 2 }}>
              {STUB_USUAL} <span className="t-label">{t.min}</span>
            </div>
          </div>
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <span className="t-label" style={{ color: 'var(--stamp)' }}>{t.pitchBad}</span>
            <div className="t-big" style={{ fontSize: 24, marginTop: 2, color: 'var(--stamp)' }}>
              {STUB_BAD} <span className="t-label" style={{ color: 'var(--stamp)' }}>{t.min}</span>
            </div>
          </div>
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
