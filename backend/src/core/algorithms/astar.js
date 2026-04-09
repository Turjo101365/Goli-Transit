import { dijkstra } from './dijkstra.js';

export function astar(input) {
  // For starter scope, we keep heuristic at zero and reuse dijkstra semantics.
  return dijkstra(input);
}