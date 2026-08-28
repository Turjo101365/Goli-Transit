import 'dotenv/config';
import { dbQuery, initDb, closeDb } from '../src/config/db.js';
import { logger } from '../src/utils/logger.js';

const TOMTOM_API_KEY = process.env.TOMTOM_API_KEY;
const TOMTOM_BASE_URL = process.env.TOMTOM_BASE_URL
  || 'https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json';
const POLL_INTERVAL_MINUTES = 15;
const CALLS_PER_DAY_PER_CORRIDOR = (24 * 60) / POLL_INTERVAL_MINUTES;
const DAILY_CALL_BUDGET = 2000;
const REQUEST_TIMEOUT_MS = 10000;

function buildFlowSegmentUrl({ lat, lng }) {
  const url = new URL(TOMTOM_BASE_URL);
  url.searchParams.set('key', TOMTOM_API_KEY);
  url.searchParams.set('point', `${lat},${lng}`);
  url.searchParams.set('unit', 'kmph');
  return url.toString();
}

function midpointFromPolyline(polyline) {
  const points = Array.isArray(polyline) ? polyline : JSON.parse(polyline || '[]');
  if (!Array.isArray(points) || points.length === 0) {
    return null;
  }

  const [lat, lng] = points[Math.floor(points.length / 2)];
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return null;
  }

  return { lat, lng };
}

async function fetchFlowSegmentData(point) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(buildFlowSegmentUrl(point), { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`TomTom API returned ${response.status}`);
    }

    const payload = await response.json();
    const data = payload.flowSegmentData;
    if (!data || typeof data.currentSpeed !== 'number' || typeof data.freeFlowSpeed !== 'number') {
      throw new Error('TomTom response missing expected flowSegmentData fields');
    }

    return {
      currentSpeedKmh: data.currentSpeed,
      freeflowKmh: data.freeFlowSpeed,
      confidence: typeof data.confidence === 'number' ? data.confidence : null
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function insertObservation(corridorId, observation) {
  await dbQuery(
    [
      'INSERT INTO corridor_observations',
      '(corridor_id, observed_at, current_speed_kmh, freeflow_kmh, confidence)',
      'VALUES (:corridorId, :observedAt, :currentSpeedKmh, :freeflowKmh, :confidence)'
    ].join(' '),
    {
      corridorId,
      observedAt: new Date(),
      currentSpeedKmh: observation.currentSpeedKmh,
      freeflowKmh: observation.freeflowKmh,
      confidence: observation.confidence
    }
  );
}

async function pollCorridor(corridor) {
  const point = midpointFromPolyline(corridor.polyline);
  if (!point) {
    logger.error('Skipping corridor: polyline missing or invalid', { corridorId: corridor.id });
    return false;
  }

  try {
    const observation = await fetchFlowSegmentData(point);
    await insertObservation(corridor.id, observation);
    logger.info('Recorded corridor observation', {
      corridorId: corridor.id,
      currentSpeedKmh: observation.currentSpeedKmh,
      freeflowKmh: observation.freeflowKmh,
      confidence: observation.confidence
    });
    return true;
  } catch (error) {
    logger.error('Failed to poll corridor', {
      corridorId: corridor.id,
      message: error?.message
    });
    return false;
  }
}

async function main() {
  if (!TOMTOM_API_KEY) {
    logger.error('TOMTOM_API_KEY is not set; cannot poll TomTom Traffic Flow API');
    process.exitCode = 1;
    return;
  }

  await initDb();
  const corridors = await dbQuery('SELECT id, polyline FROM corridors');

  const projectedDailyCalls = corridors.length * CALLS_PER_DAY_PER_CORRIDOR;
  logger.info('Traffic poll starting', {
    corridorCount: corridors.length,
    pollIntervalMinutes: POLL_INTERVAL_MINUTES,
    projectedDailyCalls,
    dailyCallBudget: DAILY_CALL_BUDGET
  });

  if (projectedDailyCalls > DAILY_CALL_BUDGET) {
    logger.warn('Projected daily call count exceeds the configured budget', {
      projectedDailyCalls,
      dailyCallBudget: DAILY_CALL_BUDGET,
      corridorCount: corridors.length,
      maxCorridorsAtCurrentInterval: Math.floor(DAILY_CALL_BUDGET / CALLS_PER_DAY_PER_CORRIDOR)
    });
  }

  if (corridors.length === 0) {
    logger.warn('No corridors found in the corridors table; nothing to poll');
    return;
  }

  let succeeded = 0;
  let failed = 0;

  for (const corridor of corridors) {
    const ok = await pollCorridor(corridor);
    if (ok) {
      succeeded += 1;
    } else {
      failed += 1;
    }
  }

  logger.info('Traffic poll complete', { succeeded, failed, total: corridors.length });
}

main()
  .catch((error) => {
    logger.error('Traffic poll crashed', { message: error?.message, stack: error?.stack });
    process.exitCode = 1;
  })
  .finally(closeDb);
