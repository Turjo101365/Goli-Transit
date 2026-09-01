# Deploying Goli-Transit (EZZ GO) on Render

This guide outlines the steps to deploy the application on [Render](https://render.com).

---

## Option 1: Render Blueprint (Recommended — 2 Services)

Deploy backend as a Node Web Service and frontend as a Static Site with 1 click using `render.yaml`.

### Steps:
1. Push your code to your GitHub / GitLab repository.
2. Go to your **[Render Dashboard](https://dashboard.render.com)**.
3. Click **New +** &rarr; **Blueprint**.
4. Connect your repository (`Goli-Transit`).
5. Render will automatically detect `render.yaml` and create two services:
   - **`goli-transit-backend`** (Web Service)
   - **`goli-transit-frontend`** (Static Site)
6. Configure the required environment variables in Render:
   - In `goli-transit-backend`:
     - `DATABASE_URL`: Your database connection string (e.g. Supabase PostgreSQL `postgresql://postgres.[REF]:[PASS]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres` or MySQL `mysql://user:pass@host:port/db`).
     - `DB_SSL`: `true` (required for Supabase and cloud-hosted databases).
     - `FRONTEND_URL`: Your deployed frontend URL (e.g. `https://goli-transit-frontend.onrender.com`).
     - `APP_URL`: Your deployed backend URL (e.g. `https://goli-transit-backend.onrender.com`).
     - `GOOGLE_CLIENT_ID`: (Optional) Your Google OAuth client ID.
   - In `goli-transit-frontend`:
     - `VITE_BACKEND_ENDPOINT`: Your backend URL (e.g. `https://goli-transit-backend.onrender.com`).
7. Click **Apply**.

---

## Option 2: Unified Monolith (Single Free Web Service)

Deploy backend and frontend bundled together in a single Render Web Service to conserve free-tier limits.

### Steps:
1. Go to **[Render Dashboard](https://dashboard.render.com)**.
2. Click **New +** &rarr; **Web Service**.
3. Select your repository.
4. Set the following settings:
   - **Name**: `goli-transit`
   - **Runtime**: `Node`
   - **Root Directory**: *(Leave empty / root)*
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/health`
5. Add Environment Variables:
   - `NODE_ENV`: `production`
   - `DB_ENABLED`: `true`
   - `DATABASE_URL`: Your Supabase PostgreSQL or MySQL URL
   - `DB_SSL`: `true` (for Supabase and cloud databases)
   - `JWT_SECRET`: A random 32+ character string
   - `REDIS_ENABLED`: `false`
6. Click **Deploy Web Service**.

---

## Environment Variables Reference

### Backend (`goli-transit-backend`)

| Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | Yes | `production` | Application environment (`production`) |
| `PORT` | Auto | `8080` | Port assigned by Render automatically |
| `DATABASE_URL` | Optional | `""` | Supabase PostgreSQL or MySQL connection string |
| `DB_ENABLED` | Yes | `true` | Enable database persistence |
| `DB_SSL` | Optional | `false` | Enable SSL for Supabase / remote databases |
| `JWT_SECRET` | Yes | Auto | 32+ character secret for JWT auth |
| `FRONTEND_URL` | Recommended | `""` | Frontend origin for CORS |
| `APP_URL` | Recommended | `""` | Public backend URL |
| `REDIS_ENABLED` | Optional | `false` | In-memory cache is used when `false` |
| `GOOGLE_CLIENT_ID`| Optional | `""` | Google OAuth Client ID |

### Frontend (`goli-transit-frontend`)

| Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `VITE_BACKEND_ENDPOINT` | Yes (for Static Site) | `""` | Backend API URL (e.g. `https://goli-transit-backend.onrender.com`) |
