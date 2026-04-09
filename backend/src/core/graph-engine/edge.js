export class Edge {
	constructor(from, to, mode, baseWeight) {
		this.from = from;
		this.to = to;
		this.mode = mode;
		this.baseWeight = baseWeight;
		this.currentWeight = baseWeight;
		this.allowedVehicles = new Set();
	}

	isAccessibleByVehicle(vehicleType) {
		return this.allowedVehicles.size === 0 || this.allowedVehicles.has(vehicleType);
	}
}