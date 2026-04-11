# GoliTransit - Multi-Modal Hyper-Local Routing Engine

## 🚀 Project Overview

Dhaka's urban mobility challenge is not just congestion. It is unpredictability. Daily commuting is affected by dense intersections, sudden road blockages, event-based traffic surges, and frequent travel-time variation across neighborhoods.

GoliTransit is designed to solve this by combining graph-based route optimization with real-time anomaly handling. The platform computes efficient multi-modal routes (walk, bike, bus, metro), updates edge costs when disruptions happen, and enables instant rerouting.

In short, this project provides a practical routing engine for hyper-local decision-making in highly dynamic traffic environments.

## 🧠 Architecture

The system follows a clean layered architecture:

- API Layer: Receives HTTP requests, validates payloads, and returns structured responses.
- Service Layer: Coordinates route computation, anomaly updates, and graph snapshots.
- Core Graph Engine: Maintains graph structures and runs shortest-path algorithms.
- Data and Cache Layer: MySQL for persistent storage, Redis for fast caching, and in-memory fallback for resilience.

### Request and Processing Flow (Text Diagram)

```text
Frontend (React + Map UI)
				|
				v
Backend API (Express Routes)
				|
				v
Controllers -> Services -> Core Graph Engine
				|               |
				|               +--> Routing Algorithms (Dijkstra / Multi-modal)
				|
				+--> Repository Layer (MySQL)
				|
				+--> Cache Layer (Redis -> In-Memory Fallback)
				|
				v
JSON Response to Frontend
```

### Operational Flow

- Route flow:
1. Check route cache.
2. On miss, load graph snapshot (memory -> Redis -> DB seed fallback).
3. Compute best route with constraints.
4. Return result and cache it.

- Anomaly flow:
1. Receive anomaly event and validate affected edges.
2. Update edge weights.
3. Persist anomaly and edge update records.
4. Invalidate stale route cache.
5. Next route request is recomputed with updated graph costs.

## ⚙️ Tech Stack

### Backend
- Node.js
- Express.js
- Zod (request validation)
- Winston (structured logs)
- UUID (request correlation)

### Frontend
- React
- Vite
- Leaflet + React Leaflet (map visualization)

### Database and Cache
- MySQL (source of truth for graph and anomaly persistence)
- Redis (fast cache for graph snapshots and routes)
- In-memory fallback cache (non-blocking local development)

### Tools
- Node test runner
- NPM scripts
- Docker scaffolding (currently optional / placeholder)

## 📁 Project Structure

```text
Goli-Transit/
├── backend/
│   ├── src/
│   │   ├── cache/           # Redis + in-memory cache helpers
│   │   ├── config/          # env, db, redis runtime config
│   │   ├── controllers/     # request handlers
│   │   ├── core/            # graph engine + algorithms
│   │   ├── middlewares/     # validation, logging, error handling
│   │   ├── modules/         # domain modules
│   │   ├── repositories/    # MySQL data access
│   │   ├── routes/          # API route definitions
│   │   ├── services/        # business orchestration
│   │   └── validations/     # Zod schemas
│   ├── tests/               # unit + integration tests
│   └── schema.sql           # database schema + seed data
├── frontend/
│   ├── src/
│   │   ├── components/      # map, routing, UI components
│   │   ├── pages/           # Home + Route Planner
│   │   ├── services/        # API clients
│   │   └── assets/styles/   # styling
├── docs/                    # architecture notes, demo script, API spec
├── docker/                  # Dockerfiles + nginx scaffold
└── scripts/                 # helper scripts
```

## 🔌 API Endpoints

### GET /health

Returns service health plus graph/cache/database status.

### POST /route

Computes route between origin and destination with mode constraints.

Sample request:

```json
{
	"origin": "A",
	"destination": "C",
	"preferredModes": ["walk", "bike", "bus", "metro"],
	"avoidModes": [],
	"vehicleType": null
}
```

### POST /anomaly

Applies dynamic edge weight multiplier to simulate congestion/disruption.

Sample request:

```json
{
	"type": "EDGE_WEIGHT_MULTIPLIER",
	"reason": "Road congestion near B-C",
	"affectedEdges": [
		{
			"from": "B",
			"to": "C",
			"multiplier": 2.5
		}
	]
}
```

