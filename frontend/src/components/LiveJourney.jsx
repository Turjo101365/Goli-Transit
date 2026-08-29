import { useEffect, useRef, useState } from 'react';
import '../styles/tokens.css';
import { useLanguage } from '../state/LanguageContext.jsx';
import { getModeStates } from '../services/modes.service.js';
import { evaluateJourney } from '../services/journey.service.js';
import { getCondition } from '../services/condition.service.js';
import { getGraphSnapshot } from '../services/route.service.js';
import { formatMinutesOfDay } from '../utils/format.js';
import { MODE_META, modeLabel } from '../utils/modes.js';
import { nearestStation } from '../utils/geo.js';
import { ModeIcon } from './ModeIcon.jsx';
import { LocationSearchField } from './LocationSearchField.jsx';
import { useTrip } from '../state/TripContext.jsx';

const MODE_ORDER = ['walk', 'metro', 'bus', 'rickshaw', 'bike', 'cng'];

const CONDITIONS = [
  { id: 'clear', bn: 'পরিষ্কার', en: 'Clear' },
  { id: 'jam', bn: 'সামনে জ্যাম', en: 'Jam ahead' },
  { id: 'rain', bn: 'বৃষ্টি শুরু', en: 'Rain starting' }
];

const DEADLINE_OFFSETS_MIN = [20, 45, 75];

// Arrive-by options relative to when this screen opened, not a fixed clock
// time — every rider gets their own set. Rounds up to the next 15-minute
// mark first so the times read clean.
function buildDeadlineOptions(referenceDate) {
  const nowMinutes = referenceDate.getHours() * 60 + referenceDate.getMinutes();
  const remainder = nowMinutes % 15;
  const rounded = nowMinutes + (15 - remainder);
  return DEADLINE_OFFSETS_MIN.map((offset) => rounded + offset);
}

// Kazipara -> Motijheel, on a bus: the same worked scenario the backend
// playbook (docs/PROPOSAL.md) and the mode matrix were built and tested
// against — kept only as the initial default now that position, mode and
// destination are all pickable below. Every number on screen (stayEta,
// the switch, minutesSaved, the alert decision) is computed live by the
// real POST /journey/evaluate endpoint for whatever is currently picked.
const DEFAULT_POSITION = { lat: 23.7992, lng: 90.372, label: 'কাজীপাড়া / Kazipara' };
const DEFAULT_DESTINATION = { nodeId: 'mrt_motijheel', label: 'মতিঝিল / Motijheel' };

const BRAND = 'EZZ GO';
const STATUS_COLOR = ['var(--sev-0)', 'var(--sev-2)', 'var(--sev-4)'];

function statusIndex(arriveMinuteOfDay, deadlineMinuteOfDay) {
  if (arriveMinuteOfDay > deadlineMinuteOfDay) {
    return 2;
  }

  return deadlineMinuteOfDay - arriveMinuteOfDay < 15 ? 1 : 0;
}

