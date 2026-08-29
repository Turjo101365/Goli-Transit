# EZZ GO — project context

Departure-time and mid-journey advisor for Dhaka commuters.
Full background: docs/PROPOSAL.md — read it before any structural work.

## What this is NOT
- Not a shortest-path router. Shortest path is the wrong objective here.
- Not an ETA app. Every time estimate is a PAIR: p50 and p90.

## Non-negotiable decisions
- Departure time is chosen against p90, never p50.
- Anomaly = deviation from this corridor's own baseline for this weekday
  and this 15-minute bucket. Never compared against free-flow speed.
- No machine learning anywhere yet. No labels exist and there is not
  enough data. CUSUM and hand-written rules only.
- The app reports what it OBSERVED, never what it inferred.
  "You moved 200m in 6 minutes" — allowed.
  "There is an accident ahead" — not allowed.
- Alert thresholds are conservative: minimum 12-minute saving, 10-minute
  cooldown between alerts. Wrongly pulling a user off a bus is much worse
  than missing an alert.

## Stack
Node + Express, MySQL, Redis with graceful fallback to in-memory cache,
Zod validation, Winston logging. React + Vite + Leaflet frontend.

## Conventions
- Layered: routes -> controllers -> services -> core. Never bypass a layer.
- Every new endpoint gets a Zod schema in src/validations/.
- Money in integer taka. Time in integer minutes. No floats.
- Bilingual: every user-facing string has bn and en keys. Bangla uses
  Bangla numerals and Bangla time convention (সকাল ৮:০৫), never a
  translated "8:05 AM".
- Never invent Dhaka facts — fares, bus routes, station names. If a real
  value is missing, stop and ask me for it.

## Current state
The invented placeholder graph (fictional bus/bike/walk nodes with
hand-picked edge weights) has been removed — `graphBuilder()` now returns
an empty graph, used only as an honest fallback when the database has no
graph data yet. Real data that exists and is wired in: the 16 real MRT-6
metro stations and real per-station fares/schedule (migrations 003/004),
real BRTA bus fare and CNG fare formulas, real OSRM road-snapped distance
per mode. Still missing, not invented: real Dhaka bus route/stop data
(GTFS-style if it exists, otherwise a manually compiled BRTA/DTCA route
list) — bus legs today use real road distance (OSRM) and a real fare
formula, but not a real bus route/stop graph, since none exists yet. Do
not invent one — ask for the real data or leave the gap as is.

## Design law — do not redesign

Superseded 2026-08-28. The original pale ticket-stub / two-ink law
below is kept for git history only — do not follow it. The current law
is a dark, colour-coded ticket stub: same structural devices (perforated
tear edges, rubber stamp, printed serial, conductor's punch), but a
dark ground and full colour instead of pale card stock and two inks.

Tokens live in src/styles/tokens.css. Never redefine them in a component.

Ground and ink:
- `--ground` (#151E26) is the page background. Never a pale/light page
  background again.
- `--cream` (#F4EFE3) is body text and structural lines on that ground.

Colour is now used freely, on two independent axes:
- **Area colour** — each named corridor/neighbourhood the user is
  routed through carries its own accent pair (`--a`/`--b`), set once
  per screen or per section, not per component. Used for hero panels,
  motifs, stripe decoration.
- **Mode colour** — each transport mode (walk/metro/bus/rickshaw/bike/
  CNG) has a fixed hex across the whole app (see MODES in the shared
  mode-colour module). Metro stays #006747; the others are no longer
  restricted.
- **Jam-severity ramp** — a fixed 6-step green→red ramp
  (`#2E7D4F #77A32C #E0B028 #E2712B #C7362B #8E2130`) for departure
  slots / reliability. This ramp is never themed by area colour and
  never collapsed back to a two-state ink/red split.

Still true, unchanged from before:
- Transport mode is carried by LINE STYLE first, colour second (solid
  metro, dashed rickshaw, dotted walk, etc.), so it survives print and
  colour blindness.
- No letter-spacing on Bangla text — it breaks conjuncts and renders
  "বেরোন" as "বে রো ন". Letter-spacing is for Latin labels only, gated
  on `lang="en"`.
- No Tailwind, styled-components, or any UI library.
- Fonts are self-hosted (`src/styles/tokens.css` `@font-face`, files in
  `public/fonts/`) — never a Google Fonts (or other) CDN `@import`. The
  demo venue network may block external font requests.
- Rounded corners stay reserved for circles (punch, badge, station
  dots) — rectangular panels stay square-cornered even in the new
  palette.

New screens copy the existing structure. If a new pattern seems needed,
stop and ask before inventing one.

<details>
<summary>Superseded — original pale/two-ink law (2026-08 through 2026-08-28)</summary>

The visual language is a Bangladesh Railway ticket stub: pale green
card stock, perforated tear edges, a faded rubber stamp, a printed
serial, and a conductor's punch marking the chosen option.

Colour: only two inks — ink (#22261B) and stamp red (#A8382A).
MRT-6 green (#006747) is the single licensed exception, used only for
metro. No other colour may be introduced for any reason.

Never:
- rounded corners, except circles (punch, badge)
- box shadows, except the punch's inset
- gradients, except the perforation pattern
- a dark background
- Tailwind, styled-components, or any UI library
- letter-spacing on Bangla text — it breaks conjuncts and renders
  "বেরোন" as "বে রো ন". Letter-spacing is for Latin labels only.

Transport mode is carried by LINE STYLE first, colour second, so it
survives print and colour blindness.

Jam severity and reliability colours are never themed. Ink means fine,
stamp red means bad. Two states, nothing between.

</details>
