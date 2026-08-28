# POST /route

**The response shape below is stable** — it does not change without an explicit decision to break it, though the request shape changed 2026-08-29 (coordinates, not place names — see "Current implementation").

Auth: `Authorization: Bearer <jwt>` required (see `POST /auth/login`).

## Request

```json
{
  "originLat": 23.8084,
  "originLng": 90.3682,
  "destinationLat": 23.7281,
  "destinationLng": 90.4191
}
```

Validated by `src/validations/route.validation.js`.

## Response

Returned directly — **no `{ ok, data, requestId }` envelope** (unlike every other endpoint in this API).

```json
{
  "options": [
    {
      "id": "metro",
      "p50": 33,
      "p90": 41,
      "fare": 80,
      "segments": [
        {
          "mode": "walk",
          "min": 5,
          "fare": 0,
          "label": { "bn": "বাসা থেকে স্টেশন", "en": "Home to station" },
          "pts": [[23.8113, 90.3651], [23.8084, 90.3682]]
        }
      ]
    }
  ]
}
```

### Field reference

| Field | Type | Notes |
|---|---|---|
| `options[].id` | string | Option identifier, e.g. `"metro"`, `"rickshaw_metro"`, `"bike"`, `"bus"`. Not itself a `mode`. |
| `options[].p50` | integer | Typical total minutes for this option. Never a single "ETA" — always paired with `p90`. |
| `options[].p90` | integer | 90th-percentile (bad-day) total minutes. This, not `p50`, is what departure-time advice is chosen against. |
| `options[].fare` | integer taka or `null` | Total fare. `null` means no official fixed rate exists for this option (rickshaw, bike) — the fare genuinely varies, not a missing value. |
| `options[].segments` | array | At least one segment, in travel order. |
| `segments[].mode` | enum | One of `walk`, `metro`, `bus`, `rickshaw`, `bike`, `cng`. |
| `segments[].min` | integer | Minutes for this segment. `sum(segments[].min) === option.p50`. |
| `segments[].fare` | integer taka or `null` | Fare for this segment (`0` for walk/free metro-access-on-foot legs; `null` for rickshaw/bike). |
| `segments[].label` | object | `{ bn, en }` — every user-facing string is bilingual, per `CLAUDE.md`. |
| `segments[].pts` | array of `[lat, lng]` | At least 2 points, in travel order — real road-snapped geometry for road modes (see below), not a straight line. |

All money is integer taka, all time is integer minutes — no floats, per `CLAUDE.md`. `options` may be an empty array if nothing resolves for the given pair (e.g. OSRM unreachable and no metro station nearby) — not an error.

## Current implementation

Computed per request (`src/services/dynamicRoute.service.js`), not a fixed dataset:

- **Metro option**: nearest real MRT-6 station to each point (within 3km, `METRO_ACCESS_RADIUS_KM`), a real Dijkstra path and cumulative fare between them (`src/core/algorithms/metroPath.js`, shared with `journey.service.js`), plus a real walk/rickshaw access leg on each end. Depends on the real station graph being loaded (MySQL up, migrations `002`–`004` applied) — silently omitted from `options` otherwise, not faked from the fallback placeholder graph.
- **Direct options** (`bus`, `cng`, `rickshaw`, `bike`, plus `walk` under 3km): real road-snapped distance and geometry from OSRM's public demo server (`src/services/osrm.client.js`, driving/foot/bike profiles — no key required). Travel time is that real distance divided by our own per-mode speed constant (`config.journey.MODE_SPEED_KMH`), not OSRM's driving-speed duration, which reflects free-flow car speed rather than Dhaka's actual pace for that mode.
- **Fares**: `bus` and `cng` use real, sourced BRTA/government rates (`config.journey.FARE`, effective 2026 — see comments for sources). `rickshaw` and `bike` (motorcycle ride-share) have no official fixed rate, so `fare` is `null`.
- **p90 spread**: `config.journey.P90_RATIO` per mode — placeholders inherited from the one corridor with real measured variance (Mirpur 10 → Motijheel), pending real per-route historical data from `corridor_observations` (still empty).

Validated server-side against `src/validations/route-response.validation.js` before every response, as a safety net against contract drift.
