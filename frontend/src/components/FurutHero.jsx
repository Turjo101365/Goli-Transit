import { useNavigate } from 'react-router-dom';
import '../styles/tokens.css';
import { useLanguage } from '../state/LanguageContext.jsx';

const BRAND = 'ফুরুৎ';

// Mirpur 10 -> Motijheel, bus option: the same numbers routeOptions.service.js
// serves from the real (frozen) /route contract, p50=68/p90=112. Reused here
// rather than fetched, since the hero is public and /route requires auth —
// not invented, this is the app's own real answer for this corridor today.
const STUB_USUAL = 68;
const STUB_BAD = 112;

// Real per-mode rain reasons, copied from backend/src/core/modeMatrix.js
// MATRIX[mode].rain — not rewritten, so this can't drift into a claim the
// app doesn't actually enforce.
const RAIN_ROWS = [
  { mode: 'metro', state: 0, bn: 'মেট্রো', en: 'Metro', reasonBn: 'উড়াল লাইন, বৃষ্টির প্রভাব নেই', reasonEn: 'Elevated track, unaffected by rain' },
  { mode: 'walk', state: 1, bn: 'হাঁটা', en: 'Walk', reasonBn: 'রাস্তায় জলাবদ্ধতা হতে পারে', reasonEn: 'Streets may be waterlogged' },
  { mode: 'bus', state: 1, bn: 'বাস', en: 'Bus', reasonBn: 'বৃষ্টিতে ধীরগতি ও বেশি ভিড়', reasonEn: 'Slower and more crowded in rain' },
  { mode: 'rickshaw', state: 1, bn: 'রিকশা', en: 'Rickshaw', reasonBn: 'ভাড়া প্রায় দ্বিগুণ, কিছু গলি পানিতে বন্ধ', reasonEn: 'Fare roughly doubles; some lanes blocked by water' },
  { mode: 'cng', state: 1, bn: 'সিএনজি', en: 'CNG', reasonBn: 'বৃষ্টিতে সংখ্যায় কম, ভাড়া প্রায় ২.৫ গুণ', reasonEn: 'Scarce in rain, fare roughly 2.5x' },
  { mode: 'bike', state: 2, bn: 'বাইক', en: 'Bike', reasonBn: 'বৃষ্টিতে রাইডাররা অফলাইনে চলে যায়', reasonEn: 'Riders go offline in the rain' }
];

const STATUS_DOT = ['var(--sev-0)', 'var(--sev-3)', 'var(--sev-5)'];

// An honest status ledger of what's actually wired today, not a feature
// list — matches CLAUDE.md "report what's observed" for the app itself.
const REAL_ROWS = [
  { bn: '১৬টি মেট্রো স্টেশন, সরকারি ভাড়ার তথ্য', en: '16 metro stations, official fare data', status: 1 },
  { bn: 'বৃষ্টি — লাইভ, ওপেন-মিটিও থেকে', en: 'Rain — live, from Open-Meteo', status: 1 },
  { bn: 'মিরপুর ১০ → মতিঝিল করিডোরের সময়/ভাড়া', en: 'Mirpur 10 → Motijheel corridor timing/fare', status: 1 },
  { bn: 'নিজের জিপিএস থেকে আটকে থাকা ধরা', en: 'Stuck detection from your own GPS', status: 0 },
  { bn: 'করিডোর বেসলাইন জমা হচ্ছে', en: 'Corridor baselines — accumulating', status: 0 },
  { bn: 'অন্য ব্যবহারকারীদের থেকে যানজট শনাক্ত', en: 'Congestion detection across users', status: -1 }
];

const STATUS_LABEL = {
  bn: ['চালু আছে', 'কাজ চলছে', 'এখনও নয়'],
  en: ['Working', 'In progress', 'Not yet']
};

function statusIndex(status) {
  return status === 1 ? 0 : status === 0 ? 1 : 2;
}

