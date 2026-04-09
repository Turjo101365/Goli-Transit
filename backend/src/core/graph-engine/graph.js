import { Node } from './node.js';
import { Edge } from './edge.js';
import { weightManager } from './weight-manager.js';

export class Graph {
	constructor() {
		this.nodes = new Map();
		this.adjacency = new Map();
	}

	addNode(id, metadata = {}) {
		if (!this.nodes.has(id)) {
			this.nodes.set(id, new Node(id, metadata));
			this.adjacency.set(id, []);
		}

		return this.nodes.get(id);
	}

	addEdge(from, to, mode, baseWeight) {
		this.addNode(from);
		this.addNode(to);
		const edge = new Edge(from, to, mode, baseWeight);
		this.adjacency.get(from).push(edge);
		return edge;
	}

	getEdge(from, to, mode) {
		return this.getNeighbors(from).find((edge) => edge.to === to && edge.mode === mode) || null;
	}

	hasNode(id) {
		return this.nodes.has(id);
	}

	getNeighbors(nodeId) {
		return this.adjacency.get(nodeId) || [];
	}

	getAllEdges() {
		return [...this.adjacency.values()].flat();
	}

	applyDynamicWeights(weightConfig = {}) {
		for (const edge of this.getAllEdges()) {
			weightManager({ edge, ...weightConfig });
		}
	}

	snapshot() {
		return {
			nodeCount: this.nodes.size,
			edgeCount: this.getAllEdges().length,
			nodes: [...this.nodes.keys()],
			edges: this.getAllEdges().map((edge) => ({
				from: edge.from,
				to: edge.to,
				mode: edge.mode,
				baseWeight: edge.baseWeight,
				currentWeight: edge.currentWeight,
				allowedVehicles: [...edge.allowedVehicles]
			}))
		};
	}
}