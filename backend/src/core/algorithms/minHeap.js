// Generic binary min-heap, ordered by a caller-supplied comparator.
// Shared by dijkstra.js (compares .distance) and astar.js (compares .f) —
// same heap logic, different priority key.
export class MinHeap {
	constructor(compare) {
		this.items = [];
		this.compare = compare;
	}

	isEmpty() {
		return this.items.length === 0;
	}

	push(item) {
		this.items.push(item);
		this.bubbleUp(this.items.length - 1);
	}

	pop() {
		if (this.items.length === 0) {
			return null;
		}

		const min = this.items[0];
		const last = this.items.pop();

		if (this.items.length > 0) {
			this.items[0] = last;
			this.bubbleDown(0);
		}

		return min;
	}

	bubbleUp(index) {
		while (index > 0) {
			const parentIndex = Math.floor((index - 1) / 2);
			if (this.compare(this.items[index], this.items[parentIndex]) >= 0) {
				break;
			}

			[this.items[index], this.items[parentIndex]] = [this.items[parentIndex], this.items[index]];
			index = parentIndex;
		}
	}

	bubbleDown(index) {
		const lastIndex = this.items.length - 1;

		while (true) {
			const leftIndex = index * 2 + 1;
			const rightIndex = leftIndex + 1;
			let smallest = index;

			if (leftIndex <= lastIndex && this.compare(this.items[leftIndex], this.items[smallest]) < 0) {
				smallest = leftIndex;
			}

			if (rightIndex <= lastIndex && this.compare(this.items[rightIndex], this.items[smallest]) < 0) {
				smallest = rightIndex;
			}

			if (smallest === index) {
				break;
			}

			[this.items[index], this.items[smallest]] = [this.items[smallest], this.items[index]];
			index = smallest;
		}
	}
}
