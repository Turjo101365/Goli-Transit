import { useEffect, useState } from 'react';
import '../styles/tokens.css';
import { useLanguage } from '../state/LanguageContext.jsx';
import { getModeStates } from '../services/modes.service.js';
import { evaluateJourney } from '../services/journey.service.js';
import { formatMinutesOfDay } from '../utils/format.js';
import { MODE_META, modeLabel } from '../utils/modes.js';
import { ModeIcon } from './ModeIcon.jsx';

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
// against. There is no location UI yet, so this is a fixed stand-in
// position — the same precedent as routeOptions.service.js's frozen
// Mirpur10->Motijheel /route contract, not an invented result: every
// number below (stayEta, the switch, minutesSaved, the alert decision)
// is computed live by the real POST /journey/evaluate endpoint.
const DEMO_POSITION = { lat: 23.7992, lng: 90.372, currentMode: 'bus', destinationNodeId: 'mrt_motijheel' };
const POSITION_LABEL = { bn: 'কাজীপাড়া', en: 'Kazipara' };

const BRAND = 'ফুরুৎ';
const STATUS_COLOR = ['var(--sev-0)', 'var(--sev-2)', 'var(--sev-4)'];

function statusIndex(arriveMinuteOfDay, deadlineMinuteOfDay) {
  if (arriveMinuteOfDay > deadlineMinuteOfDay) {
    return 2;
  }

  return deadlineMinuteOfDay - arriveMinuteOfDay < 15 ? 1 : 0;
}

export function LiveJourney() {
  const { lang, toggleLang } = useLanguage();
  const t = TEXT[lang];

  const [condition, setCondition] = useState('clear');
  const [modes, setModes] = useState([]);
  const [modesLoading, setModesLoading] = useState(true);
  const [modesError, setModesError] = useState(null);

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
    let cancelled = false;
    setEvalLoading(true);
    setEvalError(null);

    evaluateJourney({ ...DEMO_POSITION, deadlineMinutes: deadline })
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
    // deadline is passed to the API but unused by its logic today — refetch
    // isn't needed per chip click, this only reruns on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          <button type="button" className="chip" style={{ marginLeft: 'auto' }} onClick={toggleLang}>
            {lang === 'bn' ? 'English' : 'বাংলা'}
          </button>
        </header>

        {/* live status */}
        <div className="panel" style={{ borderLeft: `5px solid ${statusColor}`, display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'baseline', padding: '13px 15px' }}>
          <Field label={t.onboard}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--mode-bus)' }}>
              <ModeIcon mode="bus" size={17} />
              {modeLabel('bus', lang)}
            </span>
          </Field>
          <Field label={t.at}>{lang === 'bn' ? POSITION_LABEL.bn : POSITION_LABEL.en}</Field>
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

        <div style={{ display: 'flex', gap: 8, margin: '8px 0 24px', flexWrap: 'wrap', alignItems: 'center' }}>
          <span className="t-label" style={{ marginRight: 2 }}>{t.condLabel}</span>
          {CONDITIONS.map((entry) => (
            <button key={entry.id} type="button" className="chip" aria-pressed={condition === entry.id} onClick={() => setCondition(entry.id)}>
              {lang === 'bn' ? entry.bn : entry.en}
            </button>
          ))}
        </div>

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
    evalDown: 'এই মুহূর্তে সিদ্ধান্তের হিসাব পাওয়া যাচ্ছে না।'
  },
  en: {
    screenName: 'Live Journey',
    onboard: 'You are on', at: 'Position', arrive: 'You arrive', deadline: 'Arrive by',
    deadlineLabel: 'Arrive by', condLabel: 'Condition',
    ok: 'You will make it', tight: 'It will be tight', late: 'You will be late',
    act: 'Get off now', stay: 'Staying on the bus', saves: 'Saves',
    extra: 'Extra fare', min: 'min',
    why: 'What is working right now', noAlert: 'No need to switch. Stay on the bus.',
    evalDown: 'The live decision can’t be computed right now.'
  }
};
