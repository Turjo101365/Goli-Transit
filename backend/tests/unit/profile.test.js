import test from 'node:test';
import assert from 'node:assert/strict';
import { closeDb } from '../../src/config/db.js';
import { profileRepository } from '../../src/repositories/profile.repository.js';
import { authService } from '../../src/services/auth.service.js';

test.after(async () => {
	await closeDb().catch(() => {});
});

test('Auth Service & Profile - register and update profile with avatar, phone, and bio', async () => {
	const testEmail = `profile_test_${Date.now()}@example.com`;
	const session = await authService.register({
		name: 'Profile Tester',
		email: testEmail,
		password: 'TestPass@123'
	});

	assert.ok(session?.user, 'User was registered');
	assert.equal(session.user.name, 'Profile Tester');
	assert.equal(session.user.email, testEmail);

	const userId = session.user.id;

	// Update profile
	const updated = await authService.updateProfile(userId, {
		name: 'Updated Commuter Name',
		email: testEmail,
		phone: '01700000000',
		avatarUrl: 'https://example.com/avatar.png',
		bio: 'Regular MRT-6 commuter'
	});

	assert.ok(updated, 'User was updated');
	assert.equal(updated.name, 'Updated Commuter Name');
	assert.equal(updated.phone, '01700000000');
	assert.equal(updated.avatarUrl, 'https://example.com/avatar.png');
	assert.equal(updated.bio, 'Regular MRT-6 commuter');

	// Clean up
	await authService.deleteAccount(userId).catch(() => {});
});

test('Auth Service - change password enforces current password and hashes new password', async () => {
	const testEmail = `pwd_test_${Date.now()}@example.com`;
	const session = await authService.register({
		name: 'Password Tester',
		email: testEmail,
		password: 'OldPassword123'
	});

	const userId = session.user.id;

	// Fail with wrong current password
	await assert.rejects(
		async () => {
			await authService.changePassword(userId, {
				currentPassword: 'WrongPassword123',
				newPassword: 'NewPassword123'
			});
		},
		(err) => err.statusCode === 400 && err.code === 'AUTH_INVALID_CURRENT_PASSWORD'
	);

	// Succeed with correct current password
	const result = await authService.changePassword(userId, {
		currentPassword: 'OldPassword123',
		newPassword: 'NewPassword123'
	});

	assert.equal(result.message, 'Password updated successfully');

	// Login succeeds with new password
	const newLoginSession = await authService.login({
		email: testEmail,
		password: 'NewPassword123'
	});

	assert.ok(newLoginSession.token, 'Login with new password succeeded');

	// Clean up
	await authService.deleteAccount(userId).catch(() => {});
});

test('Profile Repository - create, retrieve, and delete trips for authenticated user', async () => {
	const testEmail = `trips_test_${Date.now()}@example.com`;
	const session = await authService.register({
		name: 'Trips Tester',
		email: testEmail,
		password: 'TestPass@123'
	});
	const userId = session.user.id;

	const tripId = await profileRepository.createTrip({
		userId,
		fromLocation: 'Mirpur 10',
		toLocation: 'Motijheel',
		mode: 'metro',
		distanceKm: 14.5,
		durationMinutes: 32,
		status: 'completed'
	});

	assert.ok(tripId, 'Trip was created');

	const trips = await profileRepository.getTrips(userId);
	assert.ok(trips.length >= 1, 'Trips array contains created trip');
	assert.equal(trips[0].fromLocation, 'Mirpur 10');
	assert.equal(trips[0].toLocation, 'Motijheel');
	assert.equal(trips[0].mode, 'metro');

	// Delete trip
	await profileRepository.deleteTrip(userId, tripId);
	const remainingTrips = await profileRepository.getTrips(userId);
	assert.equal(remainingTrips.some((t) => t.id === tripId), false);

	// Clean up
	await authService.deleteAccount(userId).catch(() => {});
});

test('Profile Repository - create, retrieve, and delete saved routes and favorite stops', async () => {
	const testEmail = `saved_test_${Date.now()}@example.com`;
	const session = await authService.register({
		name: 'Saved Tester',
		email: testEmail,
		password: 'TestPass@123'
	});
	const userId = session.user.id;

	// Saved Route
	const routeId = await profileRepository.createSavedRoute({
		userId,
		name: 'Daily Office Commute',
		fromLocation: 'Uttara North',
		toLocation: 'Secretariat',
		mode: 'metro',
		durationMinutes: 38
	});

	assert.ok(routeId, 'Saved route created');
	const routes = await profileRepository.getSavedRoutes(userId);
	assert.ok(routes.some((r) => r.name === 'Daily Office Commute'));

	await profileRepository.deleteSavedRoute(userId, routeId);
	const routesAfter = await profileRepository.getSavedRoutes(userId);
	assert.equal(routesAfter.some((r) => r.id === routeId), false);

	// Favorite Stop
	const stopId = await profileRepository.createFavoriteStop({
		userId,
		name: 'Farmgate Metro',
		nodeId: 'mrt_farmgate',
		latitude: 23.7602,
		longitude: 90.3865
	});

	assert.ok(stopId, 'Favorite stop created');
	const stops = await profileRepository.getFavoriteStops(userId);
	assert.ok(stops.some((s) => s.name === 'Farmgate Metro'));

	await profileRepository.deleteFavoriteStop(userId, stopId);
	const stopsAfter = await profileRepository.getFavoriteStops(userId);
	assert.equal(stopsAfter.some((s) => s.id === stopId), false);

	// Clean up
	await authService.deleteAccount(userId).catch(() => {});
});

test('Profile Repository - clear all trips for user', async () => {
	const testEmail = `clear_trips_${Date.now()}@example.com`;
	const session = await authService.register({
		name: 'Clear Trips Tester',
		email: testEmail,
		password: 'TestPass@123'
	});
	const userId = session.user.id;

	await profileRepository.createTrip({
		userId,
		fromLocation: 'Mirpur 10',
		toLocation: 'Motijheel',
		mode: 'metro',
		distanceKm: 14.5,
		durationMinutes: 32
	});

	await profileRepository.createTrip({
		userId,
		fromLocation: 'Farmgate',
		toLocation: 'Shahbagh',
		mode: 'metro',
		distanceKm: 4.2,
		durationMinutes: 10
	});

	const tripsBefore = await profileRepository.getTrips(userId);
	assert.ok(tripsBefore.length >= 2, 'Trips exist before clear');

	await profileRepository.clearTrips(userId);
	const tripsAfter = await profileRepository.getTrips(userId);
	assert.equal(tripsAfter.length, 0, 'All trips cleared for user');

	// Clean up
	await authService.deleteAccount(userId).catch(() => {});
});


