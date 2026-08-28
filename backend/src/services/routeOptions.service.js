// Hardcoded Mirpur 10 -> Motijheel options. The real routing engine (graph +
// cost function) replaces this later; until then this is the frozen shape
// consumers build against. See docs/API.md.

// Real MRT-6 station coordinates and per-segment minutes/fares, Mirpur 10 -> Motijheel
// (10 real hops; source: DMTCL schedule + fare chart, seeded in migrations 002/003).
const METRO_STATION_PTS = [
	[23.8084, 90.3682], // Mirpur 10
	[23.7992, 90.3720], // Kazipara
	[23.7909, 90.3755], // Shewrapara
	[23.7777, 90.3802], // Agargaon
	[23.7664, 90.3763], // Bijoy Sarani
	[23.7602, 90.3865], // Farmgate
	[23.7513, 90.3927], // Karwan Bazar
	[23.7395, 90.3960], // Shahbagh
	[23.7319, 90.3965], // Dhaka University
	[23.7300, 90.4075], // Bangladesh Secretariat
	[23.7281, 90.4191] // Motijheel
];
const METRO_RIDE_MIN = 26;

function metroOption() {
	return {
		id: 'metro',
		p50: 33,
		p90: 41,
		fare: 80,
		segments: [
			{
				mode: 'walk',
				min: 5,
				fare: 0,
				label: { bn: 'বাসা থেকে স্টেশন', en: 'Home to station' },
				pts: [[23.8113, 90.3651], [23.8084, 90.3682]]
			},
			{
				mode: 'metro',
				min: METRO_RIDE_MIN,
				fare: 80,
				label: { bn: 'মেট্রোতে মতিঝিল', en: 'Metro to Motijheel' },
				pts: METRO_STATION_PTS
			},
			{
				mode: 'walk',
				min: 2,
				fare: 0,
				label: { bn: 'স্টেশন থেকে গন্তব্য', en: 'Station to destination' },
				pts: [[23.7281, 90.4191], [23.7270, 90.4175]]
			}
		]
	};
}

function rickshawMetroOption() {
	return {
		id: 'rickshaw_metro',
		p50: 35,
		p90: 44,
		fare: 170,
		segments: [
			{
				mode: 'rickshaw',
				min: 4,
				fare: 45,
				label: { bn: 'রিকশায় স্টেশন', en: 'Rickshaw to station' },
				pts: [[23.8113, 90.3651], [23.8084, 90.3682]]
			},
			{
				mode: 'metro',
				min: METRO_RIDE_MIN,
				fare: 80,
				label: { bn: 'মেট্রোতে মতিঝিল', en: 'Metro to Motijheel' },
				pts: METRO_STATION_PTS
			},
			{
				mode: 'rickshaw',
				min: 5,
				fare: 45,
				label: { bn: 'রিকশায় গন্তব্য', en: 'Rickshaw to destination' },
				pts: [[23.7281, 90.4191], [23.7265, 90.4160]]
			}
		]
	};
}

function bikeOption() {
	return {
		id: 'bike',
		p50: 46,
		p90: 78,
		fare: 285,
		segments: [
			{
				mode: 'bike',
				min: 46,
				fare: 285,
				label: { bn: 'বাইকে মতিঝিল', en: 'Bike to Motijheel' },
				pts: METRO_STATION_PTS
			}
		]
	};
}

function busOption() {
	return {
		id: 'bus',
		p50: 68,
		p90: 112,
		fare: 45,
		segments: [
			{
				mode: 'bus',
				min: 68,
				fare: 45,
				label: { bn: 'বাসে মতিঝিল', en: 'Bus to Motijheel' },
				pts: METRO_STATION_PTS
			}
		]
	};
}

export function getHardcodedRouteOptions() {
	return {
		options: [metroOption(), rickshawMetroOption(), bikeOption(), busOption()]
	};
}
