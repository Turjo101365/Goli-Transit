# GoliTransit Project Brain

> Living project memory and handoff document. Keep this file factual, update it after meaningful changes, and never place secrets or real credentials here.

**Last audited:** 2026-08-27  
**Audited branch:** `Dynamic` at `6a49086` (`setting up real database`)  
**Project stage:** Functional hackathon prototype; not production-ready  
**Primary goal:** Hyper-local, multi-modal route planning for Dhaka with dynamic place creation, congestion simulation, and rerouting

## 1. Executive summary

GoliTransit is a React and Express application for planning routes across a small Dhaka transit graph. A user can enter a known area, coordinates, or an arbitrary Dhaka place name; the backend resolves it to a graph node, calculates a multi-modal route, renders the path on a Leaflet map, and can increase an edge's weight to demonstrate rerouting after congestion.

The repository already contains substantial working code:

- a polished React landing experience with decorative Three.js scenes;
- registration, login, JWT sessions, password-reset screens, and profile screens;
- a Leaflet route planner with map picking and before/after anomaly comparison;
- a graph engine with 22 seeded Dhaka hubs and 70 directed edges;
- Dijkstra routing with transport-mode switching costs;
- dynamic place geocoding through OpenStreetMap Nominatim;
- MySQL repositories and numbered migrations;
- Redis-backed graph/route caches with in-memory fallback;
- saved routes, favorite stops, trip/stat data structures, logging, validation, and Docker/deployment scaffolding.

The product is best described as a **working prototype with incomplete production hardening**. Several marketing claims are ahead of the implementation, a critical public endpoint exposes password hashes, fresh MySQL migrations have a likely signedness failure, the advertised guest planner is blocked by backend authentication, and much of the test/deployment/documentation scaffolding is unfinished.

## 2. Current source-control state

- Checked-out branch: `Dynamic`.
- `HEAD`: `6a49086`, matching `origin/Dynamic` at audit time.
- Local `main`: `77c9c43`, substantially stale.
- `origin/main` and `Dynamic` have diverged:
  - four commits exist only on `origin/main` (mostly merge/planning history plus a RoutePlanner state fix);
  - eleven commits exist only on `Dynamic` (database, fallback, timeout, host-binding, and deployment work).
- Reconcile the branches deliberately; do not reset one branch onto the other without reviewing the unique commits.
- A pre-existing user change in `docker-compose.yml` changes MySQL host port `3307 -> 3308` and phpMyAdmin `8080 -> 8081`. This audit preserved it.
- `backend/.env` is ignored and must remain secret. It is local configuration, not project truth.
- `frontend/dist/` was generated during verification and is ignored.

## 3. Product surfaces

### Implemented user journeys

1. **Landing and navigation**
   - Home, challenge, feature, stat, about, contact, and CTA sections.
   - Two decorative Three.js/WebGL traffic scenes.
   - Desktop and mobile navigation.
   - Hand-built browser routing using paths, query parameters, hashes, and `history.pushState`.

2. **Authentication**
   - Registration and login.
   - JWT bearer sessions stored in browser `localStorage`.
   - Session restoration through `GET /auth/me`.
   - Logout and global handling of HTTP 401 responses.
   - In-memory registration/login fallback when MySQL is unavailable.

3. **Password reset**
   - Email entry, six-digit verification code, resend cooldown, token verification, and password replacement UI.
   - SMTP mail delivery through Nodemailer when configured.
   - Requires a live database even though normal registration/login can fall back to memory.

4. **Route planning**
   - Source and destination by known hub, arbitrary Dhaka place, or `latitude,longitude`.
   - Source/destination selection by clicking the map.
   - Walk, bike, bus, and metro mode selection.
   - Route legs, total cost, distance, switch penalty, compute time, and path rendering.
   - Recent dynamic-place suggestions.

5. **Congestion demo**
   - Applies a multiplier to the last edge of the current route.
   - Invalidates route cache and computes a new route.
   - Displays the initial and rerouted results side by side.

6. **Profile**
   - Profile display/editing.
   - Saved-route and favorite-stop creation/deletion.
   - Recent-trip and statistics presentation.
   - Useful loading, error, and empty states.

