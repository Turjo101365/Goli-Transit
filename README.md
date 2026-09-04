# 🚇 EZZ GO (Goli-Transit)
### Multi-Modal Hyper-Local Transit Routing Engine & Live Command Center for High-Density Cities

[![Node.js Version](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![React Version](https://img.shields.io/badge/React-18.3-blue.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.4-purple.svg)](https://vitejs.dev/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-orange.svg)](https://www.mysql.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 🌟 Overview

Dhaka’s urban mobility challenge is characterized by high density, sudden road blockages, dynamic congestion, and unpredictable commuter delays across alleyways (*Golis*) and major arterial corridors.

**EZZ GO (Goli-Transit)** is a comprehensive hyper-local urban transit platform engineered to solve unpredictability through **graph-based shortest path routing (A* / Dijkstra)**, **real-time disruption handling**, **dynamic multi-modal fare computation**, and a **centralized Admin Command Center**.

Whether navigating through Dhaka's authentic MRT-6 Metro line, city bus networks, CNG auto-rickshaws, or local goli rickshaws, EZZ GO empowers commuters and transit managers with instant, reliable, and cost-effective travel decisions.

---

## 🚀 Key Features

### 1. 🗺️ Multi-Modal Hyper-Local Route Planner
- **Multi-Modal Options:** Walk, Cycle, Dhaka Rickshaw, Green CNG, City Bus, and Metro MRT-6.
- **Dynamic Cost Optimization:** Routes computed with time, distance, congestion multipliers, and live transit network weights.
- **Live Disruption Rerouting:** Real-time anomaly detection dynamically penalizes affected road edges and recommends instant detours.
- **3D Traffic Simulation:** Interactive Three.js-powered visual corridor simulation with glowing transit paths and live jam indicators.
- **Bilingual Interface:** Full native support for both **বাংলা (Bengali)** and **English**.

### 2. 💰 Dynamic Fare Rules & Real-Time Calculation
- **Database-Driven Fare Rules:** Fares are dynamically fetched from `system_settings` (`fare_rules`) and cached with automated invalidation.
- **Supported Modes:**
  - 🚌 **BRTA / Local Bus:** Configurable Base Fare + Per Km Rate.
  - 🛺 **Green CNG:** Base Fare + Per Km Rate.
  - 🚲 **Dhaka Rickshaw:** Base Fare + Per Km Rate.
  - 🚇 **Metro Rail (MRT-6):** Station-to-station distance-based fare calculation.
- **Route Planner & Live Journey Integration:** All computed route cards and simulation legs accurately display live fares calculated according to the admin-configured rules.

### 3. 🛡️ Admin Command Center & Transit Operations
- **Overview & Analytics:** Real-time statistics on registered commuters, active guest sessions, transit nodes, network edges, active anomalies, and crowdsourced incidents.
- **User & Guest Session Management:** Inspect registered users, filter by role/status, monitor active guest sessions, and track user activities.
- **Staff & Admin Invitation System:**
  - Secure modal to invite new Administrators and Moderators.
  - Automated temporary credential generation with 1-click clipboard copying.
  - SMTP Email dispatch via Gmail/custom mailers with graceful offline fallback.
- **Transit Network Control:** Add, update, and manage transit stations (Metro stations, Bus stops, Landmarks) with coordinates.
- **Live Anomaly & Traffic Jam Broadcasting:** Broadcast real-time traffic disruptions with expiration timers and custom edge weight multipliers.
- **Crowdsourced Incident Verification:** Review, verify, reject, or resolve commuter-submitted incident reports in real time.
- **System Settings & Audit Logs:** Configure fare rules and inspect tamper-evident audit logs with administrator IDs, timestamps, and client IP addresses.

### 4. 👤 Commuter Profile & Journey History
- **Personalized Travel Dashboard:** Track total completed trips, distance traveled, and time saved in transit.
- **Saved Routes & Favorite Stops:** Bookmark frequent daily commutes for 1-click map navigation and pin favorite MRT stations.
- **Guest Commuter Mode:** Emergency access without requiring registration; allows guest commuters to explore transit routes and upgrade to a permanent free account anytime with 1 click.
- **Customization:** Avatars (transit presets & custom image upload), dark/light theme toggle, weather & air quality badge.

### 5. 🔐 Enterprise-Grade Security & Authentication
- **Multi-Role Separation:** Strict middleware-enforced role boundary (`admin`, `moderator`, `user`, `guest`).
- **Portal Separation:** Commuter authentication separated from the dedicated Admin Command Center.
- **Password Security:** Salted `bcrypt` password hashing.
- **Password Recovery:** 6-digit verification code system sent via email with rate-limited resend cooldowns.
- **Google OAuth 2.0:** Secure Single Sign-On (SSO).

---

## 🧠 System Architecture

```text
                                  ┌────────────────────────┐
                                  │      Frontend UI       │
                                  │ (React + Vite + Three) │
                                  └───────────┬────────────┘
                                              │ HTTP / JSON
                                              ▼
                                  ┌────────────────────────┐
                                  │   Express API Router   │
                                  │  (Middlewares & Zod)   │
                                  └───────────┬────────────┘
                                              │
                      ┌───────────────────────┼──────────────────────┐
                      ▼                       ▼                      ▼
           ┌─────────────────────┐ ┌────────────────────┐ ┌────────────────────┐
           │ Auth & User Service │ │ Dynamic Fare Engine│ │ Graph Routing Core │
           └──────────┬──────────┘ └──────────┬─────────┘ └──────────┬─────────┘
                      │                       │                      │
                      ▼                       ▼                      ▼
           ┌───────────────────────────────────────────────────────────────────┐
           │                     Repository & Cache Layer                      │
           │        (MySQL Database + Redis Cache + In-Memory Fallback)        │
           └───────────────────────────────────────────────────────────────────┘
```

---

## ⚙️ Tech Stack

### Frontend
- **Framework:** React 18 (SPA)
- **Bundler:** Vite 5
- **Mapping & GIS:** Leaflet, React Leaflet
- **3D Graphics & Visuals:** Three.js, Vanilla Tilt
- **Routing & State:** React Router v7, React Context API (Theme, Language, Trip)
- **Styling:** Modern CSS Design Tokens, responsive grid layouts

### Backend
- **Runtime:** Node.js (ES Modules)
- **Server:** Express.js
- **Validation:** Zod schemas for strict request payload validation
- **Authentication:** JSON Web Tokens (JWT), bcryptjs, Google Auth Library
- **Mailing:** Nodemailer (Gmail SMTP & TLS/STARTTLS support)
- **Logging & Monitoring:** Winston structured logger, UUID request correlation

### Database & Storage
- **Primary Database:** MySQL 8.0 (Relational schema with foreign keys and migrations)
- **Cache Engine:** Redis (Graph snapshots, route caching, TTL-based eviction)
- **Resilience:** Automatic graceful fallback to in-memory caching during local offline development

---

## 📁 Project Structure

```text
Goli-Transit/
├── backend/
│   ├── migrations/               # SQL database migration scripts (001 - 005)
│   ├── scripts/                  # DB inspection, view, and traffic poller scripts
│   ├── src/
│   │   ├── cache/                # Redis and in-memory cache managers
│   │   ├── config/               # Environment variables, DB pool, and Redis config
│   │   ├── controllers/          # Route request controllers (admin, auth, route, profile, etc.)
│   │   ├── core/                 # Graph algorithms (Dijkstra, A*, Multi-modal graph engine)
│   │   ├── middlewares/          # Auth, Admin role verification, Zod validation, Error handlers
│   │   ├── repositories/         # MySQL queries (user, admin, profile, routes, etc.)
│   │   ├── routes/               # Express endpoint definitions
│   │   ├── services/             # Core business logic (fare, dynamicRoute, journey, mail, admin)
│   │   └── validations/          # Zod validation schemas
│   ├── tests/                    # Unit and integration test suites
│   ├── .env.example              # Environment variables template
│   └── package.json
├── frontend/
│   ├── public/                   # Static assets, icons, and fonts
│   ├── src/
│   │   ├── components/           # UI components (Header, Map, Hero, 3D Belt, Live Journey)
│   │   ├── pages/                # AdminDashboard, RoutePlanner, Profile, Login, Register, etc.
│   │   ├── services/             # API client services (admin, auth, profile, routes)
│   │   ├── state/                # Context providers (Language, Theme, Trip)
│   │   ├── styles/               # Design tokens and CSS stylesheets
│   │   └── App.jsx               # Application routes and auth shell
│   ├── .env.example              # Frontend environment variables template
│   └── package.json
└── README.md
```

---

## 🔌 API Endpoints Summary

### Authentication & Commuters
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/auth/register` | Register new commuter account |
| `POST` | `/auth/login` | Commuter / Admin portal sign in |
| `POST` | `/auth/guest` | Instant emergency guest session creation |
| `POST` | `/auth/google` | Google OAuth Single Sign-On |
| `POST` | `/auth/forgot-password` | Request password reset code |
| `POST` | `/auth/verify-code` | Verify 6-digit email reset code |
| `POST` | `/auth/reset-password` | Set new password with verified token |

### Route Planning & Simulation
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | System health, database connection, and graph status |
| `POST` | `/route` | Compute multi-modal route with live fare and time estimates |
| `POST` | `/route/simulate` | Run A* simulation on current network graph |
| `POST` | `/journey/evaluate` | Live journey step evaluation and disruption detection |
| `GET` | `/graph/snapshot` | Returns current transit graph nodes, edges, and active anomalies |

### Commuter Profile
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/profile` | Get commuter profile, trips, saved routes, and favorite stops |
| `PUT` | `/profile` | Update profile information (name, phone, bio, avatar) |
| `POST` | `/profile/routes` | Save a personalized commuter route |
| `DELETE`| `/profile/routes/:id` | Remove a saved route |
| `POST` | `/profile/trips` | Log a completed journey |
| `DELETE`| `/profile/trips` | Clear journey history |

### Admin Command Center
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/admin/overview` | High-level operations analytics & metrics |
| `POST` | `/api/admin/invite` | Invite staff/admin with temporary credentials & email |
| `GET` | `/api/admin/users` | List registered commuters with search and filters |
| `GET` | `/api/admin/guests` | List database-backed guest commuter sessions |
| `GET` | `/api/admin/nodes` | List all transit nodes (Metro stations, Bus stops) |
| `POST` | `/api/admin/nodes` | Create a new transit station or landmark |
| `POST` | `/api/admin/anomalies` | Broadcast live traffic anomaly / road closure |
| `PATCH`| `/api/admin/anomalies/:id/resolve` | Resolve active traffic anomaly |
| `GET` | `/api/admin/settings` | Retrieve live system settings and fare rules |
| `PUT` | `/api/admin/settings/:key` | Update fare rules or system settings dynamically |
| `GET` | `/api/admin/audit-logs` | Retrieve administrator audit trail logs |

---

## 🛠️ Getting Started Locally

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or later)
- [MySQL](https://www.mysql.com/) (v8.0 or later)
- (Optional) [Redis](https://redis.io/) (v6.0 or later; falling back to in-memory automatically if offline)

---

### 1. Clone the Repository
```bash
git clone https://github.com/Turjo101365/Goli-Transit.git
cd Goli-Transit
```

---

### 2. Backend Setup & Configuration

1. Navigate to the backend directory:
   ```bash
   cd backend
   npm install
   ```

2. Configure environment variables in `backend/.env`:
   ```env
   HOST=0.0.0.0
   PORT=8080
   NODE_ENV=development

   # Database (MySQL)
   DB_ENABLED=true
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=your_mysql_password
   DB_NAME=GoliTransitDB
   DB_POOL_SIZE=10

   # Redis Cache (Optional)
   REDIS_ENABLED=true
   REDIS_URL=redis://127.0.0.1:6379

   # Authentication & Security
   JWT_SECRET=your-secret-key-change-in-production
   AUTH_TOKEN_TTL_HOURS=168
   AUTH_JWT_ISSUER=ezz-go

   # Client URLs
   FRONTEND_URL=http://localhost:5173
   APP_URL=http://localhost:8080
   APP_NAME=EZZ GO

   # Email Service (Gmail SMTP / Custom)
   MAIL_ENABLED=true
   MAIL_MAILER=smtp
   MAIL_HOST=smtp.gmail.com
   MAIL_PORT=587
   MAIL_USERNAME=your_email@gmail.com
   MAIL_PASSWORD=your_16_digit_app_password
   MAIL_ENCRYPTION=tls
   MAIL_FROM_ADDRESS=your_email@gmail.com
   MAIL_FROM_NAME="EZZ GO"
   ```

3. Run Database Migrations:
   ```bash
   npm run migrate
   ```

4. Start Backend Server:
   ```bash
   npm run dev
   ```
   *Backend will start on [http://localhost:8080](http://localhost:8080)*.

---

### 3. Frontend Setup & Launch

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   npm install
   ```

2. (Optional) Configure `frontend/.env`:
   ```env
   VITE_BACKEND_ENDPOINT=http://127.0.0.1:8080
   VITE_API_TIMEOUT_MS=20000
   ```

3. Start Vite Dev Server:
   ```bash
   npm run dev
   ```
   *Frontend application will be available at [http://localhost:5173](http://localhost:5173)*.

---

### 4. Running Automated Tests
```bash
# Run backend test suite
cd backend
npm test
```

---

## 🚦 Traffic Corridor Polling (Optional)

`backend/scripts/poll-traffic.js` allows automated corridor congestion polling from the TomTom Traffic Flow API.

To run once:
```bash
cd backend
npm run poll
```

To schedule continuous automated 15-minute polling via cron:
```cron
*/15 * * * * cd /path/to/Goli-Transit/backend && npm run poll >> /var/log/ezz-go-poll.log 2>&1
```

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).

---

*Built with ❤️ for resilient urban transit navigation in Dhaka city.*