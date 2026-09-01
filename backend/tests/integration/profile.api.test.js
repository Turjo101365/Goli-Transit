import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../../src/app.js';
import { authService } from '../../src/services/auth.service.js';

import { closeDb } from '../../src/config/db.js';

let server;
let baseUrl;

test.before(async () => {
	const app = createApp();
	await new Promise((resolve) => {
		server = app.listen(0, '127.0.0.1', () => {
			const addr = server.address();
			baseUrl = `http://127.0.0.1:${addr.port}`;
			resolve();
		});
	});
});

test.after(async () => {
	if (server) {
		await new Promise((resolve) => server.close(resolve));
	}
	await closeDb().catch(() => {});
});

test('Profile API - Complete authenticated user lifecycle and database operations', async () => {
	const testEmail = `api_commuter_${Date.now()}@example.com`;
	const initialPassword = 'InitialPass@123';
	const newPassword = 'NewSecretPass@123';

	// 1. Register User
	const regRes = await fetch(`${baseUrl}/auth/register`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			name: 'Test Commuter',
			email: testEmail,
			password: initialPassword,
			confirmPassword: initialPassword
		})
	});

	const regData = await regRes.json();
	assert.equal(regRes.status, 201, `Register failed: ${JSON.stringify(regData)}`);
	assert.ok(regData.ok, 'Register returned ok: true');
	assert.ok(regData.data.token, 'Token was provided');

	const authToken = regData.data.token;
	const authHeaders = {
		'Content-Type': 'application/json',
		Authorization: `Bearer ${authToken}`
	};

	// 2. GET /profile - Fetch Profile Data
	const profileRes = await fetch(`${baseUrl}/profile`, {
		method: 'GET',
		headers: authHeaders
	});
	const profileData = await profileRes.json();
	assert.equal(profileRes.status, 200);
	assert.ok(profileData.ok);
	assert.equal(profileData.data.user.name, 'Test Commuter');
	assert.equal(profileData.data.user.email, testEmail);
	assert.equal(Array.isArray(profileData.data.trips), true);
	assert.equal(Array.isArray(profileData.data.savedRoutes), true);
	assert.equal(Array.isArray(profileData.data.favoriteStops), true);

	// 3. PUT /profile - Update profile details and avatar
	const updateRes = await fetch(`${baseUrl}/profile`, {
		method: 'PUT',
		headers: authHeaders,
		body: JSON.stringify({
			name: 'Updated Commuter Name',
			email: testEmail,
			phone: '01811223344',
			bio: 'Daily MRT-6 commuter from Uttara to Motijheel',
			avatarUrl: 'preset:metro'
		})
	});
	const updateData = await updateRes.json();
	assert.equal(updateRes.status, 200, `Profile update failed: ${JSON.stringify(updateData)}`);
	assert.ok(updateData.ok);
	assert.equal(updateData.data.user.name, 'Updated Commuter Name');
	assert.equal(updateData.data.user.phone, '01811223344');
	assert.equal(updateData.data.user.bio, 'Daily MRT-6 commuter from Uttara to Motijheel');
	assert.equal(updateData.data.user.avatarUrl, 'preset:metro');

	// 4. POST /profile/change-password - Fail on wrong current password
	const badPwdRes = await fetch(`${baseUrl}/profile/change-password`, {
		method: 'POST',
		headers: authHeaders,
		body: JSON.stringify({
			currentPassword: 'WrongPassword!',
			newPassword,
			confirmNewPassword: newPassword
		})
	});
	const badPwdData = await badPwdRes.json();
	assert.equal(badPwdRes.status, 400);
	assert.equal(badPwdData.ok, false);

	// 5. POST /profile/change-password - Succeed on correct current password
	const goodPwdRes = await fetch(`${baseUrl}/profile/change-password`, {
		method: 'POST',
		headers: authHeaders,
		body: JSON.stringify({
			currentPassword: initialPassword,
			newPassword,
			confirmNewPassword: newPassword
		})
	});
	const goodPwdData = await goodPwdRes.json();
	assert.equal(goodPwdRes.status, 200);
	assert.ok(goodPwdData.ok);

	// 6. Test Logging and Deleting Trips
	const createTripRes = await fetch(`${baseUrl}/profile/trips`, {
		method: 'POST',
		headers: authHeaders,
		body: JSON.stringify({
			fromLocation: 'Uttara North',
			toLocation: 'Motijheel',
			mode: 'metro',
			distanceKm: 20.1,
			durationMinutes: 32,
			status: 'completed'
		})
	});
	const createTripData = await createTripRes.json();
	assert.equal(createTripRes.status, 201);
	assert.ok(createTripData.data.id);
	const tripId = createTripData.data.id;

	// Verify trip is returned in profile
	const profileWithTripRes = await fetch(`${baseUrl}/profile`, {
		method: 'GET',
		headers: authHeaders
	});
	const profileWithTrip = await profileWithTripRes.json();
	assert.ok(profileWithTrip.data.trips.some((t) => Number(t.id) === Number(tripId)));

	// Delete trip
	const deleteTripRes = await fetch(`${baseUrl}/profile/trips/${tripId}`, {
		method: 'DELETE',
		headers: authHeaders
	});
	assert.equal(deleteTripRes.status, 200);

	// 7. Test Saved Routes
	const saveRouteRes = await fetch(`${baseUrl}/profile/routes`, {
		method: 'POST',
		headers: authHeaders,
		body: JSON.stringify({
			name: 'Home to Work',
			fromLocation: 'Mirpur 10',
			toLocation: 'Farmgate',
			mode: 'metro',
			durationMinutes: 14
		})
	});
	const saveRouteData = await saveRouteRes.json();
	assert.equal(saveRouteRes.status, 201);
	const routeId = saveRouteData.data.id;

	const deleteRouteRes = await fetch(`${baseUrl}/profile/routes/${routeId}`, {
		method: 'DELETE',
		headers: authHeaders
	});
	assert.equal(deleteRouteRes.status, 200);

	// 8. Test Favorite Stops
	const stopRes = await fetch(`${baseUrl}/profile/stops`, {
		method: 'POST',
		headers: authHeaders,
		body: JSON.stringify({
			name: 'Mirpur 10 Metro Station',
			nodeId: 'mrt_mirpur_10',
			latitude: 23.8084,
			longitude: 90.3682
		})
	});
	const stopData = await stopRes.json();
	assert.equal(stopRes.status, 201);
	const stopId = stopData.data.id;

	const deleteStopRes = await fetch(`${baseUrl}/profile/stops/${stopId}`, {
		method: 'DELETE',
		headers: authHeaders
	});
	assert.equal(deleteStopRes.status, 200);

	// 9. DELETE /profile/account - Delete Account
	const deleteAccRes = await fetch(`${baseUrl}/profile/account`, {
		method: 'DELETE',
		headers: authHeaders,
		body: JSON.stringify({
			password: newPassword
		})
	});
	const deleteAccData = await deleteAccRes.json();
	assert.equal(deleteAccRes.status, 200);
	assert.ok(deleteAccData.ok);

	// 10. Verify old token is no longer valid
	const expiredCheck = await fetch(`${baseUrl}/profile`, {
		method: 'GET',
		headers: authHeaders
	});
	assert.equal(expiredCheck.status, 401);
});