### Promises that are not yet product features

| Claim or surface | Actual state |
| --- | --- |
| AI route advisor / learned commuting behavior | Marketing copy only; there is no AI or learning pipeline. |
| Emergency-priority routing | Marketing copy only; no priority model or API exists. |
| Real-time traffic | An authenticated user manually simulates one anomaly; there is no live traffic feed. |
| 3D routes | Three.js is decorative on Home; the working planner is a 2D Leaflet map. |
| A* optimization | `astar.js` calls Dijkstra with a zero heuristic. Production routing directly uses Dijkstra. |
| Persistent trip history | Tables/UI/repository method exist, but route calculations never call `createTrip()`. |
| Contact form | Prevents browser submission but sends no message. |
| Full offline resilience | Routing and basic memory auth degrade gracefully; password reset and profile writes do not. |

## 4. Runtime architecture

```text
React/Vite UI
  -> frontend service modules
  -> fetch + optional JWT bearer token
  -> Express middleware
       CORS -> JSON -> request ID -> logging -> routes -> error handler
  -> active routes/controllers/services
  -> graph engine + Dijkstra
  -> repositories (MySQL) and caches (Redis/process memory)
  -> JSON response
  -> Leaflet route visualization
```

### Frontend

- Entry: `frontend/src/main.jsx`
- Application shell and navigation: `frontend/src/App.jsx`
- Pages: `frontend/src/pages/`
- Planner map/components: `frontend/src/components/Map/` and `frontend/src/components/Routing/`
- API/auth/profile clients: `frontend/src/services/`
- Styling: one large global file, `frontend/src/assets/styles/app.css`
- Libraries: React 18, Vite 5, Leaflet, React-Leaflet, Three.js.

The frontend does not use React Router or a real global state library. `App.jsx` owns navigation/session state, pages own feature state, and `store.js`/`routeStore.js` remain placeholders. Unknown URLs fall back to Home; `NotFound.jsx` is unused.

### Backend

- Entry/bootstrap: `backend/src/server.js`
- Express composition: `backend/src/app.js`
- Active flow: `routes -> controllers -> services -> repositories/core/cache`
- Request validation: Zod schemas in `backend/src/validations/`
- Authentication: JWT middleware and `auth.service.js`
- Persistence: raw named-placeholder SQL via `mysql2`; there is no ORM.
- Observability: Winston logs, request IDs, request completion timing, structured error responses.

Most files under `backend/src/modules/` are unused starter stubs. The important exception is `backend/src/modules/graph/graph.loader.js`, which is imported by the active graph cache. New work should follow the active top-level `routes/controllers/services/repositories` path unless the team explicitly decides to complete a module migration.

### Graph and routing behavior

- The fallback graph contains 22 named Dhaka hubs and 35 bidirectional links (70 directed edges).
- Stored edge modes are `walk`, `bike`, `bus`, and `metro`.
- API aliases expand `rickshaw`/`three-wheeler` to `bike` and `motorized` to bus/metro.
- The algorithm searches `(node, current mode)` states with Dijkstra and applies a cost when the transport mode changes.
- Returned display modes rename `bike` to `rickshaw` and both `bus` and `metro` to `motorized`.
- Route computation has a 2.5-second timeout.
- When both endpoints are dynamic, the path must include at least one stable hub.
- Unknown names are geocoded through Nominatim and stored as deterministic `dyn_*` nodes.
- A dynamic node is linked bidirectionally by walking edges to as many as five nearest stable hubs.
- Geocoding and stable-graph coverage are runtime dependencies for arbitrary places.

### Cache and resilience behavior

- Graph snapshot key: Redis `graph-cache:v2:snapshot`.
- Route keys: Redis `route-cache:v1:*`, hashed from endpoints, preferred/avoided modes, and vehicle type.
- Redis graph and route TTLs are configurable.
- Route results are also held in a process `Map`, but those memory entries have no TTL.
- Redis failures degrade to memory and MySQL failures degrade to the seeded graph.
- Registration/login can use process-memory users if MySQL is down.
- Failed database/Redis initialization is not retried later in the same process.
- Redis is initialized eagerly and is not closed by tests or shutdown code.
- Health currently reports the fallback graph as `database` because any graph returned by the loader gets that label.