### GET /graph/snapshot

Returns current graph snapshot including node count, edge count, and edge weights.

## 🧪 How to Run Locally

### Prerequisites

- Node.js 18+
- NPM
- Optional for full mode: MySQL and Redis running locally

### Backend Setup

```bash
cd backend
npm install
npm run dev
```

Alternative production-like run:

```bash
cd backend
npm start
```

Backend URL: http://localhost:3001

### Frontend Setup

```bash
cd frontend
npm install
npm start
```

Frontend URL: Vite default (typically http://localhost:5173)

### Environment Variables

Create a .env file inside backend and set values as needed:

```env
PORT=3001
NODE_ENV=development

DB_ENABLED=false
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=goli_transit
DB_POOL_SIZE=10

REDIS_ENABLED=true
REDIS_URL=redis://127.0.0.1:6379
REDIS_GRAPH_TTL_SECONDS=3600
REDIS_ROUTE_TTL_SECONDS=600
```

Notes:
- DB is optional by default (DB_ENABLED=false).
- Redis fallback is graceful; when unavailable, in-memory cache is used.

## 🐳 Docker Setup (Optional)

You can run MySQL + Redis + phpMyAdmin locally using Docker Compose:

```bash
docker compose up -d
```

Services:
- MySQL: `127.0.0.1:3307` (root / root123)
- phpMyAdmin: `http://127.0.0.1:8080`
- Redis: `127.0.0.1:6379`

Suggested backend `.env` values for this Docker setup:

```env
DB_ENABLED=true
DB_HOST=127.0.0.1
DB_PORT=3307
DB_USER=root
DB_PASSWORD=root123
DB_NAME=GoliTransitDB

REDIS_ENABLED=true
REDIS_URL=redis://127.0.0.1:6379
```

If your backend is also running on port `8080`, change the phpMyAdmin host port in `docker-compose.yml` (for example `8081:80`) to avoid a port conflict.

## 🎥 Demo Instructions

Recommended live demo flow for judges:

1. Open Home and explain Dhaka traffic pain point.
2. Switch to Route Planner and compute route A -> C.
3. Show route legs, total cost, and map rendering.
4. Trigger anomaly on a route edge (for example B -> C).
5. Recompute route and show rerouting behavior.
6. Show /graph/snapshot response to verify updated edge weights.
7. Show /health response to highlight architecture readiness.

## 🏆 Key Features

- Multi-modal routing across walk, bike, bus, and metro.
- Real-time anomaly handling with affected-edge updates.
- Graph-based optimization using shortest-path strategies (A*, Dijkstra).
- Cache-aware performance path for repeated route queries (Redis + in-memory fallback).
- Clean layered backend architecture suitable for scale.
- **3D Traffic Visualization** with Three.js-powered live graph simulation and neon glowing paths.
- **Dhaka Hyper-Local Optimization** including goli alley networks and rickshaw economics.
- **Resilient Caching System** with graceful degradation for offline/development modes.
- **Live Anomaly Simulation** - inject traffic jams and watch instant re-routing in 3D.
- **Production-Ready APIs** with validation, logging, tests, and Docker scaffolding.

## ⚠️ Challenges and Solutions

### Challenge: Highly dynamic traffic conditions
Solution: Event-driven anomaly updates with immediate cache invalidation and recomputation.

### Challenge: Fast response under repeated route queries
Solution: Read-through cache strategy (Redis + in-memory fallback).

### Challenge: Reliability when infra dependencies are missing
Solution: Non-blocking startup with DB optional mode and Redis graceful degradation.

### Challenge: Hackathon speed with production-like clarity
Solution: Controller -> Service -> Core architecture with validation, logging, and tests.

## 🚀 Future Improvements

- Complete Dockerized production setup.
- Add live traffic feed integration.
- Support time-aware routing and schedule constraints.
- Add user preference profiles (cost vs time vs comfort).
- Extend city-scale graph ingestion for broader Dhaka coverage.
- Add performance benchmarking and load testing.

---

Built for real-time urban routing decisions in high-density cities.