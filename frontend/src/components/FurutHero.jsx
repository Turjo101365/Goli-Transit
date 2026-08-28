import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/tokens.css';
import { useLanguage } from '../state/LanguageContext.jsx';
import { getCondition } from '../services/condition.service.js';
import { formatMinutesOfDay } from '../utils/format.js';
import { ThemeToggle } from './ThemeToggle.jsx';

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
  { bn: 'যেকোনো দুই জায়গার মধ্যে রুট — রাস্তার প্রকৃত পথ ধরে', en: 'Routes between any two points — real road-snapped paths', status: 1 },
  { bn: 'স্কুল-অফিস শিফট ও জুম্মার সময় যানজট শনাক্ত', en: 'School/office shift and Jummah jam detection', status: 1 },
  { bn: 'নিজের জিপিএস থেকে আটকে থাকা ধরা', en: 'Stuck detection from your own GPS', status: 0 },
  { bn: 'করিডোর বেসলাইন জমা হচ্ছে', en: 'Corridor baselines — accumulating', status: 0 },
  { bn: 'অন্য ব্যবহারকারীদের থেকে যানজট শনাক্ত (লাইভ সেন্সর)', en: 'Live congestion detection across users (sensor-based)', status: -1 }
];

const STATUS_LABEL = {
  bn: ['চালু আছে', 'কাজ চলছে', 'এখনও নয়'],
  en: ['Working', 'In progress', 'Not yet']
};

function statusIndex(status) {
  return status === 1 ? 0 : status === 0 ? 1 : 2;
}