## 5. Data model

The active numbered migrations create:

- `migrations` — migration ledger created by the runner;
- `users` — identity and password hash;
- `password_reset_tokens` — defined but not used by the current OTP flow;
- `nodes`, `edges` — graph persistence;
- `trips` — journey history, currently never populated by routing;
- `saved_routes`, `favorite_stops` — profile data;
- `anomalies`, `anomaly_edges` — anomaly metadata and affected edges.

Canonical migration path at runtime: `backend/migrations/runMigrations.js` and `backend/migrations/*.sql`.

Two older schema paths still exist:

- `backend/scripts/migrate.js` + `backend/mysql-schema.sql`;
- `backend/schema.sql`.

The older SQL files contain destructive `DROP TABLE` statements and drift from the numbered migrations. Treat them as legacy until they are removed or clearly archived.

## 6. HTTP API inventory

All protected routes expect `Authorization: Bearer <jwt>`.

| Method | Path | Auth | Purpose |
| --- | --- | --- | --- |
| GET | `/health` | No | Service, graph, DB, and Redis snapshot. |
| POST | `/auth/register` | No | Create account and return session. |
| POST | `/auth/login` | No | Authenticate and return session. |
| POST | `/auth/forgot-password` | No | Generate/send reset code. |
| POST | `/auth/send-reset-code` | No | Duplicate reset-code entry point. |
| POST | `/auth/verify-code` | No | Verify OTP and issue reset token. |
| POST | `/auth/reset-password` | No | Replace password after verification. |
| GET | `/auth/me` | Yes | Restore current user. |
| GET | `/profile` | Yes | Profile, trips, routes, stops, and stats. |
| PUT | `/profile` | Yes | Update name/email. |
| POST | `/profile/routes` | Yes | Create saved route. |
| DELETE | `/profile/routes/:routeId` | Yes | Delete owned saved route. |
| POST | `/profile/stops` | Yes | Create favorite stop. |
| DELETE | `/profile/stops/:stopId` | Yes | Delete owned favorite stop. |
| POST | `/route` | Yes | Resolve places and calculate route. |
| POST | `/anomaly` | Yes | Mutate matching edge weight. |
| GET | `/graph/snapshot` | Yes | Return graph snapshot. |
| GET | `/graph/dynamic-nodes` | Yes | Return recently used dynamic nodes. |
| POST | `/api/register` | No | Duplicate registration endpoint added with DB work. |
| GET | `/api/users` | **No** | Lists users and currently exposes password hashes; remove/protect immediately. |

Most responses use `{ ok, data, requestId }`. `/health` returns its health fields directly plus `requestId`.

## 7. Configuration and local operation

### Intended application ports

- Backend code default: `8080`.
- Vite development proxy target: `http://127.0.0.1:8080`.
- Frontend dev server: `5173`.
- Redis Compose host port: `6379`.
- Current local Compose MySQL host port: `3308` (uncommitted user change).
- Current local Compose phpMyAdmin host port: `8081` (uncommitted user change).

The root README still mentions backend `3001` and old Compose ports. The ignored local backend `.env` also currently overrides the backend to `3001`, so it does not match the Vite proxy. Align these before relying on the default local flow.

### Important backend environment variables

- Runtime: `NODE_ENV`, `HOST`, `PORT`, `APP_NAME`, `APP_URL`, `FRONTEND_URL`
- Database: `DATABASE_URL`, `DB_ENABLED`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_POOL_SIZE`
- Redis: `REDIS_ENABLED`, `REDIS_URL`, `REDIS_GRAPH_TTL_SECONDS`, `REDIS_ROUTE_TTL_SECONDS`
- Auth/reset: `JWT_SECRET`, `AUTH_TOKEN_TTL_HOURS`, `AUTH_JWT_ISSUER`, `RESET_CODE_TTL_MINUTES`, `RESET_CODE_RESEND_COOLDOWN_SECONDS`
- Mail: `MAIL_ENABLED`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_ENCRYPTION`, `MAIL_FROM_ADDRESS`, `MAIL_FROM_NAME`
- Undocumented tuning: `GEOCODE_TIMEOUT_MS`, `DYNAMIC_LINK_NEIGHBOR_LIMIT`, `MIN_STABLE_HUBS`, `LOG_LEVEL`

