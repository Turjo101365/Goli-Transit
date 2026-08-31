import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { CircleMarker, MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import '../styles/tokens.css';
import { createRoute, getGraphSnapshot, simulateRoute } from '../services/route.service.js';
import { getCondition } from '../services/condition.service.js';
import { formatTime, toBanglaDigits } from '../utils/format.js';
import { nearestStation } from '../utils/geo.js';
import { RouteOptionsTable } from './RouteOptionsTable.jsx';
import { LocationSearchField } from './LocationSearchField.jsx';
import { useLanguage } from '../state/LanguageContext.jsx';
import { useTheme } from '../state/ThemeContext.jsx';
import { useTrip } from '../state/TripContext.jsx';

const DHAKA_CENTER = [23.7808, 90.4];
// Esri World Gray Canvas — free, no key, no signup — in both a dark and a
// light variant. Two layers each: the base (terrain/roads/water) and a
// transparent reference overlay (labels). Esri's tile REST API is
// z/row/col, i.e. {z}/{y}/{x} — swapped from the standard XYZ order
// Leaflet/OSM/CARTO use.
const ESRI_URLS = {
	dark: {
		base: 'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
		reference: 'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}'
	},
	light: {
		base: 'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
		reference: 'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}'
	}
};
const ACCESS_WALK_LIMIT_KM = 0.9; // 900m — beyond this, access leg is labelled rickshaw, not walk
const ARRIVE_BY_OFFSETS_MIN = [45, 90, 150];

// Explicit per-segment Leaflet style, not a CSS className — a className on
// an SVG path only works as long as a matching CSS rule exists, and that
// rule has gone missing from tokens.css before. These read straight off
// the design tokens (mode is carried by dash pattern first, colour
// second, per CLAUDE.md) so the map can't silently fall back to Leaflet's
// default blue again.
const MODE_LINE_STYLE = {
	walk: { color: 'var(--cream)', weight: 4, dashArray: '1 8' },
	metro: { color: 'var(--metro)', weight: 6 },
	rickshaw: { color: 'var(--stamp)', weight: 5, dashArray: '11 7' },
	bus: { color: 'var(--mode-bus)', weight: 5, dashArray: '12 5' },
	cng: { color: 'var(--mode-cng)', weight: 5, dashArray: '6 4' },
	bike: { color: 'var(--mode-bike)', weight: 5, dashArray: '3 3' }
};

const WEATHER_CONDITION_LABEL = {
	clear: { bn: 'পরিষ্কার', en: 'Clear' },
	rain: { bn: 'বৃষ্টি', en: 'Rain' },
	heavy_rain: { bn: 'ভারী বৃষ্টি', en: 'Heavy rain' }
};

const HEAT_CONDITION_LABEL = {
	cold: { bn: 'ঠান্ডা', en: 'Cold' },
	mild: { bn: 'মৃদু', en: 'Mild' },
	pleasant: { bn: 'মনোরম', en: 'Pleasant' },
	hot: { bn: 'গরম', en: 'Hot' },
	very_hot: { bn: 'অতি গরম', en: 'Very hot' }
};

// Practical advice from the real classified condition/heat band — rain
// takes priority over heat (getting soaked matters more than the
// temperature that moment), otherwise the hotter/colder end of the heat
// scale gets a tip; the comfortable middle gets none.
function weatherSuggestion(condition, heatCondition, lang) {
	if (condition === 'heavy_rain') {
		return t('ছাতা সঙ্গে নিন — রাস্তায় পানি জমতে পারে', 'Take an umbrella — roads may flood', lang);
	}

	if (condition === 'rain') {
		return t('ছাতা সঙ্গে নিন', 'Take an umbrella', lang);
	}

	if (heatCondition === 'very_hot') {
		return t('প্রচুর পানি পান করুন, সাথে ঠান্ডা পানি রাখুন', 'Drink plenty of water — carry cold water with you', lang);
	}

	if (heatCondition === 'hot') {
		return t('সাথে পানি রাখুন', 'Carry water with you', lang);
	}

	if (heatCondition === 'cold') {
		return t('গরম কাপড় পরে বের হন', 'Wear something warm', lang);
	}

	return null;
}

// Keeps the two picked points (and the pins) in view whenever either one
// changes — without this the map stays at its initial Dhaka-wide center
// and a far-off pick (e.g. Keraniganj) can render off in a corner or look
// zoomed to nothing in particular.
function FitBoundsHandler({ originLat, originLng, destLat, destLng }) {
	const map = useMap();

	useEffect(() => {
		if (originLat == null || originLng == null || destLat == null || destLng == null) {
			return;
		}

		map.fitBounds(
			[[originLat, originLng], [destLat, destLng]],
			{ padding: [45, 45], maxZoom: 15 }
		);
		// Only origin/destination should trigger a re-fit — not every render.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [originLat, originLng, destLat, destLng]);

	return null;
}

// Arrive-by options relative to the moment this screen was opened, not a
// fixed clock time — every visitor gets their own set. Rounds up to the
// next 15-minute mark first so the times read clean (9:15, not 9:07).
function buildArriveByOptions(referenceDate) {
	const base = new Date(referenceDate);
	base.setSeconds(0, 0);
	const remainder = base.getMinutes() % 15;
	base.setMinutes(base.getMinutes() + (15 - remainder));

	return ARRIVE_BY_OFFSETS_MIN.map((offsetMinutes) => {
		const date = new Date(base);
		date.setMinutes(date.getMinutes() + offsetMinutes);
		return date;
	});
}

// Leaflet marker/circle colours are set via JS, not CSS, so tokens.css
// custom properties aren't reachable here — these mirror the --cream/
// --stamp/--ground2/--metro token VALUES for each theme literally. Keep in
// sync if those tokens change.
const COLOUR_BY_THEME = {
	dark: { cream: '#F4EFE3', stamp: '#A8382A', ground2: '#1D2A34', metro: '#006747' },
	light: { cream: '#22261B', stamp: '#A8382A', ground2: '#DFE4CE', metro: '#006747' }
};

function pinIcon(colour, borderColour) {
	return L.divIcon({
		className: '',
		html: `<span style="display:block;width:16px;height:16px;border-radius:50%;background:${colour};border:2px solid ${borderColour};box-shadow:0 0 0 1px ${colour};"></span>`,
		iconSize: [16, 16],
		iconAnchor: [8, 8]
	});
}

function MapClickHandler({ armed, onPick }) {
	useMapEvents({
		click(event) {
			if (!armed) {
				return;
			}

			onPick({ lat: event.latlng.lat, lng: event.latlng.lng });
		}
	});

	return null;
}

function t(bn, en, lang) {
	return lang === 'en' ? en : bn;
}

function num(value, lang) {
	return lang === 'bn' ? toBanglaDigits(value) : String(value);
}

// Same সকাল/দুপুর H:MM convention as formatTime, with live-ticking seconds
// appended — a plain "clock" reads as static without them.
function formatClock(date, lang) {
	const seconds = String(date.getSeconds()).padStart(2, '0');
	return `${formatTime(date, lang)}:${num(seconds, lang)}`;
}

// Real street address for a picked point, via Nominatim's reverse endpoint
// (same free, no-key service already used for forward search) — replaces
// raw "lat, lng" text with something a person can actually read. Returns
// null on any failure so callers keep their existing fallback label.
async function reverseGeocode(lat, lng) {
	try {
		const url = new URL('https://nominatim.openstreetmap.org/reverse');
		url.searchParams.set('format', 'jsonv2');
		url.searchParams.set('lat', lat);
		url.searchParams.set('lon', lng);
		url.searchParams.set('zoom', '18');

		const response = await fetch(url.toString());
		if (!response.ok) {
			return null;
		}

		const data = await response.json();
		return data?.display_name || null;
	} catch {
		return null;
	}
}

const PREFERENCE_OPTIONS = [
	{ id: 'fastest', icon: '⚡', bn: 'দ্রুততম', en: 'Fastest', descBn: 'সর্বনিম্ন সময়', descEn: 'Min travel time' },
	{ id: 'comfortable', icon: '🛋', bn: 'আরামদায়ক', en: 'Comfortable', descBn: 'কম বদল ও কম হাঁটা', descEn: 'Fewer transfers' },
	{ id: 'family', icon: '👨‍👩‍👧', bn: 'পারিবারিক', en: 'Family', descBn: 'সর্বোচ্চ আরাম ও নিরাপত্তা', descEn: 'Family safe' },
	{ id: 'fast_comfortable', icon: '⚡🛋', bn: 'দ্রুত + আরাম', en: 'Fast & Comfy', descBn: 'সময় ও আরামের ব্যালেন্স', descEn: 'Speed + comfort' },
	{ id: 'cheapest', icon: '💰', bn: 'সাশ্রয়ী', en: 'Cheapest', descBn: 'সর্বনিম্ন আনুমানিক ভাড়া', descEn: 'Lowest fare' }
];

const TRANSPORT_MODES = [
	{ id: 'bus', icon: '🚌', bn: 'বাস', en: 'Bus' },
	{ id: 'metro', icon: '🚇', bn: 'মেট্রো', en: 'Metro' },
	{ id: 'rickshaw', icon: '🛺', bn: 'রিকশা', en: 'Rickshaw' },
	{ id: 'cng', icon: '🛺', bn: 'সিএনজি', en: 'CNG' },
	{ id: 'walk', icon: '🚶', bn: 'হাঁটা', en: 'Walking' }
];

export function EzzGoMap() {
	const { lang } = useLanguage();
	const { theme } = useTheme();
	const COLOUR = COLOUR_BY_THEME[theme];
	const esriUrls = ESRI_URLS[theme];
	const pinIconA = useMemo(() => pinIcon(COLOUR.cream, COLOUR.ground2), [COLOUR.cream, COLOUR.ground2]);
	const pinIconB = useMemo(() => pinIcon(COLOUR.stamp, COLOUR.ground2), [COLOUR.stamp, COLOUR.ground2]);
	const [stations, setStations] = useState([]);
	const [stationsError, setStationsError] = useState(null);
	// Shared with Live and Belt (TripContext) so a point picked on one screen
	// carries over to the others, and survives navigating away and back.
	const { origin, setOrigin, destination, setDestination } = useTrip();
	const endpoints = useMemo(() => ({ A: origin, B: destination }), [origin, destination]);
	function setEndpoints(updater) {
		const current = { A: origin, B: destination };
		const next = typeof updater === 'function' ? updater(current) : updater;
		if (next.A !== current.A) {
			setOrigin(next.A);
		}
		if (next.B !== current.B) {
			setDestination(next.B);
		}
	}
	const [armed, setArmed] = useState(null); // 'A' | 'B' | null — which endpoint a map tap targets
	const [preference, setPreference] = useState('fastest');
	const [allowedModes, setAllowedModes] = useState(['metro', 'bus', 'rickshaw', 'cng', 'walk']);
	const [routeOptions, setRouteOptions] = useState([]);
	const [routeError, setRouteError] = useState(null);
	const [routeLoading, setRouteLoading] = useState(false);
	const [selectedOptionId, setSelectedOptionId] = useState('metro');
	const [arriveByOptions] = useState(() => buildArriveByOptions(new Date()));
	const [arriveByIndex, setArriveByIndex] = useState(1);
	const [simulation, setSimulation] = useState(null);
	const [simLoading, setSimLoading] = useState(false);
	const [simError, setSimError] = useState(null);
	const [simStep, setSimStep] = useState(0);
	const [simPlaying, setSimPlaying] = useState(false);
	const [weather, setWeather] = useState(null);
	const [clockNow, setClockNow] = useState(() => new Date());
	const geoRequestedRef = useRef(false);
	const stationsRef = useRef(stations);
	const endpointsRef = useRef(endpoints);

	function toggleAllowedMode(modeId) {
		setAllowedModes((current) => {
			if (current.includes(modeId)) {
				if (current.length <= 1) {
					return current; // keep at least 1 mode active
				}
				return current.filter((m) => m !== modeId);
			}
			return [...current, modeId];
		});
	}

	useEffect(() => {
		stationsRef.current = stations;
	}, [stations]);

	useEffect(() => {
		endpointsRef.current = endpoints;
	}, [endpoints]);

	useEffect(() => {
		getGraphSnapshot()
			.then((snapshot) => {
				const list = (snapshot.nodes || [])
					.filter((node) => node.metadata?.type === 'metro_station')
					.map((node) => ({
						id: node.id,
						nameBn: node.metadata.nameBn,
						nameEn: node.metadata.nameEn,
						lat: node.metadata.lat,
						lng: node.metadata.lng
					}));
				setStations(list);
			})
			.catch((err) => setStationsError(err.message));
	}, []);

	// Real live reading (Open-Meteo, via the backend's weather cache) — not
	// a placeholder. Fetched once per visit; the backend's own TTL keeps it
	// fresh enough without this screen needing to poll.
	useEffect(() => {
		getCondition()
			.then((data) =>
				setWeather({
					condition: data.condition,
					temperatureC: data.temperatureC,
					feelsLikeC: data.feelsLikeC,
					heatCondition: data.heatCondition
				})
			)
			.catch(() => {});
	}, []);

	// A real ticking clock, not a value frozen at mount — the whole point of
	// a "live" watch is that the seconds actually move.
	useEffect(() => {
		const id = setInterval(() => setClockNow(new Date()), 1000);
		return () => clearInterval(id);
	}, []);

	const originPoint = endpoints.A;
	const destinationPoint = endpoints.B;

	// Fresh /route request every time endpoints, preference, or allowed modes change
	useEffect(() => {
		if (!originPoint || !destinationPoint) {
			setRouteOptions([]);
			setRouteError(null);
			return undefined;
		}

		let cancelled = false;
		setRouteLoading(true);
		setRouteError(null);

		createRoute({
			originLat: originPoint.lat,
			originLng: originPoint.lng,
			destinationLat: destinationPoint.lat,
			destinationLng: destinationPoint.lng,
			originLabel: originPoint.label,
			destinationLabel: destinationPoint.label,
			preference,
			allowedModes
		})
			.then((result) => {
				if (cancelled) {
					return;
				}

				const nextOptions = result.options || [];
				setRouteOptions(nextOptions);
				// Automatically select the top recommended option
				if (nextOptions.length > 0) {
					setSelectedOptionId(nextOptions[0]?.id);
				}
			})
			.catch((err) => {
				if (!cancelled) {
					setRouteError(err.message);
				}
			})
			.finally(() => {
				if (!cancelled) {
					setRouteLoading(false);
				}
			});

		return () => {
			cancelled = true;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [originPoint?.lat, originPoint?.lng, destinationPoint?.lat, destinationPoint?.lng, preference, allowedModes]);

	// A stale simulation trace from a previous origin/destination shouldn't
	// keep animating (or keep claiming to be "done") once the query changes.
	useEffect(() => {
		setSimulation(null);
		setSimStep(0);
		setSimPlaying(false);
		setSimError(null);
	}, [originPoint?.lat, originPoint?.lng, destinationPoint?.lat, destinationPoint?.lng]);

	// Steps through the recorded trace on a timer while playing — this is a
	// replay of the real search astarMetroPath() already ran server-side,
	// not a live re-run, so the pacing here is purely presentational.
	useEffect(() => {
		if (!simPlaying || !simulation) {
			return undefined;
		}

		const id = setInterval(() => {
			setSimStep((current) => {
				if (current >= simulation.trace.length - 1) {
					setSimPlaying(false);
					return current;
				}

				return current + 1;
			});
		}, 450);

		return () => clearInterval(id);
	}, [simPlaying, simulation]);

	async function handleSimulate() {
		if (!originPoint || !destinationPoint) {
			return;
		}

		setSimLoading(true);
		setSimError(null);
		setSimulation(null);
		setSimStep(0);
		setSimPlaying(false);

		try {
			const result = await simulateRoute({
				originLat: originPoint.lat,
				originLng: originPoint.lng,
				destinationLat: destinationPoint.lat,
				destinationLng: destinationPoint.lng
			});

			if (!result.possible) {
				setSimError(t('এই দুই জায়গার মধ্যে মেট্রো সিমুলেশন সম্ভব না', 'Metro simulation not possible for these two points', lang));
			} else {
				setSimulation(result);
				setSimPlaying(true);
			}
		} catch (err) {
			setSimError(err.message);
		} finally {
			setSimLoading(false);
		}
	}

	function resolveEndpoint(endpointId, point, label, { onlyIfEmpty = false, nodeId = null } = {}) {
		// Decided from the ref (always current, unlike a variable mutated
		// inside the setEndpoints updater below — React doesn't guarantee
		// that updater runs synchronously, so reading a flag it set right
		// after calling setEndpoints is not reliable).
		if (onlyIfEmpty && endpointsRef.current[endpointId]) {
			return;
		}

		setEndpoints((current) => {
			if (onlyIfEmpty && current[endpointId]) {
				return current;
			}

			const resolved = nearestStation(point, stationsRef.current);
			const accessKm = resolved ? resolved.km : null;
			const fallbackLabel = resolved
				? `${t('কাছে', 'Near', lang)}: ${t(resolved.station.nameBn, resolved.station.nameEn, lang)}`
				: `${point.lat.toFixed(4)}, ${point.lng.toFixed(4)}`;

			return {
				...current,
				[endpointId]: {
					label: label || fallbackLabel,
					lat: point.lat,
					lng: point.lng,
					// Only set when the pick itself IS a real station (passed through
					// from LocationSearchField's local-station match) — not inferred
					// from nearestStation, which can be up to METRO_ACCESS_RADIUS_KM
					// away and isn't the same as "this point is that station."
					nodeId,
					nearestStation: resolved?.station || null,
					accessKm,
					accessMode: accessKm !== null && accessKm > ACCESS_WALK_LIMIT_KM ? 'rickshaw' : 'walk'
				}
			};
		});
		setArmed(null);

		// No caller-supplied label (geolocation, map-tap, drag) — upgrade the
		// synchronous fallback (nearest-station or raw coordinates) to a real
		// street address once reverse geocoding resolves, but only if this
		// endpoint hasn't since moved on to a different point.
		if (!label) {
			reverseGeocode(point.lat, point.lng).then((address) => {
				if (!address) {
					return;
				}

				setEndpoints((current) => {
					const existing = current[endpointId];
					if (!existing || existing.lat !== point.lat || existing.lng !== point.lng) {
						return current;
					}

					return { ...current, [endpointId]: { ...existing, label: address } };
				});
			});
		}
	}

	// Auto-fill "From" from the device's location, once per visit. Fires
	// immediately on mount rather than waiting for the station list (which
	// may never arrive if the backend's real graph is unavailable) —
	// stationsRef always holds the latest station list, however late it
	// loads, so the fallback label can still name the nearest real station
	// whenever the geolocation callback actually resolves. Never overwrites
	// a manual pick: if the user already tapped/searched/dragged "From"
	// before this resolves, onlyIfEmpty leaves it alone.
	useEffect(() => {
		if (geoRequestedRef.current || !('geolocation' in navigator)) {
			return;
		}

		geoRequestedRef.current = true;
		navigator.geolocation.getCurrentPosition(
			(position) => {
				resolveEndpoint(
					'A',
					{ lat: position.coords.latitude, lng: position.coords.longitude },
					null,
					{ onlyIfEmpty: true }
				);
			},
			() => {}, // denied or unavailable — the user can still pick "From" manually
			{ enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
		);
	}, []);

	function handleMapPick(point) {
		resolveEndpoint(armed, point, null);
	}

	function handleDrag(endpointId, event) {
		const { lat, lng } = event.target.getLatLng();
		resolveEndpoint(endpointId, { lat, lng }, null);
	}

	const selectedOption = routeOptions.find((option) => option.id === selectedOptionId);
	const hasMetroOption = routeOptions.some((option) => option.id === 'metro');
	const currentSimStep = simulation?.trace[simStep] || null;
	const simDone = simulation ? simStep >= simulation.trace.length - 1 : false;

	// Per-station colour for the current point in playback: 'frontier'
	// (queued, not yet expanded) or 'visited' (expanded) from the real
	// trace up to this step, then every station on the final path once
	// playback reaches the end — not a fixed "the path was X" overlay
	// shown from the start.
	const simStateByStation = useMemo(() => {
		if (!simulation) {
			return {};
		}

		const map = {};
		for (let i = 0; i <= simStep && i < simulation.trace.length; i++) {
			const step = simulation.trace[i];
			if (step.action === 'visit' || map[step.key] !== 'visited') {
				map[step.key] = step.action === 'visit' ? 'visited' : 'frontier';
			}
		}

		if (simDone) {
			for (const stationId of simulation.path) {
				map[stationId] = 'path';
			}
		}

		return map;
	}, [simulation, simStep, simDone]);

	const arriveBy = arriveByOptions[arriveByIndex];
	const departureDate = useMemo(() => {
		if (!selectedOption) {
			return null;
		}

		const date = new Date(arriveBy);
		date.setMinutes(date.getMinutes() - selectedOption.p90);
		return date;
	}, [selectedOption, arriveBy]);

	return (
		<section style={{ background: 'var(--ground)', padding: '32px 0', minHeight: '100vh', color: 'var(--cream)' }}>
			<div className="map-wrap">
				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 20 }}>
					<div>
						<h1 className="t-brand">EZZ GO</h1>
						<p className="t-label">{t('জ্যাম লাগার আগেই', 'Out before the jam', lang)}</p>
					</div>

					{weather ? (
						<div style={{ textAlign: 'right' }}>
							<p className="t-label">{t('এখন', 'Now', lang)}</p>
							<p className="t-brand" style={{ fontSize: 'clamp(28px, 4vw, 44px)', margin: '2px 0 0' }}>
								{t(WEATHER_CONDITION_LABEL[weather.condition]?.bn, WEATHER_CONDITION_LABEL[weather.condition]?.en, lang) || weather.condition}
								{weather.temperatureC !== null ? ` · ${num(Math.round(weather.temperatureC), lang)}°` : ''}
							</p>
							<p className="t-body" style={{ marginTop: 2, color: 'var(--c70)' }}>
								{weather.heatCondition ? t(HEAT_CONDITION_LABEL[weather.heatCondition]?.bn, HEAT_CONDITION_LABEL[weather.heatCondition]?.en, lang) : null}
								{weather.heatCondition && weather.feelsLikeC !== null ? ' · ' : ''}
								{weather.feelsLikeC !== null ? `${t('অনুভূত হচ্ছে', 'Feels like', lang)} ${num(Math.round(weather.feelsLikeC), lang)}°` : ''}
							</p>
							{weatherSuggestion(weather.condition, weather.heatCondition, lang) ? (
								<p className="t-label" style={{ marginTop: 6, color: 'var(--stamp)' }}>
									{weatherSuggestion(weather.condition, weather.heatCondition, lang)}
								</p>
							) : null}
						</div>
					) : null}
				</div>

				<div className="rule-double" style={{ margin: '16px 0' }} />

				<div className="map-grid">
				<div className="map-grid-endpoints">
				{['A', 'B'].map((endpointId) => {
					const endpoint = endpoints[endpointId];
					const isArmed = armed === endpointId;

					return (
						<div key={endpointId} className="rule-hair" style={{ padding: '10px 0' }}>
							<LocationSearchField
								label={
									<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
										<span
											style={{
												width: 8,
												height: 8,
												borderRadius: '50%',
												background: endpointId === 'A' ? 'var(--cream)' : 'var(--stamp)',
												flexShrink: 0
											}}
										/>
										{t(endpointId === 'A' ? 'কোথা থেকে' : 'কোথায়', endpointId === 'A' ? 'From' : 'To', lang)}
									</span>
								}
								placeholder={t('জায়গার নাম লিখুন', 'Type a place name', lang)}
								stations={stations}
								value={endpoint}
								onSelect={(point) => resolveEndpoint(endpointId, { lat: point.lat, lng: point.lng }, point.label, { nodeId: point.nodeId || null })}
								onFocus={() => setArmed(endpointId)}
								lang={lang}
							/>
							{endpoint && endpoint.accessMode === 'rickshaw' ? (
								<div className="t-label" style={{ color: 'var(--stamp)', marginTop: 4 }}>
									{t('৯০০ মিটারের বেশি — রিকশা', '>900m — rickshaw access', lang)}
								</div>
							) : null}
							{isArmed ? (
								<p className="t-label" style={{ marginTop: 6 }}>
									{t('অথবা ম্যাপে ট্যাপ করুন', 'or tap the map', lang)}
								</p>
							) : null}
						</div>
					);
				})}

				{stationsError ? <p className="t-body" style={{ color: 'var(--stamp)' }}>{stationsError}</p> : null}
				</div>

				<div className="map-grid-map">
				<div className="rule-solid" />
				<div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '10px 0 6px' }}>
					<span className="live-dot" />
					<span className="t-label">{t('লাইভ সময়', 'Live time', lang)}</span>
					<span className="t-num" style={{ fontSize: 18 }}>{formatClock(clockNow, lang)}</span>
				</div>
				<div className="map-frame">
					<MapContainer center={DHAKA_CENTER} zoom={12} scrollWheelZoom style={{ width: '100%', height: '100%' }}>
						<TileLayer attribution="Tiles &copy; Esri" url={esriUrls.base} />
						<TileLayer url={esriUrls.reference} />

						<MapClickHandler armed={armed} onPick={handleMapPick} />
						<FitBoundsHandler
							originLat={originPoint?.lat ?? null}
							originLng={originPoint?.lng ?? null}
							destLat={destinationPoint?.lat ?? null}
							destLng={destinationPoint?.lng ?? null}
						/>

						{stations.map((station) => {
							const simState = simStateByStation[station.id];
							const simFill = { frontier: '#E0B028', visited: COLOUR.metro, path: COLOUR.stamp }[simState];

							return (
								<CircleMarker
									key={station.id}
									center={[station.lat, station.lng]}
									radius={simState === 'path' ? 5 : simState ? 4.5 : 3.5}
									pathOptions={{
										color: simState === 'path' ? COLOUR.stamp : COLOUR.metro,
										weight: simState === 'path' ? 2.5 : 1.5,
										fillColor: simFill || COLOUR.ground2,
										fillOpacity: 1
									}}
								/>
							);
						})}

						{selectedOption?.segments.map((segment, index) => (
							<Polyline
								key={`${segment.mode}-${index}`}
								positions={segment.pts}
								pathOptions={MODE_LINE_STYLE[segment.mode] || {}}
							/>
						))}

						{endpoints.A ? (
							<Marker
								position={[endpoints.A.lat, endpoints.A.lng]}
								icon={pinIconA}
								draggable
								eventHandlers={{ dragend: (event) => handleDrag('A', event) }}
							/>
						) : null}
						{endpoints.B ? (
							<Marker
								position={[endpoints.B.lat, endpoints.B.lng]}
								icon={pinIconB}
								draggable
								eventHandlers={{ dragend: (event) => handleDrag('B', event) }}
							/>
						) : null}
					</MapContainer>
				</div>

				{hasMetroOption ? (
					<div style={{ marginTop: 12 }}>
						{!simulation ? (
							<button type="button" className="chip" onClick={handleSimulate} disabled={simLoading}>
								{simLoading
									? t('হিসাব হচ্ছে…', 'Computing…', lang)
									: t('A* দিয়ে রুট খোঁজা দেখুন', 'Watch A* find the route', lang)}
							</button>
						) : (
							<div className="panel" style={{ padding: '10px 14px' }}>
								<div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
									<button type="button" className="chip" onClick={() => setSimPlaying((playing) => !playing)}>
										{simPlaying ? t('থামান', 'Pause', lang) : t('চালান', 'Play', lang)}
									</button>
									<button
										type="button"
										className="chip"
										onClick={() => {
											setSimStep(0);
											setSimPlaying(true);
										}}
									>
										{t('আবার শুরু', 'Restart', lang)}
									</button>
									<span className="t-label">{num(simStep + 1, lang)} / {num(simulation.trace.length, lang)}</span>
									<button
										type="button"
										className="chip"
										style={{ marginLeft: 'auto' }}
										onClick={() => setSimulation(null)}
									>
										{t('বন্ধ', 'Close', lang)}
									</button>
								</div>

								{currentSimStep ? (
									<p className="t-body" style={{ marginTop: 8, fontSize: 13 }}>
										{currentSimStep.action === 'visit'
											? t('পরীক্ষা করা হচ্ছে', 'Expanding', lang)
											: t('বিবেচনায় রাখা হচ্ছে', 'Queued', lang)}
										{': '}
										<b>
											{t(
												stations.find((station) => station.id === currentSimStep.key)?.nameBn,
												stations.find((station) => station.id === currentSimStep.key)?.nameEn,
												lang
											) || currentSimStep.key}
										</b>
										{' — g='}{num(currentSimStep.g.toFixed(1), lang)} h={num(currentSimStep.h.toFixed(1), lang)} f={num(currentSimStep.f.toFixed(1), lang)}
									</p>
								) : null}

								{simDone ? (
									<p className="t-body" style={{ marginTop: 6, color: 'var(--metro)', fontSize: 13 }}>
										{t('সেরা রুট পাওয়া গেছে', 'Optimal route found', lang)} — {num(simulation.minutes, lang)} {t('মিনিট', 'min', lang)} · ৳{num(simulation.fareTaka, lang)}
									</p>
								) : null}
							</div>
						)}
						{simError ? <p className="t-body" style={{ color: 'var(--stamp)', marginTop: 6 }}>{simError}</p> : null}
					</div>
				) : null}

				{selectedOption ? (
					<div className="panel" style={{ marginTop: 12, padding: '12px 16px', display: 'flex', gap: 28, flexWrap: 'wrap' }}>
						<div>
							{/* Never a single ETA — p50 (usual) and p90 (bad day) side by side, same pairing as the options table above. */}
							<p className="t-label">{t('সময়', 'Time', lang)}</p>
							<p className="t-num" style={{ fontSize: 18 }}>
								{num(selectedOption.p50, lang)} · {num(selectedOption.p90, lang)} {t('মিনিট', 'min', lang)}
							</p>
						</div>
						<div>
							<p className="t-label">{t('দূরত্ব', 'Distance', lang)}</p>
							<p className="t-num" style={{ fontSize: 18 }}>{num(selectedOption.distanceKm, lang)} {t('কিমি', 'km', lang)}</p>
						</div>
						<div>
							<p className="t-label">{t('ভাড়া', 'Fare', lang)}</p>
							<p className="t-num" style={{ fontSize: 18 }}>
								{selectedOption.fare === null ? t('পরিবর্তনশীল', 'Varies', lang) : `৳${num(selectedOption.fare, lang)}`}
							</p>
						</div>
					</div>
				) : null}
				</div>

				<div className="map-grid-ticket">
				<div className="rule-solid" style={{ marginBottom: 20 }} />

				{/* Preference & Allowed Modes Control Panel */}
				<div className="routing-control-panel">
					<div className="routing-control-header">
						<h3 className="routing-control-title">
							<span>🧭</span>
							<span>{t('রুট পছন্দ (Route Preference)', 'Route Preference', lang)}</span>
						</h3>
						<span className="t-label" style={{ fontSize: 11, color: 'var(--c70)' }}>
							{t('A* অ্যালগরিদম দ্বারা র‍্যাঙ্ককৃত', 'A* Algorithm Ranked', lang)}
						</span>
					</div>

					<div className="preference-chips-grid">
						{PREFERENCE_OPTIONS.map((pref) => {
							const isActive = pref.id === preference;
							return (
								<button
									key={pref.id}
									type="button"
									className={`preference-chip ${isActive ? 'preference-chip--active' : ''}`}
									onClick={() => setPreference(pref.id)}
									title={t(pref.descBn, pref.descEn, lang)}
								>
									<span className="preference-chip-icon">{pref.icon}</span>
									<span style={{ display: 'flex', flexDirection: 'column' }}>
										<span>{t(pref.bn, pref.en, lang)}</span>
										<span style={{ fontSize: 10, opacity: 0.75, fontWeight: 400 }}>
											{t(pref.descBn, pref.descEn, lang)}
										</span>
									</span>
								</button>
							);
						})}
					</div>

					<div className="mode-filter-bar">
						<span className="mode-filter-label">
							{t('অনুমোদিত বাহন:', 'Allowed Modes:', lang)}
						</span>
						{TRANSPORT_MODES.map((mode) => {
							const isChecked = allowedModes.includes(mode.id);
							return (
								<button
									key={mode.id}
									type="button"
									className={`mode-toggle-chip ${isChecked ? 'mode-toggle-chip--active' : ''}`}
									onClick={() => toggleAllowedMode(mode.id)}
									aria-pressed={isChecked}
								>
									<span className="mode-toggle-check">{isChecked ? '☑' : '☐'}</span>
									<span>{mode.icon}</span>
									<span>{t(mode.bn, mode.en, lang)}</span>
								</button>
							);
						})}
					</div>
				</div>

				{!originPoint || !destinationPoint ? (
					<p className="t-body" style={{ color: 'var(--c70)' }}>
						{t('যাত্রা দেখতে দুটো জায়গাই বেছে নিন', 'Pick both "From" and "To" to see a route', lang)}
					</p>
				) : routeLoading ? (
					<p className="t-body">…</p>
				) : routeError ? (
					<p className="t-body" style={{ color: 'var(--stamp)' }}>{routeError}</p>
				) : routeOptions.length === 0 ? (
					<p className="t-body" style={{ color: 'var(--c70)' }}>
						{t('নির্বাচিত বাহন ও পছন্দের মধ্যে কোনো রুট পাওয়া যায়নি। অন্য বাহন নির্বাচন করে চেষ্টা করুন।', 'No route found matching these modes and preference. Try selecting more transport modes.', lang)}
					</p>
				) : selectedOption ? (
					<>
						<div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
							<div className="stamp">
								<p className="t-label">{t('ছাড়ার সময়', 'Leave by', lang)}</p>
								<p className="t-place">{departureDate ? formatTime(departureDate, lang) : '—'}</p>
							</div>

							<div style={{ display: 'flex', gap: 8 }}>
								{arriveByOptions.map((chipDate, index) => {
									const isSelected = index === arriveByIndex;

									return (
										<button
											key={chipDate.getTime()}
											type="button"
											onClick={() => setArriveByIndex(index)}
											className="chip"
											aria-pressed={isSelected}
											style={{ display: 'flex', alignItems: 'center', gap: 6 }}
										>
											<span className={`punch${isSelected ? ' punch--selected' : ''}`} />
											<span className="t-num" style={{ fontSize: 14 }}>{formatTime(chipDate, lang)}</span>
										</button>
									);
								})}
							</div>
						</div>

						<RouteOptionsTable
							options={routeOptions}
							lang={lang}
							punchedId={selectedOptionId}
							onPunch={setSelectedOptionId}
							recommendationReason={routeOptions.find((opt) => opt.isRecommended)?.recommendationReason}
						/>
					</>
				) : (
					<p className="t-body">…</p>
				)}
				</div>
				</div>
			</div>
		</section>
	);
}