export function FurutHero({ authUser, onGuestLogin }) {
  const { lang, toggleLang } = useLanguage();
  const navigate = useNavigate();
  const t = TEXT[lang];

  const [schedule, setSchedule] = useState(null);

  useEffect(() => {
    getCondition()
      .then((data) => {
        setSchedule({
          peakWindows: data.peakWindows || [],
          fridayPeakWindow: data.fridayPeakWindow || null,
          highAlertZones: data.highAlertZones || [],
          activeWindow: data.activeWindow || null
        });
      })
      .catch(() => {});
  }, []);

  return (
    <section style={{ background: 'var(--ground)', color: 'var(--cream)', minHeight: '100vh', paddingBottom: 48 }}>
      <div
        style={{
          height: 7,
          background: 'repeating-linear-gradient(115deg, var(--metro) 0 16px, var(--stamp) 16px 26px, var(--cream) 26px 30px, var(--metro) 30px 34px)'
        }}
      />

      <div className="page-wrap" style={{ '--wrap-max': '760px' }}>
        <header style={{ display: 'flex', alignItems: 'baseline', gap: 12, padding: '18px 0 8px' }}>
          <h1 className="t-brand">{BRAND}</h1>
          <p className="t-label" lang={lang} style={{ margin: 0 }}>{t.tag}</p>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <ThemeToggle />
            <button type="button" className="chip" onClick={toggleLang}>
              {lang === 'bn' ? 'English' : 'বাংলা'}
            </button>
          </div>
        </header>

        <div className="hero-split" style={{ marginTop: 20 }}>
          <div>
            <p className="t-body" style={{ color: 'var(--stamp)', fontWeight: 700 }}>{t.kicker}</p>
            <h2 className="t-brand" style={{ fontSize: 'clamp(28px,4vw,40px)', margin: '4px 0 6px', maxWidth: '16ch' }}>
              {t.head}
            </h2>
            <p className="t-label" style={{ marginBottom: 18 }}>{t.route}</p>
            <p className="t-body" style={{ color: 'var(--c70)', lineHeight: 1.6, maxWidth: '48ch' }}>{t.lede}</p>

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
                  <button
                    type="button"
                    className="chip"
                    style={{ padding: '10px 20px', fontSize: 15, borderColor: 'var(--stamp)', color: 'var(--stamp)' }}
                    onClick={() => onGuestLogin?.()}
                  >
                    {t.guest}
                  </button>
                </>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 4 }}>
            <div className="panel" style={{ padding: '14px 16px' }}>
              <span className="t-label">{t.usual}</span>
              <div className="t-big" style={{ fontSize: 'clamp(34px,8vw,44px)', marginTop: 6 }}>
                {STUB_USUAL}<span className="t-label" style={{ marginLeft: 4 }}>{t.min}</span>
              </div>
            </div>
            <div className="panel" style={{ padding: '14px 16px', borderColor: 'var(--stamp)' }}>
              <span className="t-label" style={{ color: 'var(--stamp)' }}>{t.badDay}</span>
              <div className="t-big" style={{ fontSize: 'clamp(34px,8vw,44px)', marginTop: 6, color: 'var(--stamp)' }}>
                {STUB_BAD}<span className="t-label" style={{ marginLeft: 4, color: 'var(--stamp)' }}>{t.min}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="rule-hair" style={{ margin: '30px 0 0' }} />
        <h2 className="t-section" style={{ margin: '18px 0 12px' }}>{t.s2}</h2>
        <div className="responsive-list">
          {t.items.map(([h, p], i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '26px 1fr', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
              <span className="t-place" style={{ color: 'var(--c45)' }}>{i + 1}.</span>
              <div>
                <div className="t-place">{h}</div>
                <p className="t-body" style={{ marginTop: 3, color: 'var(--c70)' }}>{p}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="rule-hair" style={{ margin: '30px 0 0' }} />
        <h2 className="t-section" style={{ margin: '18px 0 4px' }}>{t.s3}</h2>
        <p className="t-body" style={{ color: 'var(--c45)', marginBottom: 10 }}>{t.s3sub}</p>
        <div className="responsive-list">
          {RAIN_ROWS.map((row) => (
            <div key={row.mode} style={{ display: 'grid', gridTemplateColumns: '78px 1fr 12px', gap: 12, alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--line)' }}>
              <span className="t-place" style={{ fontSize: 14, color: row.state === 0 ? 'var(--metro)' : 'var(--cream)' }}>
                {lang === 'bn' ? row.bn : row.en}
              </span>
              <p className="t-body" style={{ color: 'var(--c70)', fontSize: 13 }}>{lang === 'bn' ? row.reasonBn : row.reasonEn}</p>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: STATUS_DOT[row.state], justifySelf: 'end' }} />
            </div>
          ))}
        </div>

        {schedule ? (
          <>
            <div className="rule-hair" style={{ margin: '30px 0 0' }} />
            <h2 className="t-section" style={{ margin: '18px 0 4px' }}>{t.s5}</h2>
            <p className="t-body" style={{ color: 'var(--c45)', marginBottom: 10 }}>{t.s5sub}</p>
            <div className="responsive-list">
              {schedule.peakWindows.map((window) => (
                <div key={window.id} style={{ display: 'grid', gridTemplateColumns: '108px 1fr', gap: 12, padding: '9px 0', borderBottom: '1px solid var(--line)' }}>
                  <span className="t-num" style={{ fontSize: 13, color: schedule.activeWindow?.id === window.id ? 'var(--sev-3)' : 'var(--cream)' }}>
                    {formatMinutesOfDay(window.start, lang)}–{formatMinutesOfDay(window.end, lang)}
                  </span>
                  <div>
                    <div className="t-place" style={{ fontSize: 14 }}>{lang === 'bn' ? window.labelBn : window.labelEn}</div>
                    <p className="t-body" style={{ color: 'var(--c70)', fontSize: 12.5, marginTop: 2 }}>
                      {lang === 'bn' ? window.reasonBn : window.reasonEn}
                    </p>
                  </div>
                </div>
              ))}
              {schedule.fridayPeakWindow ? (
                <div style={{ display: 'grid', gridTemplateColumns: '108px 1fr', gap: 12, padding: '9px 0', borderBottom: '1px solid var(--line)' }}>
                  <span className="t-num" style={{ fontSize: 13, color: schedule.activeWindow?.id === schedule.fridayPeakWindow.id ? 'var(--sev-3)' : 'var(--stamp)' }}>
                    {formatMinutesOfDay(schedule.fridayPeakWindow.start, lang)}–{formatMinutesOfDay(schedule.fridayPeakWindow.end, lang)}
                  </span>
                  <div>
                    <div className="t-place" style={{ fontSize: 14 }}>
                      {t.fridayLabel} · {lang === 'bn' ? schedule.fridayPeakWindow.labelBn : schedule.fridayPeakWindow.labelEn}
                    </div>
                    <p className="t-body" style={{ color: 'var(--c70)', fontSize: 12.5, marginTop: 2 }}>
                      {lang === 'bn' ? schedule.fridayPeakWindow.reasonBn : schedule.fridayPeakWindow.reasonEn}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
            {schedule.highAlertZones.length > 0 ? (
              <p className="t-body" style={{ color: 'var(--c70)', marginTop: 12, fontSize: 13 }}>
                <span className="t-label" style={{ marginRight: 6 }}>{t.zonesLabel}</span>
                {schedule.highAlertZones.map((zone) => (lang === 'bn' ? zone.bn : zone.en)).join(' · ')}
              </p>
            ) : null}
          </>
        ) : null}

        <div className="rule-hair" style={{ margin: '30px 0 0' }} />
        <h2 className="t-section" style={{ margin: '18px 0 4px' }}>{t.s4}</h2>
        <p className="t-body" style={{ color: 'var(--c45)', marginBottom: 10 }}>{t.s4sub}</p>
        <div className="responsive-list">
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
    openApp: 'অ্যাপ খুলুন', login: 'লগইন', register: 'নতুন অ্যাকাউন্ট', guest: 'গেস্ট হিসেবে ঢুকুন',
    s2: 'যা করে',
    items: [
      ['কখন বেরোবেন', 'প্রতিটা সময় দুইভাবে দেওয়া হয় — একটা সাধারণ দিনের, একটা খারাপ দিনের। জরুরি কাজ থাকলে খারাপ দিনটা ধরেই বেরোন।'],
      ['কোন বাহনে', 'হাঁটা, রিকশা, বাস, মেট্রো, বাইক, সিএনজি। শুধু দ্রুততম না — কোনটা আসলে ভরসা করা যায়, সেটা।'],
      ['রাস্তায় থাকতে', 'বাস আটকে গেছে? ফুরুৎ বলে দেয় কোথায় নামবেন আর কী ধরবেন — মেট্রো প্রায়ই মাথার উপরেই থাকে।']
    ],
    s3: 'বৃষ্টি নামলে যা বদলায়',
    s3sub: 'বৃষ্টি সব বাহনকে সমান ধীর করে না। বৃষ্টি বিকল্প কেড়ে নেয়।',
    s5: 'ঢাকা কখন থমকে যায়',
    s5sub: 'স্কুল-অফিসের শিফট পরিবর্তন আর শুক্রবারের জুম্মা — এই সময়গুলোতে যানজট নিয়মিত।',
    fridayLabel: 'শুক্রবার',
    zonesLabel: 'সবচেয়ে ঝুঁকিপূর্ণ এলাকা:',
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
    openApp: 'Open Furut', login: 'Log in', register: 'Create account', guest: 'Continue as guest',
    s2: 'What it does',
    items: [
      ['When to leave', "Every time comes as a pair — a usual day and a bad one. If it matters, plan against the bad one."],
      ['What to take', "Walk, rickshaw, bus, metro, bike, CNG. Not just the fastest — which one you can actually rely on."],
      ["While you're moving", "Bus stuck? Furut tells you where to get off and what to switch to. The metro is often directly overhead."]
    ],
    s3: 'What rain changes',
    s3sub: 'Rain doesn\'t slow every mode equally. Rain removes options.',
    s5: 'When Dhaka stalls',
    s5sub: "School and office shift changes, and Friday Jummah — these windows jam up regularly.",
    fridayLabel: 'Friday',
    zonesLabel: 'Highest-risk areas:',
    s4: 'What is real, right now',
    s4sub: "What hasn't been built yet is listed too — an open gap beats a claim that doesn't hold up."
  }
};