### Frontend environment variables

- `VITE_BACKEND_ENDPOINT` — required for a deployed frontend; must be a public backend URL, not localhost.
- `VITE_API_TIMEOUT_MS` — optional; defaults to 20 seconds.

There is no frontend `.env.example` yet.

### Reliable direct commands

```text
backend:  npm install -> npm run migrate (when DB is enabled) -> npm run dev
frontend: npm install -> npm run dev
tests:    backend/npm test
build:    frontend/npm run build
infra:    docker compose up -d
```

On Windows with restricted PowerShell script execution, invoke npm through `cmd /c npm ...`.

The root orchestration is not reliable yet: root scripts use Yarn although npm lockfiles are committed, root postinstall installs only the backend, and the shell build/start/seed helpers are placeholders.

## 8. Progress history reconstructed from Git

All committed product work was concentrated on 2026-04-10 and 2026-04-11.

| Date / commits | Progress |
| --- | --- |
| 2026-04-10 — `bc7eedc`, `ef0b8f9`, `c9fb352` | Repository and full-stack scaffold: Express layers, graph engine, MySQL/Redis adapters, route/anomaly APIs, React/Leaflet shell, tests, and placeholder docs/Docker files. |
| 2026-04-10 — `043025c`, merged through `dc99776` | JWT authentication, registration/login, password reset, SMTP service, auth UI, CORS, and initial auth tests. |
| 2026-04-10 — `1527813`, `311a5a1`, `77c9c43` | Major landing-page/UI redesign, navigation/footer work, and register-page polish. |
| 2026-04-11 — `61a3264`, `7525f6e`, `4314acc` | Profile dashboard/API, saved routes/stops, verification-code/reset fixes, and further planner/frontend work. |
| 2026-04-11 — `efabd18`, `446e79b`, `fd4cef6` | Dhaka stable graph, arbitrary-place geocoding, dynamic nodes/connectors, realistic routing metadata, persistence, and FK-order fixes. |
| 2026-04-11 — merge/fix sequence through `f3f882d` | Merged frontend/auth/profile/dynamic-node branches and resolved conflicts. |
| 2026-04-11 — `a37c0d5` through `4125964` | Render/Vercel-oriented fixes: root start script, public backend URL checks, API timeout, production host binding, migration import fix, and SPA rewrite. |
| 2026-04-11 — `f2405cf`, `a44ac53` | In-memory auth and profile-read fallback when MySQL is unavailable. |
| 2026-04-11 — `6a49086` | Numbered migrations, automatic startup migration, `DATABASE_URL`, `/api` endpoints, and empty-database demo-user seeding. |
| 2026-08-27 — local workspace | Local Compose ports adjusted to MySQL `3308` and phpMyAdmin `8081`; repository audit and this project-brain document added. No product code was changed by the audit. |

The deleted historical `TODO.md` tracked only a completed register-page restyle. It was not a project roadmap.

## 9. Feature status ledger

Legend: **Done** = working happy path; **Partial** = meaningful code exists but important gaps remain; **Stub** = scaffold only.

