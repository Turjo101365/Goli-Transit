import { ensureGraphCache } from '../cache/graph.cache.js';
import { getCondition } from './weatherService.js';
import { getModeState } from '../core/modeMatrix.js';
import { metroPath, nodeCoords } from '../core/algorithms/metroPath.js';
import { distance } from '../utils/distance.js';
import { config } from '../constants/config.js';
import { createHttpError } from '../utils/http-error.js';
import { errors } from '../constants/errors.js';

const {
	SWITCH_SEARCH_RADIUS_KM,
	MIN_SAVING_MINUTES,
	ALERT_COOLDOWN_MINUTES,
	WALKING_SPEED_KMH,
	DEGRADED_SPEED_FACTOR,
	MODE_SPEED_KMH,
	MODE_WAIT_MINUTES
} = config.journey;

// userId -> ms timestamp of the last alert sent. In-memory, per-process —
// same tradeoff as the existing OTP session store in auth.service.js.
const lastAlertAtByUser = new Map();

// weatherService.getCondition() returns 'clear' | 'rain' | 'heavy_rain';
// modeMatrix's CONDITIONS are 'clear' | 'jam' | 'rain' (no heavy_rain tier —
// the mode matrix rules never distinguished one). 'jam' has no real detector
// yet: that needs corridor_observations (current vs free-flow speed), which
// is empty until corridors are seeded and polled. So 'jam' is unreachable
// here for now — flagging rather than inventing a fake jam heuristic.
function toModeMatrixCondition(weatherCondition) {
	return weatherCondition === 'heavy_rain' ? 'rain' : weatherCondition;
}

function effectiveSpeedKmh(mode, state) {
	const baseline = MODE_SPEED_KMH[mode] ?? WALKING_SPEED_KMH;
	return state === 0 ? baseline : baseline * DEGRADED_SPEED_FACTOR;
}

function minutesForDistance(km, speedKmh) {
	if (speedKmh <= 0) {
		return Infinity;
	}

	return (km / speedKmh) * 60;
}

function buildWalkSegment(fromCoords, toCoords, minutes, label) {
	return {
		mode: 'walk',
		min: Math.round(minutes),
		fare: 0,
		label,
		pts: [[fromCoords.lat, fromCoords.lng], [toCoords.lat, toCoords.lng]]
	};
}

function buildMetroSegment(graph, candidateCoords, path) {
	const pts = [[candidateCoords.lat, candidateCoords.lng]];
	for (const edge of path.edges) {
		const coords = nodeCoords(graph.nodes.get(edge.to));
		if (coords) {
			pts.push([coords.lat, coords.lng]);
		}
	}

	return {
		mode: 'metro',
		min: Math.round(path.minutes + MODE_WAIT_MINUTES.metro),
		fare: path.fareTaka,
		label: { bn: 'মেট্রোতে গন্তব্যে', en: 'Metro to destination' },
		pts
	};
}

function isCooledDown(userId, now) {
	const lastAlertAt = lastAlertAtByUser.get(userId);
	if (!lastAlertAt) {
		return true;
	}

	return now - lastAlertAt >= ALERT_COOLDOWN_MINUTES * 60 * 1000;
}

