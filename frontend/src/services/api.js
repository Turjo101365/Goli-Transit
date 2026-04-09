async function parseResponse(response) {
	let payload;

	try {
		payload = await response.json();
	} catch {
		payload = null;
	}

	if (!response.ok || (payload && payload.ok === false)) {
		const message = payload?.error?.message || `Request failed with status ${response.status}`;
		throw new Error(message);
	}

	return payload?.data ?? payload;
}

export async function apiRequest(path, options = {}) {
	const response = await fetch(path, {
		headers: {
			'Content-Type': 'application/json',
			...(options.headers || {})
		},
		...options
	});

	return parseResponse(response);
}