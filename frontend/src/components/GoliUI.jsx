import { useEffect, useState } from 'react';
import '../styles/tokens.css';
import { useLanguage } from '../state/LanguageContext.jsx';
import { createRoute } from '../services/route.service.js';
import { getModeStates } from '../services/modes.service.js';
import { modeLabel } from '../utils/modes.js';

const BRAND = 'ফুরুৎ';

const CONDITIONS = [
  { id: 'clear', bn: 'পরিষ্কার', en: 'Clear' },
  { id: 'jam', bn: 'সামনে জ্যাম', en: 'Jam ahead' },
  { id: 'rain', bn: 'বৃষ্টি শুরু', en: 'Rain starting' }
];

const OPTION_LABELS = {
  metro: { bn: 'মেট্রো', en: 'Metro' },
  bike: { bn: 'বাইক', en: 'Bike' },
  bus: { bn: 'বাস', en: 'Bus' },
  cng: { bn: 'সিএনজি', en: 'CNG' },
  rickshaw: { bn: 'রিকশা', en: 'Rickshaw' },
  walk: { bn: 'হাঁটা', en: 'Walk' }
};

// Jam-severity ramp (tokens.css --sev-0..5) collapsed to the three mode-matrix
// states. Walk legs are connective tissue, not a transit choice being judged
// for jam severity — neutral grey rather than any severity colour.
function slotColour(mode, state) {
  if (mode === 'walk') {
    return 'var(--c20)';
  }

  return state === 0 ? 'var(--sev-0)' : state === 1 ? 'var(--sev-3)' : 'var(--sev-5)';
}

// Origin-station identity, used only for the hero panel's accent colour and
// motif — decorative wayfinding, not a claim about per-station analytics we
// don't have yet. Mirpur 10 is real: MRT-6's northern anchor on this
// corridor, next to the National Stadium and the Benarasi-sari weaving
// quarter (both well-known, not invented facts).
const ORIGIN_AREA = {
  bn: 'মিরপুর ১০', en: 'Mirpur 10',
  noteBn: 'স্টেডিয়াম ও বেনারসি পল্লি', noteEn: 'The stadium and the Benarasi looms',
  a: '#1F7A4E', b: '#D9A441'
};

