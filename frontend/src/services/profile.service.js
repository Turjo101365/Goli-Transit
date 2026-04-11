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