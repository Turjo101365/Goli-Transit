import { redisClient } from '../cache/redis.client.js';
import { config } from '../constants/config.js';
import { logger } from '../utils/logger.js';
import { pointInPolygon } from '../utils/point-in-polygon.js';
import waterlogging from '../data/waterlogging.json' with { type: 'json' };

const { DHAKA_LAT, DHAKA_LNG, CACHE_TTL_SECONDS, RAIN_MM_THRESHOLD, HEAVY_RAIN_MM_THRESHOLD } = config.weather;
const WEATHER_CACHE_KEY = 'weather-cache:v1:dhaka';

let memoryCache = null;

function isFresh(snapshot) {
	if (!snapshot?.fetchedAt) {
		return false;
	}

	const ageSeconds = (Date.now() - new Date(snapshot.fetchedAt).getTime()) / 1000;
	return ageSeconds < CACHE_TTL_SECONDS;
}

async function fetchLiveWeather() {
	const url = new URL('https://api.open-meteo.com/v1/forecast');
	url.searchParams.set('latitude', String(DHAKA_LAT));
	url.searchParams.set('longitude', String(DHAKA_LNG));
	url.searchParams.set('current', 'precipitation');
	url.searchParams.set('minutely_15', 'precipitation_probability');
	url.searchParams.set('timezone', 'Asia/Dhaka');
	url.searchParams.set('forecast_days', '1');

	const response = await fetch(url.toString());
	if (!response.ok) {
		throw new Error(`Open-Meteo returned ${response.status}`);
	}

	const payload = await response.json();
	const currentTime = payload.current?.time;
	const timeIndex = payload.minutely_15?.time?.indexOf(currentTime) ?? -1;
	const precipitationProbability = timeIndex >= 0
		? payload.minutely_15.precipitation_probability[timeIndex]
		: null;

	return {
		precipitationMm: Number(payload.current?.precipitation ?? 0),
		precipitationProbability,
		fetchedAt: new Date().toISOString()
	};
}

export async function getWeatherSnapshot() {
	if (isFresh(memoryCache)) {
		return memoryCache;
	}

	const cached = await redisClient.getJson(WEATHER_CACHE_KEY);
	if (isFresh(cached)) {
		memoryCache = cached;
		return cached;
	}

	try {
		const snapshot = await fetchLiveWeather();
		memoryCache = snapshot;
		await redisClient.setJson(WEATHER_CACHE_KEY, snapshot, CACHE_TTL_SECONDS);
		return snapshot;
	} catch (error) {
		logger.warn('Failed to fetch live weather, serving stale/fallback data', {
			message: error?.message
		});

		return cached || memoryCache || { precipitationMm: 0, precipitationProbability: null, fetchedAt: null };
	}
}

export function classifyCondition(precipitationMm) {
	if (precipitationMm >= HEAVY_RAIN_MM_THRESHOLD) {
		return 'heavy_rain';
	}

	if (precipitationMm >= RAIN_MM_THRESHOLD) {
		return 'rain';
	}

	return 'clear';
}

export async function getCondition() {
	const snapshot = await getWeatherSnapshot();
	return classifyCondition(snapshot.precipitationMm);
}

export async function isWaterlogged(lat, lng) {
	const condition = await getCondition();
	if (condition === 'clear') {
		return false;
	}

	return waterlogging.areas.some(
		(area) => area.polygon.length >= 3 && pointInPolygon(lat, lng, area.polygon)
	);
}

export async function listWaterloggedAreas() {
	const condition = await getCondition();
	if (condition === 'clear') {
		return [];
	}

	return waterlogging.areas
		.filter((area) => area.polygon.length >= 3)
		.map(({ id, name_bn: nameBn, name_en: nameEn }) => ({ id, nameBn, nameEn }));
}
