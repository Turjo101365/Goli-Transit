import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../state/LanguageContext.jsx';
import { useTheme } from '../state/ThemeContext.jsx';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const GSI_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

let gsiScriptPromise = null;

function loadGsiScript() {
	if (window.google?.accounts?.id) {
		return Promise.resolve();
	}

	if (!gsiScriptPromise) {
		gsiScriptPromise = new Promise((resolve, reject) => {
			const script = document.createElement('script');
			script.src = GSI_SCRIPT_SRC;
			script.async = true;
			script.defer = true;
			script.onload = () => resolve();
			script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
			document.head.appendChild(script);
		});
	}

	return gsiScriptPromise;
}

// Renders Google's own "Sign in with Google" button (not a hand-styled
// look-alike — Google's terms require using their rendered button) and
// hands the signed ID token up to onCredential, which POSTs it to
// /auth/google for real server-side verification. Renders nothing if
// VITE_GOOGLE_CLIENT_ID isn't set, rather than a broken/fake button.
export function GoogleSignInButton({ onCredential, onError }) {
	const { lang } = useLanguage();
	const { theme } = useTheme();
	const buttonRef = useRef(null);
	const [ready, setReady] = useState(false);

	useEffect(() => {
		if (!GOOGLE_CLIENT_ID) {
			return undefined;
		}

		let cancelled = false;

		loadGsiScript()
			.then(() => {
				if (cancelled) {
					return;
				}

				window.google.accounts.id.initialize({
					client_id: GOOGLE_CLIENT_ID,
					callback: (response) => onCredential(response.credential)
				});
				setReady(true);
			})
			.catch((error) => onError?.(error.message));

		return () => {
			cancelled = true;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		if (!ready || !buttonRef.current) {
			return;
		}

		buttonRef.current.innerHTML = '';
		window.google.accounts.id.renderButton(buttonRef.current, {
			type: 'standard',
			theme: theme === 'dark' ? 'filled_black' : 'outline',
			size: 'large',
			width: 320,
			text: 'continue_with',
			locale: lang === 'bn' ? 'bn' : 'en'
		});
	}, [ready, theme, lang]);

	if (!GOOGLE_CLIENT_ID) {
		return null;
	}

	return <div ref={buttonRef} style={{ display: 'flex', justifyContent: 'center' }} />;
}