| Area | Status | Current reality |
| --- | --- | --- |
| Landing page and responsive shell | Done | Rich UI and two Three.js scenes; accessibility/performance polish remains. |
| Manual SPA navigation | Partial | Known pages work; redundant path/query state and no real 404. |
| Registration/login/JWT | Partial | DB and memory happy paths work; production-secret/rate-limit/session-hardening gaps remain. |
| Password reset | Partial | UI/SMTP/OTP happy path exists; state is process-local and DB-only. |
| Profile read/edit | Partial | DB path works; memory fallback supports read only and header/session state can become stale after edit. |
| Saved routes/favorite stops | Partial | CRUD exists; memory mode is not persistent and planner cannot save a computed route directly. |
| Trip history/statistics | Stub/partial | Schema, reads, and UI exist; route planning never records trips. |
| Dhaka graph | Done for demo scale | 22 stable hubs/70 directed edges; not city-scale street/transit data. |
| Multi-modal routing | Done for prototype | Dijkstra, mode constraints, switch penalty, timeout, metadata. Alias exclusion bug remains. |
| Arbitrary place routing | Partial | Nominatim + dynamic connectors work; availability, rate limiting, and coverage are external constraints. |
| Route caching | Partial | Redis and memory paths work; memory TTL, safe key scanning, lifecycle, and retry work remain. |
| Anomaly/rerouting | Partial | Manual multiplier and reroute work; no roles, expiry, reversal, live feed, or mode disambiguation. |
| Leaflet map | Done for prototype | Picking and path display work; no route-bound fitting or robust tile/error UX. |
| 3D route visualization | Stub/claim | Home decoration only; planner is 2D. |
| AI/emergency routing | Stub/claim | Marketing content only. |
| Automated tests | Partial | A few useful backend unit tests, four placeholders, one stale failure; no frontend tests. |
| API documentation | Stub | OpenAPI contains only title/version; architecture/demo docs are one-line files. |
| Docker/deployment | Partial | Infra Compose + Vercel rewrite; application containers and production config are incomplete. |
| CI/lint/typecheck | Stub | No CI workflow and no frontend lint, format, or typecheck scripts. |

## 10. Verification snapshot (2026-08-27)

### Passed

- All backend JavaScript files passed `node --check`.
- Frontend production build succeeded:
  - 96 modules transformed;
  - CSS: 62.00 kB (15.33 kB gzip);
  - JavaScript: 861.79 kB (234.10 kB gzip).
- `git diff --check` passed.
- Isolated API smoke test with DB and Redis disabled:
  - `GET /health` returned 200;
  - fallback graph contained 22 nodes and 70 edges;
  - memory registration returned a JWT session;
  - authenticated `GULSHAN -> DHANMONDI` routing returned a route;
  - memory-user profile fallback returned the user and empty collections.

### Failed or warned

- Frontend build warns that the single JavaScript chunk is over 500 kB. Three.js and eagerly loaded pages are the main splitting targets.
- Backend tests with DB/Redis disabled: **10 passed, 1 failed, 11 total**.
  - Failure: `tests/unit/anomaly.test.js` expects obsolete `A/B/C/D` graph nodes and reads a missing `B -> C` edge.
  - Four passing tests are tautological placeholders: graph, routing, route API, and anomaly API.
- With the local default Redis configuration, the test process also remains alive because the Redis connection is never closed.
- There are no frontend tests.
- Smoke testing confirmed unauthenticated `POST /route` returns 401, contradicting the guest-planner UI.

## 11. Known risks and defects

### P0 — fix before any public deployment

1. **Public credential-derived data exposure**  
   `GET /api/users` has no authentication and returns repository objects containing `passwordHash`. Remove the endpoint or protect it and return a strict safe DTO.

2. **Fresh migration type mismatch**  
   `users.id` is `BIGINT UNSIGNED` in migration 001, while `user_id` foreign keys in migration 002 are signed `BIGINT`. MySQL requires matching FK types, so a fresh migration is likely to fail.

3. **Unsafe production auth defaults**  
   The backend accepts a built-in development JWT secret when none is configured. Startup also creates a known demo account/password when an enabled database has no users. Both behaviors need explicit non-production guards.

4. **Guest-planner contract is broken**  
   The UI says planning works without an account, but `/graph/dynamic-nodes`, `/route`, and `/anomaly` require auth. Planner mount requests dynamic nodes; its 401 event redirects a guest to Login immediately.

### P1 — correctness and reliability