function StadiumMotif() {
  const p = { fill: 'none', stroke: 'currentColor', strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round' };
  return (
    <svg viewBox="0 0 84 92" aria-hidden="true" style={{ width: '100%', height: 'auto' }}>
      <path {...p} d="M28 74V30M42 74V30M56 74V30M24 30h36" />
      <circle {...p} cx="66" cy="66" r="9" />
    </svg>
  );
}

export function GoliUI() {
  const { lang, toggleLang } = useLanguage();
  const t = TEXT[lang];

  const [condition, setCondition] = useState('clear');
  const [options, setOptions] = useState([]);
  const [modeStates, setModeStates] = useState({});
  const [selectedOptionId, setSelectedOptionId] = useState('metro');
  const [selectedLegIndex, setSelectedLegIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      // Real Mirpur 10 / Motijheel coordinates (same as routeOptions used to
      // hardcode) — /route now computes options dynamically from these,
      // rather than returning a frozen dataset.
      createRoute({ originLat: 23.8084, originLng: 90.3682, destinationLat: 23.7281, destinationLng: 90.4191 }),
      getModeStates(condition)
    ])
      .then(([routeResult, modesResult]) => {
        if (cancelled) {
          return;
        }

        const nextOptions = routeResult.options || [];
        setOptions(nextOptions);
        setModeStates(Object.fromEntries((modesResult.modes || []).map((entry) => [entry.mode, entry])));
        setSelectedLegIndex(0);
        setSelectedOptionId((current) =>
          nextOptions.some((option) => option.id === current) ? current : nextOptions[0]?.id
        );
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [condition]);

  const selectedOption = options.find((entry) => entry.id === selectedOptionId);
  const totalMinutes = selectedOption ? selectedOption.segments.reduce((sum, seg) => sum + seg.min, 0) : 0;
  const fareUnknown = selectedOption?.segments.some((seg) => seg.fare === null) ?? false;
  const totalFare = selectedOption && !fareUnknown
    ? selectedOption.segments.reduce((sum, seg) => sum + seg.fare, 0)
    : null;
  const selectedLeg = selectedOption?.segments[selectedLegIndex];
  const selectedLegState = selectedLeg ? modeStates[selectedLeg.mode] : null;

  return (
    <section style={{ background: 'var(--ground)', color: 'var(--cream)', minHeight: '100vh', paddingBottom: 40 }}>
      <div
        style={{
          height: 7,
          background: `repeating-linear-gradient(115deg, ${ORIGIN_AREA.a} 0 16px, ${ORIGIN_AREA.b} 16px 26px, var(--cream) 26px 30px, ${ORIGIN_AREA.a} 30px 34px)`
        }}
      />

      <div className="page-wrap">
        <header style={{ display: 'flex', alignItems: 'baseline', gap: 12, padding: '18px 0 20px' }}>
          <h1 className="t-brand">{BRAND}</h1>
          <p className="t-label" lang={lang} style={{ margin: 0 }}>{t.screenName}</p>
          <button type="button" className="chip" style={{ marginLeft: 'auto' }} onClick={toggleLang}>
            {lang === 'bn' ? 'English' : 'বাংলা'}
          </button>
        </header>

        <div style={{ display: 'flex', gap: 8, marginBottom: 22, flexWrap: 'wrap' }}>
          {CONDITIONS.map((entry) => (
            <button key={entry.id} type="button" className="chip" aria-pressed={condition === entry.id} onClick={() => setCondition(entry.id)}>
              {lang === 'bn' ? entry.bn : entry.en}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="t-body">…</p>
        ) : error ? (
          <p className="t-body" style={{ color: 'var(--stamp)' }}>{error}</p>
        ) : (
          <>
            {/* hero plate — origin area accent, decorative only */}
            <section style={{ position: 'relative', overflow: 'hidden', background: ORIGIN_AREA.a, border: '3px solid var(--cream)', padding: '22px 24px 0' }}>
              <div style={{ position: 'absolute', right: -10, top: -4, width: 150, color: 'var(--cream)', opacity: 0.14, pointerEvents: 'none' }}>
                <StadiumMotif />
              </div>
              <div className="t-label" style={{ color: 'var(--cream)', opacity: 0.8 }}>{t.onRoute}</div>
              <div className="t-brand" style={{ fontSize: 'clamp(28px,6vw,40px)', margin: '4px 0 3px', position: 'relative' }}>
                {lang === 'bn' ? ORIGIN_AREA.bn : ORIGIN_AREA.en}
              </div>
              <p className="t-body" style={{ color: 'var(--cream)', opacity: 0.85, marginBottom: 16 }}>
                {lang === 'bn' ? ORIGIN_AREA.noteBn : ORIGIN_AREA.noteEn}
              </p>
              <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                {options.map((option) => {
                  const label = OPTION_LABELS[option.id] || { bn: option.id, en: option.id };
                  const isSelected = option.id === selectedOptionId;

                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        setSelectedOptionId(option.id);
                        setSelectedLegIndex(0);
                      }}
                      style={{
                        background: isSelected ? 'var(--cream)' : 'transparent',
                        color: isSelected ? ORIGIN_AREA.a : 'var(--cream)',
                        border: '1.5px solid var(--cream)',
                        padding: '5px 12px',
                        cursor: 'pointer',
                        font: 'inherit',
                        fontWeight: 700,
                        fontSize: 13
                      }}
                    >
                      {lang === 'bn' ? label.bn : label.en}
                    </button>
                  );
                })}
              </div>
              {selectedOption && (
                <div style={{ display: 'flex', gap: 24, paddingBottom: 16 }}>
                  <div>
                    <span className="t-label" style={{ color: 'var(--cream)', opacity: 0.75, display: 'block' }}>{t.total}</span>
                    <b className="t-big" style={{ fontSize: 26 }}>{totalMinutes} {t.min}</b>
                  </div>
                  <div>
                    <span className="t-label" style={{ color: 'var(--cream)', opacity: 0.75, display: 'block' }}>{t.fare}</span>
                    <b className="t-big" style={{ fontSize: totalFare === null ? 15 : 26 }}>
                      {totalFare === null ? t.fareVaries : `৳${totalFare}`}
                    </b>
                  </div>
                </div>
              )}
              <div
                className="perf"
                style={{
                  '--perf-color': ORIGIN_AREA.a,
                  margin: '0 -24px'
                }}
              />
            </section>

            {selectedOption ? (
              <>
                <h2 className="t-section" style={{ margin: '26px 0 12px' }}>{t.belt}</h2>
                <div style={{ display: 'flex', height: 44, marginBottom: 10 }}>
                  {selectedOption.segments.map((segment, index) => {
                    const state = modeStates[segment.mode]?.state ?? 0;
                    const widthPercent = totalMinutes > 0 ? (segment.min / totalMinutes) * 100 : 0;
                    const isSelected = index === selectedLegIndex;

                    return (
                      <div key={`${segment.mode}-${index}`} style={{ position: 'relative', width: `${widthPercent}%` }}>
                        {isSelected ? (
                          <span
                            className="punch punch--selected"
                            style={{ position: 'absolute', top: -26, left: '50%', transform: 'translateX(-50%)' }}
                          />
                        ) : null}
                        <button
                          type="button"
                          onClick={() => setSelectedLegIndex(index)}
                          aria-label={`${segment.label.en} — ${segment.min} min`}
                          style={{
                            width: '100%',
                            height: 44,
                            background: slotColour(segment.mode, state),
                            border: 'none',
                            borderLeft: index === 0 ? 'none' : '2px solid var(--ground)',
                            cursor: 'pointer',
                            padding: 0
                          }}
                        />
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
                  {LEGEND.map((entry) => (
                    <div key={entry.en} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 10, height: 10, background: entry.colour, display: 'inline-block' }} />
                      <span className="t-body">{lang === 'bn' ? entry.bn : entry.en}</span>
                    </div>
                  ))}
                </div>

                {selectedLeg ? (
                  <div className="rule-hair" style={{ padding: '10px 0' }}>
                    <div className="t-place">{lang === 'bn' ? selectedLeg.label.bn : selectedLeg.label.en}</div>
                    <div className="t-body" style={{ marginTop: 6 }}>
                      {modeLabel(selectedLeg.mode, lang)} · {selectedLeg.min} {t.min}
                      {selectedLeg.fare > 0 ? ` · ৳${selectedLeg.fare}` : ''}
                    </div>
                    {selectedLegState ? (
                      <div className="t-body" style={{ marginTop: 6, color: slotColour(selectedLeg.mode, selectedLegState.state) }}>
                        {lang === 'bn' ? selectedLegState.reason.bn : selectedLegState.reason.en}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </>
            ) : (
              <p className="t-body">No options.</p>
            )}
          </>
        )}
      </div>
    </section>
  );
}

const LEGEND = [
  { colour: 'var(--sev-0)', bn: 'ঠিক আছে', en: 'Acceptable' },
  { colour: 'var(--sev-5)', bn: 'খারাপ', en: 'Bad' },
  { colour: 'var(--c20)', bn: 'শান্ত (হাঁটা)', en: 'Quiet (walking)' }
];

const TEXT = {
  bn: {
    screenName: 'জ্যাম বেল্ট',
    onRoute: 'রুটের শুরু', total: 'মোট সময়', fare: 'ভাড়া', min: 'মিনিট',
    belt: 'ধাপের বেল্ট', fareVaries: 'ভাড়া পরিবর্তনশীল'
  },
  en: {
    screenName: 'Jam Belt',
    onRoute: 'Route starts at', total: 'Total', fare: 'Fare', min: 'min',
    belt: 'Leg belt', fareVaries: 'Fare varies'
  }
};
