import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import { CircleMarker, MapContainer, Marker, Polyline, TileLayer, useMapEvents } from 'react-leaflet';
import '../styles/tokens.css';
import { createRoute, getGraphSnapshot } from '../services/route.service.js';
import { formatTime } from '../utils/format.js';
import { nearestStation } from '../utils/geo.js';
import { RouteOptionsTable } from './RouteOptionsTable.jsx';
import { useLanguage } from '../state/LanguageContext.jsx';

const DHAKA_CENTER = [23.7808, 90.4];
const NOMINATIM_DEBOUNCE_MS = 600;
// Esri World Light Gray Canvas — free, no key, no signup. Two layers: the
// base (terrain/roads/water) and a transparent reference overlay (labels).
// Esri's tile REST API is z/row/col, i.e. {z}/{y}/{x} — swapped from the
// standard XYZ order Leaflet/OSM/CARTO use.
const ESRI_BASE_URL = 'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}';
const ESRI_REFERENCE_URL = 'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}';
const ACCESS_WALK_LIMIT_KM = 0.9; // 900m — beyond this, access leg is labelled rickshaw, not walk
const ARRIVE_BY_OFFSETS_MIN = [45, 90, 150];

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
// custom properties aren't reachable here — these mirror --cream/--stamp/
// --ground2/--metro literally. Keep them in sync if the tokens change.
const COLOUR = {
	cream: '#F4EFE3',
	stamp: '#A8382A',
	ground2: '#1D2A34',
	metro: '#006747'
};

function pinIcon(colour) {
	return L.divIcon({
		className: '',
		html: `<span style="display:block;width:16px;height:16px;border-radius:50%;background:${colour};border:2px solid ${COLOUR.ground2};box-shadow:0 0 0 1px ${colour};"></span>`,
		iconSize: [16, 16],
		iconAnchor: [8, 8]
	});
}

const PIN_ICON_A = pinIcon(COLOUR.cream);
const PIN_ICON_B = pinIcon(COLOUR.stamp);

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

