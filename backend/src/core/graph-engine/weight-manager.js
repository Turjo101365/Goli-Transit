export function weightManager({ edge, multiplier = 1, congestion = 0, anomaly = 0 }) {
  const congestionFactor = 1 + Math.max(0, congestion);
  const anomalyFactor = 1 + Math.max(0, anomaly);
  const totalMultiplier = multiplier * congestionFactor * anomalyFactor;
  edge.currentWeight = Number((edge.baseWeight * totalMultiplier).toFixed(2));
  return edge.currentWeight;
}