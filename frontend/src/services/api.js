import {
	getStoredAuthToken,
	clearStoredSession,
	AUTH_UNAUTHORIZED_EVENT
} from './auth.storage.js';

const API_BASE_URL = (import.meta.env.VITE_BACKEND_ENDPOINT || '').replace(/\/$/, '');

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
	const { auth = true, headers = {}, ...requestOptions } = options;
	const authToken = auth ? getStoredAuthToken() : null;
	const requestUrl = buildRequestUrl(path);
	let response;

	try {
		response = await fetch(requestUrl, {
			...requestOptions,
			headers: {
				'Content-Type': 'application/json',
				...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
				...headers
			}
		});
	} catch (_error) {
		const backendTarget = API_BASE_URL || requestUrl;
		throw new Error(`Unable to reach the backend server at ${backendTarget}. Start the backend and try again.`);
	}

	return parseResponse(response);
}
