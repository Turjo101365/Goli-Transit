const switchPenalty = {
  walk: { walk: 0, bike: 2, bus: 3, metro: 4 },
  bike: { walk: 2, bike: 0, bus: 3, metro: 4 },
  bus: { walk: 3, bike: 3, bus: 0, metro: 2 },
  metro: { walk: 4, bike: 4, bus: 2, metro: 0 },
  null: { walk: 0, bike: 0, bus: 0, metro: 0 }
};

export function modeSwitchCost(previousMode, nextMode) {
  const prev = previousMode || 'null';
  return switchPenalty[prev]?.[nextMode] ?? 0;
}