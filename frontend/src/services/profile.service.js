import { apiRequest } from './api.js';

export async function getProfile() {
	return apiRequest('/profile');
}

export async function updateProfile(payload) {
	return apiRequest('/profile', {
		method: 'PUT',
		body: JSON.stringify(payload)
	});
}

export async function changePassword(payload) {
	return apiRequest('/profile/change-password', {
		method: 'POST',
		body: JSON.stringify(payload)
	});
}

export async function deleteAccount(payload = {}) {
	return apiRequest('/profile/account', {
		method: 'DELETE',
		body: JSON.stringify(payload)
	});
}

export async function getTrips(limit = 50) {
	return apiRequest(`/profile/trips?limit=${encodeURIComponent(limit)}`);
}

export async function createTrip(payload) {
	return apiRequest('/profile/trips', {
		method: 'POST',
		body: JSON.stringify(payload)
	});
}

export async function deleteTrip(tripId) {
	return apiRequest(`/profile/trips/${tripId}`, {
		method: 'DELETE'
	});
}

export async function clearTrips() {
	return apiRequest('/profile/trips', {
		method: 'DELETE'
	});
}

export async function saveRoute(payload) {
	return apiRequest('/profile/routes', {
		method: 'POST',
		body: JSON.stringify(payload)
	});
}

export async function deleteSavedRoute(routeId) {
	return apiRequest(`/profile/routes/${routeId}`, {
		method: 'DELETE'
	});
}

export async function addFavoriteStop(payload) {
	return apiRequest('/profile/stops', {
		method: 'POST',
		body: JSON.stringify(payload)
	});
}

export async function deleteFavoriteStop(stopId) {
	return apiRequest(`/profile/stops/${stopId}`, {
		method: 'DELETE'
	});
}