5. Password-reset codes/tokens live only in a process `Map`; the reset-token table/repository is unused. Restarts lose sessions and multiple backend instances cannot share them.
6. Reset tokens are copied into frontend query strings, exposing them to history, logs, and referrers.
7. OTP generation uses `Math.random()`, auth endpoints have no general rate limiter, and some reset-code paths can log codes.
8. Every authenticated user can mutate graph weights through `/anomaly`; there is no admin role, expiry job, reversal, or live-feed boundary.
9. Anomalies match only `from`/`to` and mutate the first edge, which is ambiguous when multiple modes share endpoints. Repeated anomalies compound current weights.
10. Mode-alias exclusions are inconsistent: expanding `motorized` after filtering can re-enable a specifically avoided bus mode.
11. Memory auth is incomplete: profile GET falls back, but edits and saved-route/stop writes can fail or return null IDs without MySQL.
12. Routes are never recorded as trips, so trip history and stats stay empty.
13. Graph source health can say `database` while using the seed graph; `/health` always returns 200/`ok: true`, even when DB and Redis are unavailable.
14. Redis clients are not closed; failed DB/Redis initialization is not retried; graph cache initialization can race; Redis invalidation uses blocking `KEYS`.
15. The memory route cache has no TTL.
16. Profile payloads and route/stop IDs lack the same Zod validation used by auth and routing.

### P2 — product, maintenance, and delivery

17. Three database setup paths drift; the legacy two are destructive.
18. The current backend seed script inserts obsolete `A-D` nodes with New York coordinates, not the Dhaka graph.
19. README ports/auth examples do not match runtime; the OpenAPI, architecture, and demo docs are stubs.
20. Dockerfiles/nginx are incomplete: backend exposes `5000` but defaults to `8080` and starts watch mode; frontend Dockerfile/nginx are essentially empty; Compose runs only infrastructure.
21. Root scripts/package-manager choices are inconsistent and several helper scripts are placeholders.
22. CSS is very large and repeatedly redefines key selectors, making responsive behavior brittle.
23. Accessibility gaps include no reduced-motion mode, inconsistent focus treatment, unlabeled map/canvases, placeholder-only profile form fields, and weak live error announcement.
24. Home settings/contact affordances misrepresent their behavior; delete buttons lack confirmation/pending states; map results do not auto-fit.
25. `vanilla-tilt` and several hooks, stores, utilities, components, simulation files, jobs, and module files are unused stubs.

## 12. Recommended next work order

1. Remove/protect `/api/users`, sanitize all user DTOs, require a production JWT secret, and gate demo-user creation.
2. Fix migration signedness and prove a clean MySQL database can run all numbered migrations from zero.
3. Reconcile `Dynamic` with `origin/main`, preserving both the later Dynamic fixes and any non-duplicated main-side planner fix.
4. Decide the planner access contract:
   - make routing/graph reads public and restrict anomaly mutation; or
   - make the frontend require login before entering the planner.
5. Replace the obsolete anomaly test and four placeholders with real HTTP integration tests; add migration, profile, cache, and frontend smoke coverage; ensure Redis closes after tests.
6. Persist reset challenges safely, use cryptographically secure codes, add rate limits, and stop placing reset tokens in URLs.
7. Complete the data loop: record successful trips and allow a computed planner route to be saved directly.
8. Give anomalies an authorized role, explicit edge mode/ID, expiry, rollback, and cleanup semantics.
9. Make numbered migrations the only schema source; retire the destructive legacy SQL and obsolete seed script.
10. Align ports, add frontend env documentation, replace stub docs with actual API/architecture/demo material, and make root scripts consistently use npm.
11. Either complete production Docker/CI support or remove claims that it is ready.
12. Split the frontend bundle, reduce duplicated CSS, add reduced-motion/focus/error accessibility, and wire or relabel non-functional UI controls.

## 13. How to maintain this file

After a meaningful development session:

1. Update **Last audited**, branch, and commit.
2. Add one row to the Git/progress history for a completed milestone.
3. Move feature rows between Stub, Partial, and Done only when verified.
4. Record exact build/test results in the verification snapshot.
5. Remove resolved risks rather than leaving stale warnings.
6. Update the recommended work order so the first item is the true next priority.
7. Preserve local user changes and never copy `.env` values, tokens, passwords, or service credentials into this file.

