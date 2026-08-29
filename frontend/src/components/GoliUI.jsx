import { useEffect, useRef, useState } from 'react';
import '../styles/tokens.css';
import { useLanguage } from '../state/LanguageContext.jsx';
import { createRoute, getGraphSnapshot } from '../services/route.service.js';
import { getModeStates } from '../services/modes.service.js';
import { getCondition } from '../services/condition.service.js';
import { modeLabel } from '../utils/modes.js';
import { LocationSearchField } from './LocationSearchField.jsx';
import { useTrip } from '../state/TripContext.jsx';

const CONDITIONS = [
  { id: 'clear', bn: 'স্বাভাবিক চলাচল', en: 'Normal Flow' },
  { id: 'jam', bn: 'যানজটের চাপ', en: 'Congested Traffic' },
  { id: 'rain', bn: 'বৃষ্টি ও জলাবদ্ধতা', en: 'Rain & Waterlogging' }
];

const OPTION_LABELS = {
  metro: { bn: 'মেট্রোরেল', en: 'Metro' },
  bike: { bn: 'মোটরবাইক', en: 'Bike' },
  bus: { bn: 'পাবলিক বাস', en: 'Bus' },
  cng: { bn: 'সিএনজি', en: 'CNG' },
  rickshaw: { bn: 'রিকশা', en: 'Rickshaw' },
  walk: { bn: 'হাঁটা', en: 'Walk' }
};

function slotColour(mode, state) {
  if (mode === 'walk') {
    return 'var(--c45)';
  }
  return state === 0 ? 'var(--sev-0)' : state === 1 ? 'var(--sev-3)' : 'var(--sev-5)';
}

function slotStatusName(mode, state, lang) {
  if (mode === 'walk') {
    return lang === 'bn' ? 'হাঁটার সংযোগ' : 'Walking Link';
  }
  if (state === 0) {
    return lang === 'bn' ? 'স্বাভাবিক ও দ্রুত' : 'Smooth & Fast';
  }
  if (state === 1) {
    return lang === 'bn' ? 'মাঝারি জ্যাম' : 'Moderate Congestion';
  }
  return lang === 'bn' ? 'তীব্র যানজট' : 'Severe Jam';
}

const DEFAULT_ORIGIN = { lat: 23.8084, lng: 90.3682, label: 'মিরপুর ১০ / Mirpur 10' };
const DEFAULT_DESTINATION = { lat: 23.7281, lng: 90.4191, label: 'মতিঝিল / Motijheel' };

