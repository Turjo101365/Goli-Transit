export const config = {
	weather: {
		DHAKA_LAT: 23.777,
		DHAKA_LNG: 90.400,
		POLL_INTERVAL_MINUTES: 15,
		CACHE_TTL_SECONDS: 15 * 60,
		// Standard hourly rain-intensity bands (light <2.5mm/hr, heavy >7.6mm/hr)
		// divided by 4 to match our 15-minute observation window.
		RAIN_MM_THRESHOLD: 0.2,
		HEAVY_RAIN_MM_THRESHOLD: 1.9,
		// Comfort bands for the "how hot does it feel" label — a UX
		// classification for a tropical city's range, not a sourced
		// meteorological standard (unlike the rain bands above).
		HEAT_BAND_MAX_C: {
			cold: 15,
			mild: 22,
			pleasant: 29,
			hot: 34
			// >= 34: very_hot
		}
	},
	journey: {
		SWITCH_SEARCH_RADIUS_KM: 1.5,
		MIN_SAVING_MINUTES: 12,
		ALERT_COOLDOWN_MINUTES: 10,
		WALKING_SPEED_KMH: 4.5,
		// Beyond this, a metro access leg is labelled rickshaw instead of walk.
		ACCESS_WALK_LIMIT_KM: 0.9,
		// Metro station search radius for a dynamic route's origin/destination —
		// beyond this the metro option is dropped rather than proposing an
		// unrealistic access leg.
		METRO_ACCESS_RADIUS_KM: 3,
		// p90/p50 ratio per mode, for routes computed on demand (dynamicRoute
		// .service.js). Placeholders inherited from the one corridor with real
		// measured numbers (Mirpur10->Motijheel, routeOptions.service.js),
		// pending real per-route historical variance from corridor_observations.
		P90_RATIO: {
			walk: 1.15,
			metro: 1.24,
			bus: 1.65,
			rickshaw: 1.3,
			bike: 1.7,
			cng: 1.5
		},
		// A mode at modeMatrix state 1 (degraded) moves at this fraction of its
		// baseline speed. Anchored to real data: BUET/World Bank studies cite
		// Dhaka peak-hour traffic at ~4.8-6.4 km/h; 15 (bus baseline) * 0.35 ≈ 5.3,
		// matching that range. Applied uniformly to other modes' degraded state
		// as a simplifying assumption pending real corridor_observations data.
		DEGRADED_SPEED_FACTOR: 0.35,
		// Baseline (clear-condition) speeds in km/h. Metro is real, derived from
		// the DMTCL schedule (21.3km / ~38min, seeded in migrations 002/003).
		// The rest are placeholders pending real corridor_observations data
		// (Step 2 polling) — not verified Dhaka-specific facts.
		MODE_SPEED_KMH: {
			walk: 4.5,
			metro: 33.6,
			bus: 15,
			rickshaw: 10,
			bike: 25,
			cng: 18
		},
		// Placeholder average wait times in minutes. No real headway/dispatch
		// data exists yet for any mode.
		MODE_WAIT_MINUTES: {
			walk: 0,
			metro: 6,
			bus: 8,
			rickshaw: 2,
			bike: 3,
			cng: 3
		},
		// Real, sourced government fare rates — used only for dynamically
		// computed routes (dynamicRoute.service.js). Rickshaw and bike (motorcycle
		// ride-share) have no official fixed rate — negotiated/platform-priced —
		// so those options report fare as null ("varies") rather than a guess.
		FARE: {
			// BRTA Dhaka city bus rate, effective 23 Apr 2026: Tk 2.53/km, Tk 10 minimum.
			// https://www.thedailystar.net/news/bangladesh/transport/news/brta-publishes-new-bus-fare-chart-4160666
			BUS_PER_KM_TAKA: 2.53,
			BUS_MIN_FARE_TAKA: 10,
			// Government-set CNG auto-rickshaw meter rate (in force since Nov 2015):
			// Tk 40 for the first 2km, then Tk 12/km.
			// https://www.tbsnews.net/bangladesh/cng-autorickshaw-drivers-block-dhaka-roads-again-demanding-withdrawal-brta-move-1069471
			CNG_BASE_TAKA: 40,
			CNG_BASE_KM: 2,
			CNG_PER_KM_TAKA: 12
		}
	}
};