export function FurutHero({ authUser }) {
  const { lang, toggleLang } = useLanguage();
  const navigate = useNavigate();
  const t = TEXT[lang];

  return (
    <section style={{ background: 'var(--ground)', color: 'var(--cream)', minHeight: '100vh', paddingBottom: 48 }}>
      <div
        style={{
          height: 7,
          background: 'repeating-linear-gradient(115deg, var(--metro) 0 16px, var(--stamp) 16px 26px, var(--cream) 26px 30px, var(--metro) 30px 34px)'
        }}
      />

      <div className="page-wrap">
        <header style={{ display: 'flex', alignItems: 'baseline', gap: 12, padding: '18px 0 8px' }}>
          <h1 className="t-brand">{BRAND}</h1>
          <p className="t-label" lang={lang} style={{ margin: 0 }}>{t.tag}</p>
          <button type="button" className="chip" style={{ marginLeft: 'auto' }} onClick={toggleLang}>
            {lang === 'bn' ? 'English' : 'বাংলা'}
          </button>
        </header>

        <p className="t-body" style={{ color: 'var(--stamp)', fontWeight: 700, marginTop: 20 }}>{t.kicker}</p>
        <h2 className="t-brand" style={{ fontSize: 'clamp(28px,6vw,40px)', margin: '4px 0 6px', maxWidth: '16ch' }}>
          {t.head}
        </h2>
        <p className="t-label" style={{ marginBottom: 18 }}>{t.route}</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="panel" style={{ padding: '14px 16px' }}>
            <span className="t-label">{t.usual}</span>
            <div className="t-big" style={{ fontSize: 'clamp(34px,8vw,50px)', marginTop: 6 }}>
              {STUB_USUAL}<span className="t-label" style={{ marginLeft: 4 }}>{t.min}</span>
            </div>
          </div>
          <div className="panel" style={{ padding: '14px 16px', borderColor: 'var(--stamp)' }}>
            <span className="t-label" style={{ color: 'var(--stamp)' }}>{t.badDay}</span>
            <div className="t-big" style={{ fontSize: 'clamp(34px,8vw,50px)', marginTop: 6, color: 'var(--stamp)' }}>
              {STUB_BAD}<span className="t-label" style={{ marginLeft: 4, color: 'var(--stamp)' }}>{t.min}</span>
            </div>
          </div>
        </div>

        <p className="t-body" style={{ marginTop: 18, color: 'var(--c70)', lineHeight: 1.6 }}>{t.lede}</p>

        <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
          {authUser ? (
            <button type="button" className="chip" style={{ padding: '10px 20px', fontSize: 15 }} onClick={() => navigate('/map')}>
              {t.openApp}
            </button>
          ) : (
            <>
              <button type="button" className="chip" style={{ padding: '10px 20px', fontSize: 15 }} onClick={() => navigate('/login')}>
                {t.login}
              </button>
              <button
                type="button"
                className="chip"
                style={{ padding: '10px 20px', fontSize: 15, background: 'var(--cream)', color: 'var(--ground)' }}
                onClick={() => navigate('/register')}
              >
                {t.register}
              </button>
            </>
          )}
        </div>

        <div className="rule-hair" style={{ margin: '30px 0 0' }} />
        <h2 className="t-section" style={{ margin: '18px 0 12px' }}>{t.s2}</h2>
        {t.items.map(([h, p], i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '26px 1fr', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
            <span className="t-place" style={{ color: 'var(--c45)' }}>{i + 1}.</span>
            <div>
              <div className="t-place">{h}</div>
              <p className="t-body" style={{ marginTop: 3, color: 'var(--c70)' }}>{p}</p>
            </div>
          </div>
        ))}

        <div className="rule-hair" style={{ margin: '30px 0 0' }} />
        <h2 className="t-section" style={{ margin: '18px 0 4px' }}>{t.s3}</h2>
        <p className="t-body" style={{ color: 'var(--c45)', marginBottom: 10 }}>{t.s3sub}</p>
        {RAIN_ROWS.map((row) => (
          <div key={row.mode} style={{ display: 'grid', gridTemplateColumns: '78px 1fr 12px', gap: 12, alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--line)' }}>
            <span className="t-place" style={{ fontSize: 14, color: row.state === 0 ? 'var(--metro)' : 'var(--cream)' }}>
              {lang === 'bn' ? row.bn : row.en}
            </span>
            <p className="t-body" style={{ color: 'var(--c70)', fontSize: 13 }}>{lang === 'bn' ? row.reasonBn : row.reasonEn}</p>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: STATUS_DOT[row.state], justifySelf: 'end' }} />
          </div>
        ))}

        <div className="rule-hair" style={{ margin: '30px 0 0' }} />
        <h2 className="t-section" style={{ margin: '18px 0 4px' }}>{t.s4}</h2>
        <p className="t-body" style={{ color: 'var(--c45)', marginBottom: 10 }}>{t.s4sub}</p>
        {REAL_ROWS.map((row, i) => {
          const idx = statusIndex(row.status);
          return (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '78px 1fr', gap: 12, padding: '9px 0', borderBottom: '1px solid var(--line)' }}>
              <span className="t-label" style={{ color: STATUS_DOT[idx] }}>{STATUS_LABEL[lang][idx]}</span>
              <p className="t-body" style={{ color: row.status === -1 ? 'var(--c45)' : 'var(--c70)' }}>
                {lang === 'bn' ? row.bn : row.en}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

const TEXT = {
  bn: {
    tag: 'জ্যাম লাগার আগেই',
    kicker: 'ঢাকার সমস্যা যানজট না',
    head: 'সমস্যা হলো, কখন — সেটা কেউ বলে না।',
    route: 'মিরপুর ১০ → মতিঝিল · বাসে',
    usual: 'সাধারণত', badDay: 'খারাপ দিনে', min: 'মিনিট',
    lede: 'একই যাত্রা, একই বাহন — কিন্তু খারাপ দিনে সময় প্রায় দ্বিগুণ লাগে। কোন দিন কেমন লাগবে, সেটাই ফুরুৎ হিসাব করে দেয়।',
    openApp: 'অ্যাপ খুলুন', login: 'লগইন', register: 'নতুন অ্যাকাউন্ট',
    s2: 'যা করে',
    items: [
      ['কখন বেরোবেন', 'প্রতিটা সময় দুইভাবে দেওয়া হয় — একটা সাধারণ দিনের, একটা খারাপ দিনের। জরুরি কাজ থাকলে খারাপ দিনটা ধরেই বেরোন।'],
      ['কোন বাহনে', 'হাঁটা, রিকশা, বাস, মেট্রো, বাইক, সিএনজি। শুধু দ্রুততম না — কোনটা আসলে ভরসা করা যায়, সেটা।'],
      ['রাস্তায় থাকতে', 'বাস আটকে গেছে? ফুরুৎ বলে দেয় কোথায় নামবেন আর কী ধরবেন — মেট্রো প্রায়ই মাথার উপরেই থাকে।']
    ],
    s3: 'বৃষ্টি নামলে যা বদলায়',
    s3sub: 'বৃষ্টি সব বাহনকে সমান ধীর করে না। বৃষ্টি বিকল্প কেড়ে নেয়।',
    s4: 'যেটা এখন বাস্তব',
    s4sub: 'যা এখনও হয়নি, সেটাও লেখা আছে — খোলাখুলি একটা ফাঁক থাকা, ভুল দাবি করার চেয়ে ভালো।'
  },
  en: {
    tag: 'Out before the jam',
    kicker: "Dhaka's problem isn't congestion",
    head: "It's that nobody tells you when.",
    route: 'Mirpur 10 → Motijheel · by bus',
    usual: 'Usually', badDay: 'Bad day', min: 'min',
    lede: 'Same trip, same mode — but on a bad day it takes almost twice as long. Which day you\'ll get is what Furut works out.',
    openApp: 'Open Furut', login: 'Log in', register: 'Create account',
    s2: 'What it does',
    items: [
      ['When to leave', "Every time comes as a pair — a usual day and a bad one. If it matters, plan against the bad one."],
      ['What to take', "Walk, rickshaw, bus, metro, bike, CNG. Not just the fastest — which one you can actually rely on."],
      ["While you're moving", "Bus stuck? Furut tells you where to get off and what to switch to. The metro is often directly overhead."]
    ],
    s3: 'What rain changes',
    s3sub: 'Rain doesn\'t slow every mode equally. Rain removes options.',
    s4: 'What is real, right now',
    s4sub: "What hasn't been built yet is listed too — an open gap beats a claim that doesn't hold up."
  }
};
