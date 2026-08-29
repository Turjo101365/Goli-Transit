import crypto from 'node:crypto';
import { distance } from '../utils/distance.js';
import { graphRepository } from '../repositories/graph.repository.js';
import { createHttpError } from '../utils/http-error.js';
import { errors } from '../constants/errors.js';
import { logger } from '../utils/logger.js';

const GEOCODE_TIMEOUT_MS = Number(process.env.GEOCODE_TIMEOUT_MS || 2500);
const DYNAMIC_LINK_NEIGHBOR_LIMIT = Number(process.env.DYNAMIC_LINK_NEIGHBOR_LIMIT || 5);

const PLACE_ALIASES = new Map([
  ['gulsan', 'gulshan'],
  ['gulstan', 'gulshan'],
  ['dhanmundi', 'dhanmondi'],
  ['dhanmondy', 'dhanmondi'],
  ['motijil', 'motijheel'],
  ['motijheel', 'motijheel'],
  ['bananee', 'banani'],
  ['uttora', 'uttara']
]);

function normalize(text) {
  return String(text || '').trim().toLowerCase();
}

function canonicalizePlaceInput(placeInput) {
  const normalized = normalize(placeInput);
  return PLACE_ALIASES.get(normalized) || String(placeInput || '').trim();
}

function parseCoordinateInput(placeInput) {
  const match = String(placeInput)
    .trim()
    .match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);

  if (!match) {
    return null;
  }

  const latitude = Number(match[1]);
  const longitude = Number(match[2]);
  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return null;
  }

  return { latitude, longitude, displayName: `${latitude},${longitude}` };
}

function coordinatesFromMetadata(metadata = {}) {
  if (typeof metadata.latitude === 'number' && typeof metadata.longitude === 'number') {
    return { latitude: metadata.latitude, longitude: metadata.longitude };
  }

  if (typeof metadata.lat === 'number' && typeof metadata.lng === 'number') {
    return { latitude: metadata.lat, longitude: metadata.lng };
  }

  return null;
}

function createDynamicNodeId(placeInput) {
  const seed = normalize(placeInput);
  const hash = crypto.createHash('sha1').update(seed).digest('hex').slice(0, 10);
  return `dyn_${hash}`;
}

async function geocodePlace(placeInput) {
  const parsedCoordinates = parseCoordinateInput(placeInput);
  if (parsedCoordinates) {
    return parsedCoordinates;
  }

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', `${placeInput}, Dhaka, Bangladesh`);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('limit', '1');
  url.searchParams.set('countrycodes', 'bd');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEOCODE_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(url, {
      headers: {
        'User-Agent': 'ezz-go-hackathon/1.0'
      },
      signal: controller.signal
    });
  } catch (error) {
    const reason = error?.name === 'AbortError' ? 'timeout' : 'network';
    logger.warn('Place geocoding request failed', {
      placeInput,
      reason,
      timeoutMs: GEOCODE_TIMEOUT_MS,
      message: error?.message
    });

    throw createHttpError(
      503,
      errors.GEOCODER_UNAVAILABLE,
      'Geocoding service is temporarily unavailable. Please try again.'
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    logger.warn('Place geocoding returned non-OK response', {
      placeInput,
      status: response.status
    });

    throw createHttpError(
      503,
      errors.GEOCODER_UNAVAILABLE,
      'Geocoding service is temporarily unavailable. Please try again.'
    );
  }

  const results = await response.json();
  if (!Array.isArray(results) || results.length === 0) {
    return null;
  }

  const first = results[0];
  return {
    latitude: Number(first.lat),
    longitude: Number(first.lon),
    displayName: first.display_name || placeInput
  };
}

function findNearestNodes(graph, targetNodeId, limit = 2) {
  const targetNode = graph.nodes.get(targetNodeId);
  const targetCoordinates = coordinatesFromMetadata(targetNode?.metadata || {});

  if (!targetCoordinates) {
    return [];
  }

  const ranked = [];
  for (const [nodeId, node] of graph.nodes.entries()) {
    if (nodeId === targetNodeId) {
      continue;
    }

    if (node.metadata?.dynamic) {
      continue;
    }

    const coordinates = coordinatesFromMetadata(node.metadata || {});
    if (!coordinates) {
      continue;
    }

    ranked.push({
      nodeId,
      km: distance(targetCoordinates, coordinates)
    });
  }

  return ranked.sort((a, b) => a.km - b.km).slice(0, limit);
}

function stableHubSuggestions(graph, limit = 5) {
  const suggestions = [];

  for (const [nodeId, node] of graph.nodes.entries()) {
    if (node?.metadata?.dynamic) {
      continue;
    }

    suggestions.push(node?.metadata?.label || node?.metadata?.displayName || nodeId);
    if (suggestions.length >= limit) {
      break;
    }
  }

  return suggestions;
}

