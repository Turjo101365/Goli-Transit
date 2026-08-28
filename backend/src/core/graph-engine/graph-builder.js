import { Graph } from './graph.js';

let graphInstance;

// Used only when the database has no graph data yet (fresh dev bootstrap
// before migrations run, or migrations tables missing) — see graph.loader.js
// and cache/graph.cache.js. This used to seed an invented Dhaka bus/bike/walk
// network (fictional nodes like PALLABI/GULSHAN/MIRPUR with hand-picked edge
// weights) as a "starter" graph. CLAUDE.md is explicit that real Dhaka
// facts — bus routes included — must never be invented, so that seed data
// is gone: an empty graph is the honest fallback. Every route/journey
// service already treats "no path found" as a real, valid outcome, so
// features degrade cleanly (empty results) instead of silently answering
// with fabricated bus geography. Real bus route/stop data (GTFS-style, or
// a manually compiled BRTA/DTCA route list) is still needed before this
// graph can carry real bus routing.
export function graphBuilder() {
	if (!graphInstance) {
		graphInstance = new Graph();
	}

	return graphInstance;
}