export function GoliUI() {
  const { lang } = useLanguage();
  const isEn = lang === 'en';

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
          setError(err.message || 'Error computing route segments.');
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
    <section className="belt-section" style={{ background: 'var(--ground)', color: 'var(--cream)', paddingBottom: 56, minHeight: '80vh' }}>
      <div className="page-wrap" style={{ '--wrap-max': '900px', paddingTop: 28 }}>
        
        {/* Page Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span className="live-dot" />
            <span className="t-label" style={{ color: 'var(--metro)', fontSize: 12 }}>
              {isEn ? 'TRAFFIC CONGESTION & SEGMENT ANALYSIS' : 'রিয়েলটাইম ট্র্যাফিক ও সেগমেন্ট বিশ্লেষণ'}
            </span>
          </div>
          <h1 className="t-brand" style={{ fontSize: 'clamp(24px, 4vw, 32px)', margin: '0 0 6px' }}>
            {isEn ? 'Dhaka Transit Congestion Belt' : 'ঢাকা ট্র্যাফিক জ্যাম বেল্ট'}
          </h1>
          <p className="t-body" style={{ color: 'var(--c70)', maxWidth: '65ch', margin: 0 }}>
            {isEn
              ? 'Analyze corridor travel times, road congestion severity, and multi-modal segment breakdowns across Dhaka.'
              : 'ঢাকার প্রধান করিডোরগুলোর ট্র্যাফিক অবস্থা, সেগমেন্ট অনুযায়ী যানজটের তীব্রতা এবং সম্ভাব্য সময় ও ভাড়ার বিস্তারিত বিশ্লেষণ।'}
          </p>
        </div>

        {/* Route Endpoint Picker Card */}
        <div className="panel" style={{ padding: '20px 22px', marginBottom: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
            <LocationSearchField
              label={isEn ? 'Starting Location (Origin)' : 'যাত্রার শুরুর স্থান (কোথা থেকে)'}
              placeholder={isEn ? 'e.g. Mirpur 10, Farmgate, Uttara...' : 'যেমন: মিরপুর ১০, ফার্মগেট, উত্তরা...'}
              stations={stations}
              value={origin.label ? origin : null}
              onSelect={(point) => setOrigin(point)}
              lang={lang}
            />
            <LocationSearchField
              label={isEn ? 'Destination (To)' : 'গন্তব্যস্থল (কোথায় যাবেন)'}
              placeholder={isEn ? 'e.g. Motijheel, Gulshan 2, Dhanmondi...' : 'যেমন: মতিঝিল, গুলশান ২, ধানমন্ডি...'}
              stations={stations}
              value={destination.label ? destination : null}
              onSelect={(point) => setDestination(point)}
              lang={lang}
            />
          </div>

          {/* Condition simulation chips */}
          <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <span className="t-label" style={{ color: 'var(--c70)', fontSize: 12 }}>
              {isEn ? 'Traffic Simulation Condition:' : 'ট্র্যাফিক পরিস্থিতির প্রভাব:'}
            </span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {CONDITIONS.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  className="chip"
                  aria-pressed={condition === entry.id}
                  onClick={() => handleConditionPick(entry.id)}
                  style={{ fontSize: 12.5, padding: '5px 12px' }}
                >
                  {isEn ? entry.en : entry.bn}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Loading / Error / Results */}
        {loading ? (
          <div className="panel" style={{ padding: 36, textAlign: 'center' }}>
            <p className="t-body" style={{ color: 'var(--c70)' }}>
              {isEn ? 'Calculating multi-modal route and congestion segments...' : 'মাল্টি-মোডাল রুট ও যানজটের সেগমেন্ট গণনা করা হচ্ছে...'}
            </p>
          </div>
        ) : error ? (
          <div className="panel" style={{ padding: 24, borderColor: 'var(--stamp)' }}>
            <p className="t-body" style={{ color: 'var(--stamp)', margin: 0 }}>{error}</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            
            {/* Route Summary & Transport Mode Selector */}
            <div className="panel" style={{ padding: '22px 24px' }}>
              {/* Origin to Destination title */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 16, paddingBottom: 14, borderBottom: '1px solid var(--line)' }}>
                <div>
                  <span className="t-label" style={{ color: 'var(--c45)', display: 'block', marginBottom: 2 }}>
                    {isEn ? 'SELECTED ROUTE CORRIDOR' : 'নির্বাচিত করিডোর'}
                  </span>
                  <h2 className="t-place" style={{ fontSize: 18, margin: 0, fontWeight: 700 }}>
                    {origin.label || (isEn ? 'Mirpur 10' : 'মিরপুর ১০')} <span style={{ color: 'var(--metro)', margin: '0 4px' }}>➔</span> {destination.label || (isEn ? 'Motijheel' : 'মতিঝিল')}
                  </h2>
                </div>

                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  <div style={{ textAlign: 'right' }}>
                    <span className="t-label" style={{ color: 'var(--c45)' }}>{isEn ? 'Total Time' : 'মোট আনুমানিক সময়'}</span>
                    <div className="t-big" style={{ fontSize: 24, color: 'var(--metro)' }}>
                      {totalMinutes} <span style={{ fontSize: 14, fontWeight: 600 }}>{isEn ? 'min' : 'মিনিট'}</span>
                    </div>
                  </div>

                  <div style={{ width: 1, height: 32, background: 'var(--line)' }} />

                  <div style={{ textAlign: 'right' }}>
                    <span className="t-label" style={{ color: 'var(--c45)' }}>{isEn ? 'Estimated Fare' : 'আনুমানিক ভাড়া'}</span>
                    <div className="t-big" style={{ fontSize: 24 }}>
                      {totalFare === null ? (isEn ? 'Varies' : 'পরিবর্তনশীল') : `৳${totalFare}`}
                    </div>
                  </div>
                </div>
              </div>

              {/* Mode Selector Tabs */}
              <div style={{ marginBottom: 18 }}>
                <span className="t-label" style={{ display: 'block', marginBottom: 8 }}>
                  {isEn ? 'Choose Transport Option:' : 'পরিবহন মাধ্যম পরিবর্তন করুন:'}
                </span>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {options.map((option) => {
                    const label = OPTION_LABELS[option.id] || { bn: option.id, en: option.id };
                    const isSelected = option.id === selectedOptionId;
                    const optMinutes = option.segments.reduce((sum, seg) => sum + seg.min, 0);

                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          setSelectedOptionId(option.id);
                          setSelectedLegIndex(0);
                        }}
                        className="chip"
                        aria-pressed={isSelected}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '8px 14px',
                          fontSize: 13.5
                        }}
                      >
                        <span>{isEn ? label.en : label.bn}</span>
                        <span style={{ opacity: 0.75, fontSize: 12 }}>({optMinutes} {isEn ? 'min' : 'মি.'})</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Congestion Belt Visualization */}
              {selectedOption && (
                <div style={{ marginTop: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span className="t-label" style={{ fontSize: 11.5, color: 'var(--cream)' }}>
                      {isEn ? 'SEGMENT CONGESTION BELT (CLICK TO INSPECT):' : 'ধাপভিত্তিক ট্র্যাফিক বেল্ট (বিস্তারিত দেখতে ক্লিক করুন):'}
                    </span>
                    <span className="t-label" style={{ color: 'var(--c45)' }}>
                      {selectedOption.segments.length} {isEn ? 'Segments' : 'টি সেগমেন্ট'}
                    </span>
                  </div>

                  {/* Multi-Segment Congestion Bar */}
                  <div style={{ display: 'flex', height: 40, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--line)', marginBottom: 12 }}>
                    {selectedOption.segments.map((segment, index) => {
                      const state = modeStates[segment.mode]?.state ?? 0;
                      const widthPercent = totalMinutes > 0 ? (segment.min / totalMinutes) * 100 : 100 / selectedOption.segments.length;
                      const isSelected = index === selectedLegIndex;

                      return (
                        <button
                          key={`${segment.mode}-${index}`}
                          type="button"
                          onClick={() => setSelectedLegIndex(index)}
                          aria-label={`${segment.label.en} — ${segment.min} min`}
                          title={`${isEn ? segment.label.en : segment.label.bn} (${segment.min} ${isEn ? 'min' : 'মিনিট'})`}
                          style={{
                            width: `${Math.max(widthPercent, 8)}%`,
                            height: '100%',
                            background: slotColour(segment.mode, state),
                            border: 'none',
                            borderRight: index < selectedOption.segments.length - 1 ? '2px solid var(--ground)' : 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ffffff',
                            fontWeight: 700,
                            fontSize: 12,
                            padding: '0 4px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            outline: isSelected ? '3px solid var(--cream)' : 'none',
                            outlineOffset: -3,
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {segment.min}m
                        </button>
                      );
                    })}
                  </div>

                  {/* Congestion Legend */}
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', paddingTop: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--c70)' }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--sev-0)' }} />
                      <span>{isEn ? 'Normal Flow' : 'স্বাভাবিক চলাচল'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--c70)' }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--sev-3)' }} />
                      <span>{isEn ? 'Moderate Traffic' : 'মাঝারি যানজট'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--c70)' }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--sev-5)' }} />
                      <span>{isEn ? 'Severe Congestion' : 'তীব্র যানজট'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--c70)' }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--c45)' }} />
                      <span>{isEn ? 'Pedestrian Walkway' : 'হাঁটার পথ'}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Selected Segment Detailed Inspector Card */}
            {selectedLeg && (
              <div className="panel" style={{ padding: '18px 22px', borderLeft: `4px solid ${slotColour(selectedLeg.mode, selectedLegState?.state ?? 0)}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                  <div>
                    <span className="t-label" style={{ color: 'var(--c45)', fontSize: 11 }}>
                      {isEn ? `SEGMENT ${selectedLegIndex + 1} OF ${selectedOption.segments.length}` : `ধাপ ${selectedLegIndex + 1} / ${selectedOption.segments.length}`}
                    </span>
                    <h3 className="t-place" style={{ fontSize: 17, margin: '2px 0 0', fontWeight: 700 }}>
                      {isEn ? selectedLeg.label.en : selectedLeg.label.bn}
                    </h3>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="t-label" style={{
                      padding: '4px 10px',
                      borderRadius: 4,
                      background: 'var(--ground)',
                      color: slotColour(selectedLeg.mode, selectedLegState?.state ?? 0),
                      fontSize: 12,
                      fontWeight: 700
                    }}>
                      {slotStatusName(selectedLeg.mode, selectedLegState?.state ?? 0, lang)}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--line)' }}>
                  <div className="t-body" style={{ color: 'var(--cream)', fontWeight: 600 }}>
                    {modeLabel(selectedLeg.mode, lang)} · {selectedLeg.min} {isEn ? 'min' : 'মিনিট'}
                    {selectedLeg.fare > 0 ? ` · ৳${selectedLeg.fare}` : ''}
                  </div>
                  {selectedLegState?.reason && (
                    <div className="t-body" style={{ color: 'var(--c70)', fontSize: 13, marginLeft: 'auto' }}>
                      {isEn ? selectedLegState.reason.en : selectedLegState.reason.bn}
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        )}
      </div>
    </section>
  );
}