export function LiveJourney() {
  const { lang } = useLanguage();
  const t = TEXT[lang];

  const [condition, setCondition] = useState('clear');
  const [modes, setModes] = useState([]);
  const [modesLoading, setModesLoading] = useState(true);
  const [modesError, setModesError] = useState(null);
  const [activeWindow, setActiveWindow] = useState(null);
  const [highAlertZones, setHighAlertZones] = useState([]);
  const [stations, setStations] = useState([]);
  // Shared with Map and Belt (TripContext) — a point picked there shows up
  // here too, as this screen's position ("from") and destination.
  const { origin: sharedPosition, setOrigin: setSharedPosition, destination: sharedDestination, setDestination: setSharedDestination } = useTrip();
  const position = sharedPosition || DEFAULT_POSITION;
  const [currentMode, setCurrentMode] = useState('bus');
  // The shared destination may be an arbitrary point (picked on Map/Belt,
  // not necessarily a station) but POST /journey/evaluate needs a real
  // destinationNodeId — snap to the nearest real station when the shared
  // pick isn't a station itself.
  const destination = sharedDestination
    ? sharedDestination.nodeId
      ? sharedDestination
      : { ...sharedDestination, nodeId: nearestStation(sharedDestination, stations)?.station.id }
    : DEFAULT_DESTINATION;
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

  // Real auto-detected condition (live weather + the school/office/Jummah
  // peak schedule, GET /condition) — becomes the default the first time it
  // resolves, unless the rider has already picked a condition chip
  // themselves (manual "what if" exploration always wins).
  useEffect(() => {
    getCondition()
      .then((data) => {
        setActiveWindow(data.activeWindow);
        setHighAlertZones(data.highAlertZones || []);
        if (!userChangedConditionRef.current) {
          setCondition(data.trafficCondition);
        }
      })
      .catch(() => {});
  }, []);

  function handleConditionPick(id) {
    userChangedConditionRef.current = true;
    setCondition(id);
  }

  const [evaluation, setEvaluation] = useState(null);
  const [evalLoading, setEvalLoading] = useState(true);
  const [evalError, setEvalError] = useState(null);
  const [deadlineOptions] = useState(() => buildDeadlineOptions(new Date()));
  const [deadline, setDeadline] = useState(() => deadlineOptions[1]);

  useEffect(() => {
    let cancelled = false;
    setModesLoading(true);
    setModesError(null);

    getModeStates(condition)
      .then((data) => {
        if (!cancelled) {
          setModes(data.modes || []);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setModesError(err.message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setModesLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [condition]);

  useEffect(() => {
    // destinationNodeId may still be resolving — a shared destination from
    // Map/Belt that isn't itself a station needs `stations` to load first
    // (nearestStation snap above). Don't fire a request that's certain to
    // fail validation; the effect re-runs once destination.nodeId settles.
    if (!destination.nodeId) {
      return undefined;
    }

    let cancelled = false;
    setEvalLoading(true);
    setEvalError(null);

    evaluateJourney({
      lat: position.lat,
      lng: position.lng,
      currentMode,
      destinationNodeId: destination.nodeId,
      deadlineMinutes: deadline
    })
      .then((data) => {
        if (!cancelled) {
          setEvaluation(data);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setEvalError(err.message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setEvalLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
    // deadline itself is validated but unused by the backend's decision
    // logic today, so it's deliberately left out of this dependency list —
    // only position/mode/destination changes need a fresh evaluation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position.lat, position.lng, currentMode, destination.nodeId]);

  const now = new Date();
  const nowMinuteOfDay = now.getHours() * 60 + now.getMinutes();
  const stayArrive = evaluation ? nowMinuteOfDay + evaluation.stayEta : null;
  const status = stayArrive !== null ? statusIndex(stayArrive, deadline) : 0;
  const statusColor = STATUS_COLOR[status];

  return (
    <section style={{ background: 'var(--ground)', color: 'var(--cream)', padding: '28px 0 48px', minHeight: '100vh' }}>
      <div className="page-wrap">
        <header style={{ display: 'flex', alignItems: 'baseline', gap: 12, paddingBottom: 14 }}>
          <h1 className="t-brand">{BRAND}</h1>
          <p className="t-label" lang={lang} style={{ margin: 0 }}>{t.screenName}</p>
        </header>

        {/* pick your own scenario */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10, marginBottom: 10 }}>
          <LocationSearchField
            label={t.at}
            placeholder={t.searchPlaceholder}
            stations={stations}
            value={position.label ? position : null}
            onSelect={(point) => setSharedPosition(point)}
            lang={lang}
          />
          <LocationSearchField
            label={t.destLabel}
            placeholder={t.searchPlaceholder}
            stations={stations}
            restrictToStations
            value={destination.label ? destination : null}
            onSelect={(point) => setSharedDestination(point)}
            lang={lang}
          />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '0 0 16px' }}>
          <span className="t-label" style={{ marginRight: 2, alignSelf: 'center' }}>{t.modeLabel}</span>
          {MODE_ORDER.map((mode) => (
            <button
              key={mode}
              type="button"
              className="chip"
              aria-pressed={currentMode === mode}
              onClick={() => setCurrentMode(mode)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
            >
              <ModeIcon mode={mode} size={14} />
              {modeLabel(mode, lang)}
            </button>
          ))}
        </div>

        {/* live status */}
        <div className="panel" style={{ borderLeft: `5px solid ${statusColor}`, display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'baseline', padding: '13px 15px' }}>
          <Field label={t.onboard}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: `var(${MODE_META[currentMode].colorVar})` }}>
              <ModeIcon mode={currentMode} size={17} />
              {modeLabel(currentMode, lang)}
            </span>
          </Field>
          <Field label={t.at}>{position.label || '…'}</Field>
          <Field label={t.arrive}>{stayArrive !== null ? formatMinutesOfDay(stayArrive, lang) : '…'}</Field>
          <Field label={t.deadline}>{formatMinutesOfDay(deadline, lang)}</Field>
          <div className="t-big" style={{ marginLeft: 'auto', fontSize: 17, color: statusColor }}>
            {[t.ok, t.tight, t.late][status]}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, margin: '16px 0 4px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="t-label" style={{ marginRight: 2 }}>{t.deadlineLabel}</span>
          {deadlineOptions.map((d) => (
            <button key={d} type="button" className="chip" aria-pressed={deadline === d} onClick={() => setDeadline(d)}>
              {formatMinutesOfDay(d, lang)}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, margin: '8px 0 4px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="t-label" style={{ marginRight: 2 }}>{t.condLabel}</span>
          {CONDITIONS.map((entry) => (
            <button key={entry.id} type="button" className="chip" aria-pressed={condition === entry.id} onClick={() => handleConditionPick(entry.id)}>
              {lang === 'bn' ? entry.bn : entry.en}
            </button>
          ))}
        </div>

        {activeWindow ? (
          <div className="panel" style={{ borderLeft: '5px solid var(--sev-3)', padding: '12px 15px', margin: '16px 0 24px' }}>
            <p className="t-label" style={{ color: 'var(--sev-3)' }}>{t.autoJam}</p>
            <p className="t-place" style={{ marginTop: 2 }}>
              {lang === 'bn' ? activeWindow.labelBn : activeWindow.labelEn}
            </p>
            <p className="t-body" style={{ color: 'var(--c70)', marginTop: 3 }}>
              {lang === 'bn' ? activeWindow.reasonBn : activeWindow.reasonEn}
            </p>
            {highAlertZones.length > 0 ? (
              <p className="t-label" style={{ marginTop: 8 }}>
                {t.zonesLabel}: {highAlertZones.map((zone) => (lang === 'bn' ? zone.bn : zone.en)).join(' · ')}
              </p>
            ) : null}
          </div>
        ) : (
          <div style={{ margin: '8px 0 24px' }} />
        )}

        {/* the decision */}
        {evalLoading ? (
          <p className="t-body">…</p>
        ) : evalError ? (
          <div className="panel" style={{ borderLeft: '5px solid var(--stamp)', padding: '13px 15px' }}>
            <p className="t-place">{t.evalDown}</p>
            <p className="t-label" style={{ marginTop: 4 }}>{evalError}</p>
          </div>
        ) : evaluation?.shouldAlert && evaluation.bestSwitch ? (
          <section style={{ background: statusColor, color: '#0E1519', border: '3px solid var(--cream)', padding: '20px 20px 18px' }}>
            <div className="t-label" style={{ color: 'inherit', opacity: 0.75 }}>
              {lang === 'bn' ? evaluation.reason.bn : evaluation.reason.en}
            </div>
            <h2 className="t-brand" style={{ fontSize: 'clamp(30px,7vw,46px)', margin: '5px 0 3px' }}>{t.act}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', paddingBottom: 14 }}>
              {evaluation.bestSwitch.segments.map((segment, index) => (
                <span key={index} style={{ display: 'contents' }}>
                  {index > 0 && <span style={{ opacity: 0.5 }}>›</span>}
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      padding: '4px 10px 4px 7px',
                      color: 'var(--cream)',
                      background: `var(${MODE_META[segment.mode].colorVar})`,
                      fontSize: 13,
                      fontWeight: 600
                    }}
                  >
                    <ModeIcon mode={segment.mode} size={15} />
                    {modeLabel(segment.mode, lang)} {segment.min}{lang === 'bn' ? 'মি' : 'm'}
                  </span>
                </span>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', paddingBottom: 4 }}>
              <MiniStat label={t.saves} value={`${evaluation.bestSwitch.minutesSaved} ${t.min}`} />
              <MiniStat label={t.extra} value={evaluation.bestSwitch.fare ? `৳${evaluation.bestSwitch.fare}` : '—'} />
              <MiniStat label={t.stay} value={formatMinutesOfDay(stayArrive, lang)} />
            </div>
          </section>
        ) : (
          <div style={{ border: '2px dashed var(--line)', padding: '22px 20px', textAlign: 'center' }}>
            <p className="t-place">{evaluation?.reason ? (lang === 'bn' ? evaluation.reason.bn : evaluation.reason.en) : t.noAlert}</p>
          </div>
        )}

        {/* the mode matrix, visible */}
        <h2 className="t-section" style={{ margin: '28px 0 10px' }}>{t.why}</h2>
        {modesLoading ? (
          <p className="t-body">…</p>
        ) : modesError ? (
          <p className="t-body" style={{ color: 'var(--stamp)' }}>{modesError}</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))', gap: 8 }}>
            {modes.map((entry) => (
              <div
                key={entry.mode}
                className="panel"
                style={{ padding: '10px 12px', opacity: entry.state === 2 ? 0.45 : 1 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'var(--data)', fontWeight: 700, fontSize: 15 }}>
                  <span style={{ color: `var(${MODE_META[entry.mode].colorVar})` }}>
                    <ModeIcon mode={entry.mode} size={17} />
                  </span>
                  <span>{modeLabel(entry.mode, lang)}</span>
                  <span
                    style={{
                      marginLeft: 'auto',
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: STATUS_COLOR[entry.state] || STATUS_COLOR[0]
                    }}
                  />
                </div>
                <p className="t-body" style={{ marginTop: 4, color: 'var(--c70)', fontSize: 11.5, lineHeight: 1.45 }}>
                  {lang === 'bn' ? entry.reason.bn : entry.reason.en}
                  {entry.fareMultiplier !== 1 ? ` · ৳×${entry.fareMultiplier}` : ''}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <span className="t-label" style={{ display: 'block', marginBottom: 2 }}>{label}</span>
      <b className="t-big" style={{ fontSize: 19 }}>{children}</b>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div>
      <span className="t-label" style={{ display: 'block', color: 'inherit', opacity: 0.68, marginBottom: 1 }}>{label}</span>
      <b className="t-big" style={{ fontSize: 22 }}>{value}</b>
    </div>
  );
}

const TEXT = {
  bn: {
    screenName: 'লাইভ জার্নি',
    onboard: 'আপনি এখন', at: 'অবস্থান', arrive: 'পৌঁছাবেন', deadline: 'পৌঁছাতে হবে',
    deadlineLabel: 'পৌঁছাতে হবে', condLabel: 'পরিস্থিতি',
    ok: 'সময়মতো পৌঁছাবেন', tight: 'টাইট হবে', late: 'দেরি হয়ে যাবে',
    act: 'নেমে পড়ুন', stay: 'বাসে থাকলে', saves: 'বাঁচবে',
    extra: 'বাড়তি ভাড়া', min: 'মিনিট',
    why: 'এখন কোনটা চলছে', noAlert: 'এখনই নামার দরকার নেই। বাসেই থাকুন।',
    evalDown: 'এই মুহূর্তে সিদ্ধান্তের হিসাব পাওয়া যাচ্ছে না।',
    autoJam: 'এখন যানজটের সময়', zonesLabel: 'বেশি ঝুঁকিপূর্ণ এলাকা',
    destLabel: 'গন্তব্য স্টেশন', modeLabel: 'বাহন', searchPlaceholder: 'জায়গার নাম লিখুন'
  },
  en: {
    screenName: 'Live Journey',
    onboard: 'You are on', at: 'Position', arrive: 'You arrive', deadline: 'Arrive by',
    deadlineLabel: 'Arrive by', condLabel: 'Condition',
    ok: 'You will make it', tight: 'It will be tight', late: 'You will be late',
    act: 'Get off now', stay: 'Staying on the bus', saves: 'Saves',
    extra: 'Extra fare', min: 'min',
    why: 'What is working right now', noAlert: 'No need to switch. Stay on the bus.',
    evalDown: 'The live decision can’t be computed right now.',
    autoJam: 'This is a scheduled peak window', zonesLabel: 'Highest-risk areas',
    destLabel: 'Destination station', modeLabel: 'Mode', searchPlaceholder: 'Type a place name'
  }
};
