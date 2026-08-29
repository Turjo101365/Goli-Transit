import { useEffect, useRef, useState } from 'react';
import '../styles/tokens.css';
import { useLanguage } from '../state/LanguageContext.jsx';
import { createRoute, getGraphSnapshot } from '../services/route.service.js';
import { getModeStates } from '../services/modes.service.js';
import { getCondition } from '../services/condition.service.js';
import { modeLabel } from '../utils/modes.js';
import { LocationSearchField } from './LocationSearchField.jsx';
import { useTrip } from '../state/TripContext.jsx';

const BRAND = 'EZZ GO';

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

function slotColour(mode, state) {
  if (mode === 'walk') {
    return 'var(--c20)';
  }

  return state === 0 ? 'var(--sev-0)' : state === 1 ? 'var(--sev-3)' : 'var(--sev-5)';
}

const ORIGIN_AREA = {
  bn: 'মিরপুর ১০', en: 'Mirpur 10',
  noteBn: 'স্টেডিয়াম ও বেনারসি পল্লি', noteEn: 'The stadium and the Benarasi looms',
  a: '#1F7A4E', b: '#D9A441'
};

function StadiumMotif() {
  const p = { fill: 'none', stroke: 'currentColor', strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round' };
  return (
    <svg viewBox="0 0 84 92" aria-hidden="true" style={{ width: '100%', height: 'auto' }}>
      <path {...p} d="M28 74V30M42 74V30M56 74V30M24 30h36" />
      <circle {...p} cx="66" cy="66" r="9" />
    </svg>
  );
}

const DEFAULT_ORIGIN = { lat: 23.8084, lng: 90.3682, label: 'মিরপুর ১০ / Mirpur 10' };
const DEFAULT_DESTINATION = { lat: 23.7281, lng: 90.4191, label: 'মতিঝিল / Motijheel' };

export function EzzGoBelt() {
  const { lang } = useLanguage();
  const t = TEXT[lang];

  const [condition, setCondition] = useState('clear');
  const [options, setOptions] = useState([]);
  const [modeStates, setModeStates] = useState({});
  const [selectedOptionId, setSelectedOptionId] = useState('metro');
  const [selectedLegIndex, setSelectedLegIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stations, setStations] = useState([]);

  const { origin: sharedOrigin, setOrigin, destination: sharedDestination, setDestination } = useTrip();
  const origin = sharedOrigin || DEFAULT_ORIGIN;
  const destination = sharedDestination || DEFAULT_DESTINATION;
  const userChangedConditionRef = useRef(false);

  useEffect(() => {
    getGraphSnapshot()
      .then((snapshot) => {
        const list = (snapshot.nodes || [])
          .filter((node) => node.metadata?.type === 'metro_station')
          .map((node) => ({
            id: node.id,
            nameBn: node.metadata.nameBn,
            nameEn: node.metadata.nameEn,
            lat: node.metadata.lat,
            lng: node.metadata.lng
          }));
        setStations(list);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    getCondition()
      .then((data) => {
        if (!userChangedConditionRef.current && data.trafficCondition) {
          setCondition(data.trafficCondition);
        }
      })
      .catch(() => {});
  }, []);

  function handleConditionPick(id) {
    userChangedConditionRef.current = true;
    setCondition(id);
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      createRoute({
        originLat: origin.lat,
        originLng: origin.lng,
        destinationLat: destination.lat,
        destinationLng: destination.lng
      }),
      getModeStates(condition)
    ])
      .then(([routeResult, modesResult]) => {
        if (cancelled) return;

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
  }, [condition, origin.lat, origin.lng, destination.lat, destination.lng]);

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
          height: 6,
          background: `repeating-linear-gradient(115deg, ${ORIGIN_AREA.a} 0 16px, ${ORIGIN_AREA.b} 16px 26px, var(--line) 26px 30px, ${ORIGIN_AREA.a} 30px 34px)`
        }}
      />

      <div className="page-wrap" style={{ paddingTop: 20 }}>
        <header style={{ display: 'flex', alignItems: 'baseline', gap: 12, padding: '10px 0 16px' }}>
          <h1 className="t-brand" style={{ fontSize: 24, fontWeight: 500 }}>{BRAND}</h1>
          <p className="t-label" lang={lang} style={{ margin: 0, fontWeight: 500 }}>{t.screenName}</p>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 14 }}>
          <LocationSearchField
            label={t.fromLabel}
            placeholder={t.searchPlaceholder}
            stations={stations}
            value={origin.label ? origin : null}
            onSelect={(point) => setOrigin(point)}
            lang={lang}
          />
          <LocationSearchField
            label={t.toLabel}
            placeholder={t.searchPlaceholder}
            stations={stations}
            value={destination.label ? destination : null}
            onSelect={(point) => setDestination(point)}
            lang={lang}
          />
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {CONDITIONS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className="chip"
              aria-pressed={condition === entry.id}
              onClick={() => handleConditionPick(entry.id)}
              style={{ fontWeight: 500, fontSize: 13 }}
            >
              {lang === 'bn' ? entry.bn : entry.en}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="t-body" style={{ fontWeight: 400 }}>…</p>
        ) : error ? (
          <p className="t-body" style={{ color: 'var(--stamp)', fontWeight: 400 }}>{error}</p>
        ) : (
          <>
            {/* Hero plate with original styling & high-contrast clean text */}
            <section style={{ position: 'relative', overflow: 'hidden', background: ORIGIN_AREA.a, border: '2px solid rgba(255,255,255,0.2)', borderRadius: 10, padding: '20px 22px 0', color: '#F4EFE3' }}>
              <div style={{ position: 'absolute', right: -10, top: -4, width: 140, color: '#F4EFE3', opacity: 0.16, pointerEvents: 'none' }}>
                <StadiumMotif />
              </div>
              <div className="t-label" style={{ color: '#F4EFE3', opacity: 0.8, fontWeight: 500, fontSize: 11 }}>{t.onRoute}</div>
              <div className="t-brand" style={{ fontSize: 'clamp(24px,5vw,34px)', margin: '3px 0 2px', position: 'relative', fontWeight: 500, color: '#F4EFE3' }}>
                {origin.label || (lang === 'bn' ? ORIGIN_AREA.bn : ORIGIN_AREA.en)}
              </div>
              <p className="t-body" style={{ color: '#F4EFE3', opacity: 0.85, marginBottom: 14, fontWeight: 400 }}>
                {origin.label
                  ? `${t.toWord} ${destination.label || '…'}`
                  : (lang === 'bn' ? ORIGIN_AREA.noteBn : ORIGIN_AREA.noteEn)}
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
                        background: isSelected ? '#F4EFE3' : 'rgba(255,255,255,0.1)',
                        color: isSelected ? ORIGIN_AREA.a : '#F4EFE3',
                        border: '1px solid rgba(255,255,255,0.35)',
                        borderRadius: 5,
                        padding: '5px 12px',
                        cursor: 'pointer',
                        font: 'inherit',
                        fontWeight: 500,
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
                    <span className="t-label" style={{ color: '#F4EFE3', opacity: 0.8, display: 'block', fontWeight: 500, fontSize: 11 }}>{t.total}</span>
                    <span className="t-big" style={{ fontSize: 24, fontWeight: 600, color: '#F4EFE3' }}>{totalMinutes} {t.min}</span>
                  </div>
                  <div>
                    <span className="t-label" style={{ color: '#F4EFE3', opacity: 0.8, display: 'block', fontWeight: 500, fontSize: 11 }}>{t.fare}</span>
                    <span className="t-big" style={{ fontSize: totalFare === null ? 15 : 24, fontWeight: 600, color: '#F4EFE3' }}>
                      {totalFare === null ? t.fareVaries : `৳${totalFare}`}
                    </span>
                  </div>
                </div>
              )}
            </section>

            {selectedOption ? (
              <>
                <h2 className="t-section" style={{ margin: '22px 0 10px', fontWeight: 500, fontSize: 16 }}>{t.belt}</h2>
                <div style={{ display: 'flex', height: 40, marginBottom: 12, borderRadius: 6, overflow: 'hidden' }}>
                  {selectedOption.segments.map((segment, index) => {
                    const state = modeStates[segment.mode]?.state ?? 0;
                    const widthPercent = totalMinutes > 0 ? (segment.min / totalMinutes) * 100 : 0;
                    const isSelected = index === selectedLegIndex;

                    return (
                      <div key={`${segment.mode}-${index}`} style={{ position: 'relative', width: `${widthPercent}%` }}>
                        {isSelected ? (
                          <span
                            className="punch punch--selected"
                            style={{ position: 'absolute', top: -22, left: '50%', transform: 'translateX(-50%)' }}
                          />
                        ) : null}
                        <button
                          type="button"
                          onClick={() => setSelectedLegIndex(index)}
                          aria-label={`${segment.label.en} — ${segment.min} min`}
                          style={{
                            width: '100%',
                            height: 40,
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

                <div style={{ display: 'flex', gap: 16, marginBottom: 18, flexWrap: 'wrap' }}>
                  {LEGEND.map((entry) => (
                    <div key={entry.en} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 9, height: 9, borderRadius: 2, background: entry.colour, display: 'inline-block' }} />
                      <span className="t-body" style={{ fontSize: 13, fontWeight: 400 }}>{lang === 'bn' ? entry.bn : entry.en}</span>
                    </div>
                  ))}
                </div>

                {selectedLeg ? (
                  <div className="panel" style={{ padding: '14px 16px', borderRadius: 8 }}>
                    <div className="t-place" style={{ fontWeight: 500, fontSize: 16 }}>{lang === 'bn' ? selectedLeg.label.bn : selectedLeg.label.en}</div>
                    <div className="t-body" style={{ marginTop: 4, fontWeight: 400, fontSize: 13.5 }}>
                      {modeLabel(selectedLeg.mode, lang)} · {selectedLeg.min} {t.min}
                      {selectedLeg.fare > 0 ? ` · ৳${selectedLeg.fare}` : ''}
                    </div>
                    {selectedLegState ? (
                      <div className="t-body" style={{ marginTop: 4, color: slotColour(selectedLeg.mode, selectedLegState.state), fontWeight: 500, fontSize: 13 }}>
                        {lang === 'bn' ? selectedLegState.reason.bn : selectedLegState.reason.en}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </>
            ) : (
              <p className="t-body" style={{ fontWeight: 400 }}>No options.</p>
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
    belt: 'ধাপের বেল্ট', fareVaries: 'ভাড়া পরিবর্তনশীল',
    fromLabel: 'কোথা থেকে', toLabel: 'কোথায় যাবেন', searchPlaceholder: 'জায়গার নাম লিখুন', toWord: '→'
  },
  en: {
    screenName: 'Jam Belt',
    onRoute: 'Route starts at', total: 'Total', fare: 'Fare', min: 'min',
    belt: 'Leg belt', fareVaries: 'Fare varies',
    fromLabel: 'From', toLabel: 'To', searchPlaceholder: 'Type a place name', toWord: '→'
  }
};
