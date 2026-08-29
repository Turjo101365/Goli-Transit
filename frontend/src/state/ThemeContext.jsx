import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);
const STORAGE_KEY = 'furut-theme';

function getInitialTheme() {
	if (typeof window === 'undefined') {
		return 'light';
	}

	try {
		const stored = window.localStorage.getItem(STORAGE_KEY);
		if (stored === 'light' || stored === 'dark') {
			return stored;
		}
	} catch {
		// localStorage unavailable
	}

	return 'light';
}

export function ThemeProvider({ children }) {
	const [theme, setTheme] = useState(getInitialTheme);

	useEffect(() => {
		document.documentElement.setAttribute('data-theme', theme);
		try {
			window.localStorage.setItem(STORAGE_KEY, theme);
		} catch {
			// private-mode/blocked storage — theme still applies for this visit
		}
	}, [theme]);

	const toggleTheme = () => setTheme((current) => (current === 'dark' ? 'light' : 'dark'));

	return (
		<ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
			{children}
		</ThemeContext.Provider>
	);
}

export function useTheme() {
	const context = useContext(ThemeContext);
	if (!context) {
		throw new Error('useTheme must be used within a ThemeProvider');
	}

	return context;
}
