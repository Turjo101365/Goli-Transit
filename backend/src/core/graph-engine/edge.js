export class Edge {
	constructor(from, to, mode, baseWeight) {
		this.from = from;
		this.to = to;
		this.mode = mode;
		this.baseWeight = baseWeight;
		this.currentWeight = baseWeight;
		this.fareTaka = 0;
		this.allowedVehicles = new Set();
	}

	isAccessibleByVehicle(vehicleType) {
		const aliases = {
			pedestrian: ['pedestrian'],
			bicycle: ['bicycle'],
			rickshaw: ['bicycle'],
			'three-wheeler': ['bicycle'],
			bus: ['bus'],
			metro: ['metro'],
			motorized: ['bus', 'metro'],
			car: ['car']
		};

		if (!vehicleType) {
			return this.allowedVehicles.size === 0 || [...this.allowedVehicles].some((allowedVehicle) => allowedVehicle !== 'car');
		}

		const candidates = aliases[vehicleType] || [vehicleType];

		return candidates.some((candidate) => this.allowedVehicles.has(candidate));
	}
}