import { createContext, useContext, useState } from 'react';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
	const [lang, setLang] = useState('bn');
	const toggleLang = () => setLang((current) => (current === 'bn' ? 'en' : 'bn'));

	return (
		<LanguageContext.Provider value={{ lang, setLang, toggleLang }}>
			{children}
		</LanguageContext.Provider>
	);
}

export function useLanguage() {
	const context = useContext(LanguageContext);
	if (!context) {
		throw new Error('useLanguage must be used within a LanguageProvider');
	}

	return context;
}
