// Hand-drawn line icons, one per transport mode. Kept separate from
// MODE_META (utils/modes.js) so plain data consumers don't need JSX.
const STROKE = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };

const PATHS = {
	walk: (
		<>
			<circle {...STROKE} cx="13" cy="4.5" r="2.2" />
			<path {...STROKE} d="M13 7v5l-3 4 1 5M13 12l3.5 3 1 3.5M10 12l-3 3" />
		</>
	),
	metro: (
		<>
			<rect {...STROKE} x="5" y="3" width="14" height="13" rx="3" />
			<path {...STROKE} d="M5 11h14M8.5 19l-2 3M15.5 19l2 3M5 16h14" />
		</>
	),
	bus: (
		<>
			<rect {...STROKE} x="4" y="4" width="16" height="12" rx="2" />
			<path {...STROKE} d="M4 11h16M7 19v2M17 19v2M4 16h16" />
		</>
	),
	rickshaw: (
		<>
			<circle {...STROKE} cx="7" cy="17" r="3" />
			<circle {...STROKE} cx="18" cy="17" r="3" />
			<path {...STROKE} d="M10 17h5M18 14V9h-6l-3 6M12 9c0-3 3-4 5-3" />
		</>
	),
	bike: (
		<>
			<circle {...STROKE} cx="5.5" cy="17" r="3.2" />
			<circle {...STROKE} cx="18.5" cy="17" r="3.2" />
			<path {...STROKE} d="M8.5 17l3.5-7h4M12 10l-3-3M16 10l2.5 7" />
		</>
	),
	cng: (
		<>
			<path {...STROKE} d="M4 17V11l4-5h8l4 5v6" />
			<circle {...STROKE} cx="7.5" cy="17.5" r="2.4" />
			<circle {...STROKE} cx="16.5" cy="17.5" r="2.4" />
			<path {...STROKE} d="M6 11h12" />
		</>
	)
};

export function ModeIcon({ mode, size = 19 }) {
	return (
		<svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
			{PATHS[mode]}
		</svg>
	);
}