function matchesExistingNode(nodeId, node, normalizedInput) {
  if (normalize(nodeId) === normalizedInput) {
    return true;
  }

  const metadata = node?.metadata || {};
  return [metadata.label, metadata.displayName].some((value) => normalize(value) === normalizedInput);
}

export const placeService = {
  async resolvePlaceToNode({ graph, placeInput }) {
    const canonicalPlaceInput = canonicalizePlaceInput(placeInput);
    const normalizedInput = normalize(canonicalPlaceInput);
    if (!normalizedInput) {
      throw createHttpError(400, errors.VALIDATION_ERROR, 'Place name is required');
    }

    for (const [nodeId, node] of graph.nodes.entries()) {
      if (matchesExistingNode(nodeId, node, normalizedInput)) {
        return { nodeId, created: false };
      }
    }

    const geo = await geocodePlace(canonicalPlaceInput);
    if (!geo || Number.isNaN(geo.latitude) || Number.isNaN(geo.longitude)) {
      throw createHttpError(
        404,
        errors.PLACE_NOT_FOUND,
        `Unable to detect place: ${placeInput}`
      );
    }

    const nodeId = createDynamicNodeId(canonicalPlaceInput);
    const nowIso = new Date().toISOString();
    const metadata = {
      label: String(canonicalPlaceInput).trim(),
      displayName: geo.displayName || String(canonicalPlaceInput).trim(),
      latitude: geo.latitude,
      longitude: geo.longitude,
      dynamic: true,
      createdAt: nowIso,
      lastUsedAt: nowIso
    };

    graph.addNode(nodeId, metadata);
    try {
      await graphRepository.upsertNode({ id: nodeId, metadata });
    } catch (error) {
      logger.warn('Failed to persist dynamic node', {
        nodeId,
        placeInput,
        message: error?.message
      });
    }

    const nearestNodes = findNearestNodes(graph, nodeId, DYNAMIC_LINK_NEIGHBOR_LIMIT);
    if (nearestNodes.length === 0) {
      const nearbyHubs = stableHubSuggestions(graph, 3);
      logger.warn('No stable nodes available for dynamic place linking', {
        nodeId,
        placeInput,
        totalNodes: graph.nodes.size,
        suggestions: nearbyHubs
      });

      throw createHttpError(
        422,
        errors.GRAPH_CONNECTIVITY_GAP,
        nearbyHubs.length > 0
          ? `This place is not connected to the stable transit network yet. Try a nearby major area: ${nearbyHubs.join(', ')}.`
          : 'This place is not connected to the stable transit network yet. Try another nearby major area.'
      );
    }
    for (const neighbor of nearestNodes) {
      const weight = Number(Math.min(120, Math.max(1, neighbor.km * 20)).toFixed(2));

      if (!graph.getEdge(nodeId, neighbor.nodeId, 'walk')) {
        const edge = graph.addEdge(nodeId, neighbor.nodeId, 'walk', weight);
        edge.currentWeight = weight;
        edge.allowedVehicles.add('pedestrian');
        edge.allowedVehicles.add('bicycle');
      }

      if (!graph.getEdge(neighbor.nodeId, nodeId, 'walk')) {
        const edge = graph.addEdge(neighbor.nodeId, nodeId, 'walk', weight);
        edge.currentWeight = weight;
        edge.allowedVehicles.add('pedestrian');
        edge.allowedVehicles.add('bicycle');
      }

      try {
        const neighborNode = graph.nodes.get(neighbor.nodeId);
        if (!neighborNode) {
          logger.warn('Stable neighbor node not found in graph; skipping edge persistence', {
            nodeId,
            neighborNodeId: neighbor.nodeId
          });
          continue;
        }

        await graphRepository.upsertNode({
          id: neighbor.nodeId,
          metadata: neighborNode.metadata || {}
        });

        await graphRepository.upsertEdge({
          from: nodeId,
          to: neighbor.nodeId,
          mode: 'walk',
          baseWeight: weight,
          currentWeight: weight,
          allowedVehicles: ['pedestrian', 'bicycle']
        });

        await graphRepository.upsertEdge({
          from: neighbor.nodeId,
          to: nodeId,
          mode: 'walk',
          baseWeight: weight,
          currentWeight: weight,
          allowedVehicles: ['pedestrian', 'bicycle']
        });
      } catch (error) {
        logger.warn('Failed to persist dynamic connector edges', {
          nodeId,
          neighborNodeId: neighbor.nodeId,
          message: error?.message
        });
      }
    }

    return { nodeId, created: true };
  }
};