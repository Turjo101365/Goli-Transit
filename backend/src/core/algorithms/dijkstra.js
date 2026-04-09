class MinHeap {
  constructor() {
    this.items = [];
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
      if (this.items[index].distance >= this.items[parentIndex].distance) {
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

      if (leftIndex <= lastIndex && this.items[leftIndex].distance < this.items[smallest].distance) {
        smallest = leftIndex;
      }

      if (rightIndex <= lastIndex && this.items[rightIndex].distance < this.items[smallest].distance) {
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

export function dijkstra({ start, isGoal, neighbors, keyOf, timeoutMs = 2500 }) {
  const startedAt = Date.now();
  const distances = new Map();
  const parents = new Map();
  const queue = new MinHeap();

  distances.set(keyOf(start), 0);
  queue.push({ state: start, distance: 0 });

  while (!queue.isEmpty()) {
    if (Date.now() - startedAt > timeoutMs) {
      return { distances, parents, goalState: null, timedOut: true };
    }

    const current = queue.pop();
    const currentKey = keyOf(current.state);

    if (current.distance > (distances.get(currentKey) ?? Infinity)) {
      continue;
    }

    if (isGoal(current.state)) {
      return { distances, parents, goalState: current.state, timedOut: false };
    }

    for (const option of neighbors(current.state)) {
      const nextDistance = current.distance + option.cost;
      const nextKey = keyOf(option.state);

      if (nextDistance < (distances.get(nextKey) ?? Infinity)) {
        distances.set(nextKey, nextDistance);
        parents.set(nextKey, {
          previousKey: currentKey,
          via: option.via,
          state: option.state
        });
        queue.push({ state: option.state, distance: nextDistance });
      }
    }
  }

  return { distances, parents, goalState: null, timedOut: false };
}