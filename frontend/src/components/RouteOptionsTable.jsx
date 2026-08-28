import '../styles/tokens.css';
import { toBanglaDigits } from '../utils/format.js';

const GRID_TEMPLATE = '26px 1fr 58px 68px 58px';
const SPREAD_THRESHOLD = 28; // p90 - p50, minutes — beyond this the option reads as unreliable
const AXIS_MAX_MINUTES = 130;
const AXIS_TICKS = [30, 60, 90, 120];

const MODE_LABELS = {
	walk: { bn: 'হাঁটা', en: 'Walk' },
	metro: { bn: 'মেট্রো', en: 'Metro' },
	bus: { bn: 'বাস', en: 'Bus' },
	rickshaw: { bn: 'রিকশা', en: 'Rickshaw' },
	bike: { bn: 'বাইক', en: 'Bike' },
	cng: { bn: 'সিএনজি', en: 'CNG' }
};

function t(bn, en, lang) {
	return lang === 'en' ? en : bn;
}

function num(value, lang) {
	return lang === 'bn' ? toBanglaDigits(value) : String(value);
}

function axisPercent(minutes) {
	return Math.max(0, Math.min(100, (minutes / AXIS_MAX_MINUTES) * 100));
}

function ModeLinePreview({ mode }) {
	return (
		<svg width="18" height="8" aria-hidden="true">
			<line x1="0" y1="4" x2="18" y2="4" className={`mode-${mode}`} strokeLinecap="round" />
		</svg>
	);
}

function ModeChain({ segments, lang }) {
	return (
		<span style={{ display: 'inline-flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
			{segments.map((segment, index) => {
				const label = MODE_LABELS[segment.mode] || { bn: segment.mode, en: segment.mode };
				return (
					<span key={`${segment.mode}-${index}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
						{index > 0 ? <span style={{ color: 'var(--c45)' }}>·</span> : null}
						<ModeLinePreview mode={segment.mode} />
						<span className="t-place" style={{ fontSize: 15 }}>{t(label.bn, label.en, lang)}</span>
					</span>
				);
			})}
		</span>
	);
}

function OptionMeasure({ p50, p90, isUnreliable, lang }) {
	const barColour = isUnreliable ? 'var(--stamp)' : 'var(--cream)';

	return (
		<div style={{ gridColumn: '2 / -1', position: 'relative', height: 28, marginTop: 4 }}>
			<div style={{ position: 'absolute', left: 0, right: 0, top: 14, height: 1, background: 'var(--c20)' }} />

			{AXIS_TICKS.map((tick) => (
				<div key={tick} style={{ position: 'absolute', left: `${axisPercent(tick)}%`, top: 0, transform: 'translateX(-50%)' }}>
					<div className="t-label" style={{ fontSize: 9, letterSpacing: 0 }}>{num(tick, lang)}</div>
				</div>
			))}

			<div
				style={{
					position: 'absolute',
					top: 11,
					height: 6,
					left: `${axisPercent(p50)}%`,
					width: `${Math.max(0, axisPercent(p90) - axisPercent(p50))}%`,
					background: barColour
				}}
			/>
			<div
				style={{
					position: 'absolute',
					top: 9,
					left: `${axisPercent(p50)}%`,
					width: 2,
					height: 10,
					background: 'var(--cream)',
					transform: 'translateX(-1px)'
				}}
			/>
		</div>
	);
}

export function RouteOptionsTable({ options, lang = 'bn', punchedId, onPunch }) {
	return (
		<div>
			<div style={{ display: 'grid', gridTemplateColumns: GRID_TEMPLATE, gap: 10, alignItems: 'baseline' }} className="rule-solid">
				<span />
				<span className="t-label">{t('বাহন', 'Mode', lang)}</span>
				<span className="t-label" style={{ textAlign: 'right' }}>{t('সাধারণ', 'Usual', lang)}</span>
				<span className="t-label" style={{ textAlign: 'right' }}>{t('খারাপ দিনে', 'Bad day', lang)}</span>
				<span className="t-label" style={{ textAlign: 'right' }}>{t('ভাড়া', 'Fare', lang)}</span>
			</div>

			{options.map((option) => {
				const spread = option.p90 - option.p50;
				const isUnreliable = spread > SPREAD_THRESHOLD;
				const isPunched = option.id === punchedId;

				return (
					<div key={option.id} className="rule-hair" style={{ padding: '10px 0' }}>
						<div
							style={{ display: 'grid', gridTemplateColumns: GRID_TEMPLATE, gap: 10, alignItems: 'center', cursor: 'pointer' }}
							onClick={() => onPunch(option.id)}
							role="button"
							tabIndex={0}
							onKeyDown={(event) => {
								if (event.key === 'Enter' || event.key === ' ') {
									event.preventDefault();
									onPunch(option.id);
								}
							}}
						>
							<span className={`punch${isPunched ? ' punch--selected' : ''}`} />
							<ModeChain segments={option.segments} lang={lang} />
							<span className="t-num" style={{ textAlign: 'right' }}>{num(option.p50, lang)}</span>
							<span className="t-num" style={{ textAlign: 'right', color: isUnreliable ? 'var(--stamp)' : 'var(--cream)' }}>
								{num(option.p90, lang)}
							</span>
							<span className="t-num" style={{ textAlign: 'right', fontSize: option.fare === null ? 10.5 : 14.5, color: 'var(--c70)' }}>
								{option.fare === null ? t('পরিবর্তনশীল', 'Varies', lang) : `৳${num(option.fare, lang)}`}
							</span>
						</div>

						<div style={{ display: 'grid', gridTemplateColumns: GRID_TEMPLATE, gap: 10 }}>
							<OptionMeasure p50={option.p50} p90={option.p90} isUnreliable={isUnreliable} lang={lang} />
						</div>

						{isPunched ? (
							<div style={{ marginTop: 8 }}>
								{option.segments.map((segment, index) => (
									<div key={`${segment.mode}-${index}`} style={{ padding: '6px 0 6px 36px' }}>
										<span className="t-body">{t(segment.label.bn, segment.label.en, lang)}</span>
										<span className="t-label" style={{ marginLeft: 8 }}>
											{num(segment.min, lang)} {t('মিনিট', 'min', lang)}
											{segment.fare > 0 ? ` · ৳${num(segment.fare, lang)}` : ''}
										</span>
									</div>
								))}
							</div>
						) : null}
					</div>
				);
			})}
		</div>
	);
}
