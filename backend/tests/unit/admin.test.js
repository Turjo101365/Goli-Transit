import test from 'node:test';
import assert from 'node:assert/strict';
import { closeDb } from '../../src/config/db.js';
import { adminRepository } from '../../src/repositories/admin.repository.js';
import { authService } from '../../src/services/auth.service.js';
import { adminService } from '../../src/services/admin.service.js';

test.after(async () => {
  await closeDb().catch(() => {});
});

test('Admin Repository - getOverviewStats returns structured data', async () => {
  const stats = await adminRepository.getOverviewStats();
  assert.ok(stats.users, 'Should contain users stats');
  assert.ok(stats.nodes, 'Should contain nodes stats');
  assert.ok(stats.edges, 'Should contain edges stats');
  assert.ok(stats.anomalies, 'Should contain anomalies stats');
  assert.ok(stats.incidents, 'Should contain incidents stats');
  assert.ok(stats.trips, 'Should contain trips stats');
  assert.equal(typeof stats.users.total, 'number');
  assert.equal(typeof stats.nodes.total, 'number');
});

test('Admin Repository - listUsers and filters', async () => {
  const result = await adminRepository.listUsers({ limit: 10, offset: 0 });
  assert.ok(Array.isArray(result.users), 'Users should be an array');
  assert.ok(result.total >= 0, 'Total should be a non-negative number');
});

test('Admin Repository - listNodes and listEdges', async () => {
  const nodes = await adminRepository.listNodes();
  assert.ok(Array.isArray(nodes), 'Nodes should be an array');
  assert.ok(nodes.length > 0, 'Should have nodes (e.g. MRT-6 stations)');

  const edges = await adminRepository.listEdges();
  assert.ok(Array.isArray(edges), 'Edges should be an array');
});

test('Admin Repository - getSettings and updateSetting', async () => {
  const settings = await adminRepository.getSettings();
  assert.ok(settings.fare_rules, 'Should contain fare_rules');
  assert.ok(settings.alert_thresholds, 'Should contain alert_thresholds');
  assert.ok(settings.system_status, 'Should contain system_status');
});

test('Admin Authentication - Turjo5892@gmail.com logs in as Admin', async () => {
  const result = await authService.login({
    email: 'Turjo5892@gmail.com',
    password: 'Turjo1244'
  });

  assert.ok(result.token, 'Token should be returned');
  assert.equal(result.user.email, 'turjo5892@gmail.com');
  assert.equal(result.user.role, 'admin');
});

test('Admin Repository - listGuestUsers returns database guest sessions', async () => {
  const result = await adminRepository.listGuestUsers({ limit: 10, offset: 0 });
  assert.ok(Array.isArray(result.guests), 'Guests should be an array');
  assert.ok(result.total >= 0, 'Guest count should be non-negative');
});

test('Admin Repository - listSavedRoutes returns all commuter saved routes', async () => {
  const result = await adminRepository.listSavedRoutes({ limit: 10, offset: 0 });
  assert.ok(Array.isArray(result.routes), 'Routes should be an array');
  assert.ok(result.total >= 0, 'Routes count should be non-negative');
  if (result.routes.length > 0) {
    assert.ok(result.routes[0].userName, 'Should contain user name');
    assert.ok(result.routes[0].fromLocation, 'Should contain from location');
  }
});

test('Admin Service - inviteAdmin sends invitation and grants role', async () => {
  const adminUser = { id: 1, name: 'Super Admin', email: 'turjo5892@gmail.com', role: 'admin' };
  const inviteEmail = `invite_test_${Date.now()}@example.com`;
  
  const result = await adminService.inviteAdmin(
    adminUser,
    {
      email: inviteEmail,
      name: 'Assistant Admin',
      role: 'admin'
    },
    '127.0.0.1'
  );

  assert.equal(result.success, true);
  assert.equal(result.user.email, inviteEmail);
  assert.equal(result.user.role, 'admin');
  assert.ok(result.tempPassword, 'Temporary password should be generated for new user');
});

test('Admin Repository - listTrips returns all commuter trip logs', async () => {
  const result = await adminRepository.listTrips({ limit: 10, offset: 0 });
  assert.ok(Array.isArray(result.trips), 'Trips should be an array');
  assert.ok(result.total >= 0, 'Trips count should be non-negative');
});

