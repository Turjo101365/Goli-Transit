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
	const configuredBaseUrl = (import.meta.env.VITE_BACKEND_ENDPOINT || '').trim();
	const localBrowserHost = isLocalBrowserHost();

	if (configuredBaseUrl) {
		const baseUrl = configuredBaseUrl.replace(/\/$/, '');

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

	if (!import.meta.env.DEV && !localBrowserHost) {
		return {
			baseUrl: '',
			error:
				'Missing VITE_BACKEND_ENDPOINT for deployed frontend. Set it to your public backend URL (for example https://your-service.onrender.com).'
		};
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

async function parseResponse(response) {
	let payload;

	try {
		payload = await response.json();
	} catch {
		payload = null;
	}

	if (!response.ok || (payload && payload.ok === false)) {
		if (response.status === 401) {
			clearStoredSession();

			if (typeof window !== 'undefined') {
				window.dispatchEvent(new CustomEvent(AUTH_UNAUTHORIZED_EVENT));
			}
		}

		const message = payload?.error?.message || `Request failed with status ${response.status}`;
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

	return parseResponse(response);
}