export async function evaluateJourney({ userId, lat, lng, currentMode, destinationNodeId, now = new Date() }) {
	const graph = await ensureGraphCache();
	const destinationNode = graph.nodes.get(destinationNodeId);
	if (!destinationNode) {
		throw createHttpError(404, errors.GRAPH_NODE_NOT_FOUND, `Unknown destination node: ${destinationNodeId}`);
	}

	const destinationCoords = nodeCoords(destinationNode);
	if (!destinationCoords) {
		throw createHttpError(404, errors.GRAPH_NODE_NOT_FOUND, `Destination node has no coordinates: ${destinationNodeId}`);
	}

	const condition = toModeMatrixCondition(await getCondition());
	const currentPos = { lat, lng };
	const distanceToDestinationKm = distance(currentPos, destinationCoords);

	// "Stay" branch: straight-line distance at currentMode's condition-adjusted
	// speed, computed fresh from now. No original plan, no elapsed time on
	// either side of the comparison.
	const stayState = getModeState(currentMode, condition, now);
	const staySpeedKmh = effectiveSpeedKmh(currentMode, stayState.state);
	const stayEta = minutesForDistance(distanceToDestinationKm, staySpeedKmh);

	// Candidates: graph nodes within the search radius that are forward
	// (strictly closer to the destination than the user's current position —
	// a straight-line approximation; we have no real route graph for
	// non-metro modes to check "forward" against directly).
	const candidates = [];
	for (const [nodeId, node] of graph.nodes.entries()) {
		if (nodeId === destinationNodeId) {
			continue;
		}

		const coords = nodeCoords(node);
		if (!coords) {
			continue;
		}

		const distFromUserKm = distance(currentPos, coords);
		if (distFromUserKm > SWITCH_SEARCH_RADIUS_KM) {
			continue;
		}

		const distToDestinationKm = distance(coords, destinationCoords);
		if (distToDestinationKm > distanceToDestinationKm) {
			continue; // strictly farther from the destination than the user already is = backward
		}

		candidates.push({ nodeId, node, coords, distFromUserKm });
	}

	// Every seeded node is currently a metro station, so the only switch this
	// can evaluate today is "get off and take the metro." Filtered by
	// modeMatrix state 2 (e.g. metro closed for the night) regardless.
	const switchMode = 'metro';
	const switchState = getModeState(switchMode, condition, now);

	let best = null;
	if (switchState.state !== 2) {
		for (const candidate of candidates) {
			const path = metroPath(graph, candidate.nodeId, destinationNodeId);
			if (!path) {
				continue;
			}

			const transferTime = minutesForDistance(candidate.distFromUserKm, WALKING_SPEED_KMH);
			const eta = transferTime + MODE_WAIT_MINUTES[switchMode] + path.minutes;

			if (!best || eta < best.eta) {
				best = { candidate, path, transferTime, eta };
			}
		}
	}

	let bestSwitch = null;
	let minutesSaved = 0;
	if (best) {
		minutesSaved = Math.round(stayEta - best.eta);
		bestSwitch = {
			atNode: best.candidate.nodeId,
			segments: [
				buildWalkSegment(
					currentPos,
					best.candidate.coords,
					best.transferTime,
					{ bn: 'হেঁটে স্টেশনে', en: 'Walk to station' }
				),
				buildMetroSegment(graph, best.candidate.coords, best.path)
			],
			eta: Math.round(best.eta),
			minutesSaved,
			fare: best.path.fareTaka
		};
	}

	let shouldAlert = false;
	let reason;

	if (!best) {
		reason = { bn: 'কাছাকাছি ভালো বিকল্প নেই', en: 'No good switch option nearby' };
	} else if (minutesSaved < MIN_SAVING_MINUTES) {
		reason = { bn: 'যথেষ্ট সময় বাঁচবে না', en: 'Not enough time saved to switch' };
	} else if (!isCooledDown(userId, now)) {
		reason = { bn: 'সম্প্রতি সতর্কতা পাঠানো হয়েছে', en: 'An alert was already sent recently' };
	} else {
		shouldAlert = true;
		lastAlertAtByUser.set(userId, now);
		const label = best.candidate.node.metadata?.nameBn || best.candidate.nodeId;
		const labelEn = best.candidate.node.metadata?.nameEn || best.candidate.nodeId;
		reason = {
			bn: `${label} নেমে সুইচ করুন — ${minutesSaved} মিনিট বাঁচবে`,
			en: `Switch at ${labelEn} — saves ${minutesSaved} min`
		};
	}

	return {
		stayEta: Math.round(stayEta),
		bestSwitch,
		shouldAlert,
		reason
	};
}
