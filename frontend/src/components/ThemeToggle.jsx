import { useTheme } from '../state/ThemeContext.jsx';

const STROKE = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };

function SunIcon() {
	return (
		<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
			<circle {...STROKE} cx="12" cy="12" r="4.5" />
			<path {...STROKE} d="M12 2v2.5M12 19.5V22M22 12h-2.5M4.5 12H2M18.8 5.2l-1.8 1.8M7 17l-1.8 1.8M18.8 18.8L17 17M7 7 5.2 5.2" />
		</svg>
	);
}

function MoonIcon() {
	return (
		<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
			<path {...STROKE} d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" />
		</svg>
	);
}

// Shows the icon/label for the mode you'd switch TO — same convention as
// the language toggle chip next to it everywhere this appears.
export function ThemeToggle() {
	const { theme, toggleTheme } = useTheme();
	const switchingToLight = theme === 'dark';

	return (
		<button
			type="button"
			onClick={toggleTheme}
			className="chip"
			aria-label={switchingToLight ? 'Switch to light mode' : 'Switch to dark mode'}
			style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
		>
			{switchingToLight ? <SunIcon /> : <MoonIcon />}
		</button>
	);
}
