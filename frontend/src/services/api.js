import {
	getStoredAuthToken,
	clearStoredSession,
	AUTH_UNAUTHORIZED_EVENT
} from './auth.storage.js';

const LOCAL_BACKEND_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i;
const LOCAL_HOST_PATTERN = /^(localhost|127\.0\.0\.1)$/i;
const DEFAULT_API_TIMEOUT_MS = 20000;

function isLocalBrowserHost() {
	if (typeof window === 'undefined') {
		return false;
	}

	return LOCAL_HOST_PATTERN.test(window.location.hostname);
}

function resolveApiBaseConfig() {
	const configuredBaseUrl = (
		import.meta.env.VITE_BACKEND_ENDPOINT ||
		import.meta.env.VITE_API_URL ||
		import.meta.env.VITE_API_BASE_URL ||
		import.meta.env.VITE_BACKEND_URL ||
		''
	).trim();
	const localBrowserHost = isLocalBrowserHost();

	if (configuredBaseUrl) {
		const baseUrl = configuredBaseUrl.replace(/\/+$/, '');

		if (LOCAL_BACKEND_PATTERN.test(baseUrl) && !localBrowserHost) {
			return {
				baseUrl: '',
				error:
					'Invalid VITE_BACKEND_ENDPOINT for deployed frontend. Use your public backend URL (for example https://your-service.onrender.com), not localhost.'
			};
		}

		return { baseUrl, error: null };
	}

	if (typeof window === 'undefined') {
		return { baseUrl: '', error: null };
	}

	return {
		baseUrl: localBrowserHost ? 'http://127.0.0.1:8080' : '',
		error: null
	};
}

const { baseUrl: API_BASE_URL, error: API_BASE_URL_ERROR } = resolveApiBaseConfig();

function buildRequestUrl(path) {
	if (/^https?:\/\//.test(path)) {
		return path;
	}

	return API_BASE_URL ? `${API_BASE_URL}${path}` : path;
}

async function parseResponse(response, auth = true) {
	let payload = null;
	const contentType = response.headers.get('content-type') || '';

	if (contentType.includes('application/json')) {
		try {
			payload = await response.json();
		} catch {
			payload = null;
		}
	} else {
		const rawText = await response.text();
		if (rawText.trim().startsWith('<!DOCTYPE html>') || rawText.includes('<html')) {
			throw new Error(
				'Frontend is receiving HTML instead of API data. Please set `VITE_BACKEND_ENDPOINT` in Vercel Settings > Environment Variables to your Render Backend URL (e.g. https://goli-transit-backend.onrender.com) and Redeploy.'
			);
		}
		try {
			payload = JSON.parse(rawText);
		} catch {
			payload = null;
		}
	}

	if (!response.ok || (payload && payload.ok === false)) {
		if (response.status === 401 && auth) {
			clearStoredSession();

			if (typeof window !== 'undefined') {
				window.dispatchEvent(new CustomEvent(AUTH_UNAUTHORIZED_EVENT));
			}
		}

		let message = payload?.error?.message || `Request failed with status ${response.status}`;
		if (payload?.error?.details?.fieldErrors) {
			const fieldKeys = Object.keys(payload.error.details.fieldErrors);
			if (fieldKeys.length > 0) {
				const firstField = fieldKeys[0];
				const firstMsg = payload.error.details.fieldErrors[firstField]?.[0];
				if (firstMsg) {
					message = firstMsg;
				}
			}
		} else if (payload?.error?.details?.formErrors?.length > 0) {
			message = payload.error.details.formErrors[0];
		}

		const error = new Error(message);
		error.status = response.status;
		error.code = payload?.error?.code || null;
		error.details = payload?.error?.details || null;
		throw error;
	}

	return payload?.data ?? payload;
}

export async function apiRequest(path, options = {}) {
	if (API_BASE_URL_ERROR) {
		throw new Error(API_BASE_URL_ERROR);
	}

	const { auth = true, headers = {}, ...requestOptions } = options;
	const authToken = auth ? getStoredAuthToken() : null;
	const requestUrl = buildRequestUrl(path);
	const timeoutMs = Number(import.meta.env.VITE_API_TIMEOUT_MS) || DEFAULT_API_TIMEOUT_MS;
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
	let response;

	try {
		response = await fetch(requestUrl, {
			...requestOptions,
			signal: controller.signal,
			headers: {
				'Content-Type': 'application/json',
				...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
				...headers
			}
		});
	} catch (error) {
		if (error?.name === 'AbortError') {
			const timeoutError = new Error(
				`Request timed out after ${Math.round(timeoutMs / 1000)} seconds. Please try again.`
			);
			timeoutError.code = 'REQUEST_TIMEOUT';
			throw timeoutError;
		}

		const backendTarget = API_BASE_URL || requestUrl;
		throw new Error(`Unable to reach the backend server at ${backendTarget}. Start the backend and try again.`);
	} finally {
		clearTimeout(timeoutId);
	}

	return parseResponse(response, auth);
}