export function FurutMap() {
	const { lang, toggleLang } = useLanguage();
	const [stations, setStations] = useState([]);
	const [stationsError, setStationsError] = useState(null);
	const [endpoints, setEndpoints] = useState({ A: null, B: null });
	const [armed, setArmed] = useState(null); // 'A' | 'B' | null
	const [query, setQuery] = useState('');
	const [searchResults, setSearchResults] = useState([]);
	const [searchLoading, setSearchLoading] = useState(false);
	const [routeOptions, setRouteOptions] = useState([]);
	const [routeError, setRouteError] = useState(null);
	const [routeLoading, setRouteLoading] = useState(false);
	const [selectedOptionId, setSelectedOptionId] = useState('metro');
	const [arriveByOptions] = useState(() => buildArriveByOptions(new Date()));
	const [arriveByIndex, setArriveByIndex] = useState(1);
	const debounceRef = useRef(null);
	const geoRequestedRef = useRef(false);
	const stationsRef = useRef(stations);
	const endpointsRef = useRef(endpoints);

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

	const originPoint = endpoints.A;
	const destinationPoint = endpoints.B;

	// Fresh /route request every time either endpoint changes — real
	// dynamic directions, not a fixed dataset. Nothing fires until both
	// "From" and "To" are set.
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
			destinationLng: destinationPoint.lng
		})
			.then((result) => {
				if (cancelled) {
					return;
				}

				const nextOptions = result.options || [];
				setRouteOptions(nextOptions);
				setSelectedOptionId((current) =>
					nextOptions.some((option) => option.id === current) ? current : nextOptions[0]?.id
				);
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
	}, [originPoint?.lat, originPoint?.lng, destinationPoint?.lat, destinationPoint?.lng]);

	// Local stations first; Nominatim only when there's no local match at all.
	useEffect(() => {
		window.clearTimeout(debounceRef.current);

		const trimmed = query.trim();
		if (!armed || trimmed.length < 2) {
			setSearchResults([]);
			setSearchLoading(false);
			return undefined;
		}

		const localMatches = stations.filter(
			(station) =>
				station.nameBn.includes(trimmed) || station.nameEn.toLowerCase().includes(trimmed.toLowerCase())
		);

		if (localMatches.length > 0) {
			setSearchResults(localMatches.map((station) => ({ source: 'local', ...station })));
			setSearchLoading(false);
			return undefined;
		}

		setSearchLoading(true);
		debounceRef.current = window.setTimeout(async () => {
			try {
				const url = new URL('https://nominatim.openstreetmap.org/search');
				url.searchParams.set('q', trimmed);
				url.searchParams.set('format', 'jsonv2');
				url.searchParams.set('viewbox', '90.30,23.92,90.50,23.66');
				url.searchParams.set('bounded', '1');
				url.searchParams.set('limit', '5');

				const response = await fetch(url.toString());
				const results = response.ok ? await response.json() : [];
				setSearchResults(
					(Array.isArray(results) ? results : []).map((result) => ({
						source: 'nominatim',
						id: `nom_${result.place_id}`,
						nameBn: result.display_name,
						nameEn: result.display_name,
						lat: Number(result.lat),
						lng: Number(result.lon)
					}))
				);
			} catch {
				setSearchResults([]);
			} finally {
				setSearchLoading(false);
			}
		}, NOMINATIM_DEBOUNCE_MS);

		return () => window.clearTimeout(debounceRef.current);
	}, [query, armed, stations]);

	function resolveEndpoint(endpointId, point, label, { onlyIfEmpty = false } = {}) {
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
					nearestStation: resolved?.station || null,
					accessKm,
					accessMode: accessKm !== null && accessKm > ACCESS_WALK_LIMIT_KM ? 'rickshaw' : 'walk'
				}
			};
		});
		setArmed(null);
		setQuery('');
		setSearchResults([]);

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

	function handlePickResult(result) {
		if (!armed) {
			return;
		}

		resolveEndpoint(armed, { lat: result.lat, lng: result.lng }, t(result.nameBn, result.nameEn, lang));
	}

	function handleMapPick(point) {
		resolveEndpoint(armed, point, null);
	}

	function handleDrag(endpointId, event) {
		const { lat, lng } = event.target.getLatLng();
		resolveEndpoint(endpointId, { lat, lng }, null);
	}

	const selectedOption = routeOptions.find((option) => option.id === selectedOptionId);
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
				<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
					<h1 className="t-brand">{t('ফুরুৎ', 'FURUT', lang)}</h1>
					<button type="button" onClick={toggleLang} className="chip">
						{lang === 'bn' ? 'EN' : 'বাং'}
					</button>
				</div>
				<p className="t-label">{t('নং ০০৪৭', 'No. 0047', lang)}</p>

				<div className="rule-double" style={{ margin: '16px 0' }} />

				<div className="map-grid">
				<div className="map-grid-endpoints">
				{['A', 'B'].map((endpointId) => {
					const endpoint = endpoints[endpointId];
					const isArmed = armed === endpointId;

					return (
						<div key={endpointId}>
							<button
								type="button"
								onClick={() => {
									setArmed(isArmed ? null : endpointId);
									setQuery('');
								}}
								className="rule-hair"
								style={{
									display: 'flex',
									alignItems: 'center',
									gap: 12,
									width: '100%',
									background: 'transparent',
									border: 'none',
									padding: '10px 0',
									cursor: 'pointer',
									textAlign: 'left',
									color: 'var(--cream)'
								}}
							>
								<span
									style={{
										width: 10,
										height: 10,
										borderRadius: '50%',
										background: endpointId === 'A' ? 'var(--cream)' : 'var(--stamp)',
										flexShrink: 0
									}}
								/>
								<span>
									<div className="t-label">{t(endpointId === 'A' ? 'কোথা থেকে' : 'কোথায়', endpointId === 'A' ? 'From' : 'To', lang)}</div>
									<div className="t-place">
										{endpoint ? endpoint.label : t('বাছাই করুন', 'Tap to choose', lang)}
									</div>
									{endpoint && endpoint.accessMode === 'rickshaw' ? (
										<div className="t-label" style={{ color: 'var(--stamp)' }}>
											{t('৯০০ মিটারের বেশি — রিকশা', '>900m — rickshaw access', lang)}
										</div>
									) : null}
								</span>
							</button>

							{isArmed ? (
								<div style={{ padding: '4px 0 16px 22px' }}>
									<input
										type="text"
										value={query}
										onChange={(event) => setQuery(event.target.value)}
										placeholder={t('জায়গার নাম লিখুন', 'Type a place name', lang)}
										style={{
											width: '100%',
											background: 'var(--ground2)',
											border: '1px solid var(--line)',
											padding: '8px 10px',
											font: 'inherit',
											color: 'var(--cream)'
										}}
									/>
									<p className="t-label" style={{ marginTop: 6 }}>
										{t('অথবা ম্যাপে ট্যাপ করুন', 'or tap the map', lang)}
									</p>

									{searchLoading ? <p className="t-body">…</p> : null}

									{searchResults.map((result) => (
										<button
											key={result.id}
											type="button"
											onClick={() => handlePickResult(result)}
											className="rule-hair"
											style={{
												display: 'block',
												width: '100%',
												textAlign: 'left',
												background: 'transparent',
												border: 'none',
												padding: '8px 0',
												cursor: 'pointer',
												color: 'var(--cream)'
											}}
										>
											<span className="t-body">{t(result.nameBn, result.nameEn, lang)}</span>
										</button>
									))}
								</div>
							) : null}
						</div>
					);
				})}

				{stationsError ? <p className="t-body" style={{ color: 'var(--stamp)' }}>{stationsError}</p> : null}
				</div>

				<div className="map-grid-map">
				<div className="rule-solid" />
				<div className="map-frame">
					<MapContainer center={DHAKA_CENTER} zoom={12} scrollWheelZoom style={{ width: '100%', height: '100%' }}>
						<TileLayer attribution="Tiles &copy; Esri" url={ESRI_BASE_URL} />
						<TileLayer url={ESRI_REFERENCE_URL} />

						<MapClickHandler armed={armed} onPick={handleMapPick} />

						{stations.map((station) => (
							<CircleMarker
								key={station.id}
								center={[station.lat, station.lng]}
								radius={3.5}
								pathOptions={{ color: COLOUR.metro, weight: 1.5, fillColor: COLOUR.ground2, fillOpacity: 1 }}
							/>
						))}

						{selectedOption?.segments.map((segment, index) => (
							<Polyline
								key={`${segment.mode}-${index}`}
								positions={segment.pts}
								pathOptions={{ className: `mode-${segment.mode}` }}
							/>
						))}

						{endpoints.A ? (
							<Marker
								position={[endpoints.A.lat, endpoints.A.lng]}
								icon={PIN_ICON_A}
								draggable
								eventHandlers={{ dragend: (event) => handleDrag('A', event) }}
							/>
						) : null}
						{endpoints.B ? (
							<Marker
								position={[endpoints.B.lat, endpoints.B.lng]}
								icon={PIN_ICON_B}
								draggable
								eventHandlers={{ dragend: (event) => handleDrag('B', event) }}
							/>
						) : null}
					</MapContainer>
				</div>
				</div>

				<div className="map-grid-ticket">
				<div className="rule-solid" style={{ marginBottom: 20 }} />

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
						{t('এই দুই জায়গার মধ্যে কোনো রুট পাওয়া যায়নি', 'No route found between these two points', lang)}
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
