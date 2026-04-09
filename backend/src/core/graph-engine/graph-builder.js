import { Graph } from './graph.js';

let graphInstance;

function seedGraph(graph) {
  const ab = graph.addEdge('A', 'B', 'walk', 6);
  ab.allowedVehicles.add('pedestrian');
  ab.allowedVehicles.add('bicycle');

  const bc = graph.addEdge('B', 'C', 'bus', 4);
  bc.allowedVehicles.add('bus');
  bc.allowedVehicles.add('car');

  const ad = graph.addEdge('A', 'D', 'bike', 7);
  ad.allowedVehicles.add('bicycle');
  ad.allowedVehicles.add('pedestrian');

  const dc = graph.addEdge('D', 'C', 'metro', 3);
  dc.allowedVehicles.add('metro');
  dc.allowedVehicles.add('car');
  dc.allowedVehicles.add('pedestrian');

  const bd = graph.addEdge('B', 'D', 'walk', 2);
  bd.allowedVehicles.add('pedestrian');
}

export function graphBuilder() {
  if (!graphInstance) {
    graphInstance = new Graph();
    seedGraph(graphInstance);
  }

  return graphInstance;
}