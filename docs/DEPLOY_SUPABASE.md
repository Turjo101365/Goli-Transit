# Deploying Database to Supabase

This guide explains how to deploy and configure the **EZZ GO (Goli-Transit)** database on [Supabase](https://supabase.com).

---

## Method 1: Instant SQL Editor Deployment (Recommended)

1. **Log in to Supabase**:
   - Open [supabase.com](https://supabase.com) and create or open your project.

2. **Open SQL Editor**:
   - Go to your Project Dashboard &rarr; Click on **SQL Editor** (left sidebar).
   - Click **New Query**.

3. **Run Schema Script**:
   - Copy the entire contents of [`supabase/schema.sql`](../supabase/schema.sql).
   - Paste it into the SQL Editor.
   - Click **Run** (green button).

4. **Verify Database**:
   - Go to **Table Editor** in Supabase.
   - You should see all 12 tables created:
     - `nodes` (Pre-seeded with 16 MRT-6 Metro stations)
     - `edges` (Pre-seeded with MRT-6 track connections & fares)
     - `users`, `trips`, `saved_routes`, `favorite_stops`, `anomalies`, `corridors`, etc.

---

## Method 2: Automated Deployment via Terminal Script

You can deploy the schema and seed data directly from your local terminal to Supabase:

1. In your Supabase project:
   - Go to **Project Settings** &rarr; **Database**.
   - Under **Connection string**, select **URI** (or **Transaction pooler** port `6543`).
   - Copy the connection URI:
     ```
     postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
     ```

2. Run the deployment command in your terminal:
   ```bash
   # On Windows PowerShell:
   $env:DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"
   npm run db:supabase
   ```

---

## Connecting Supabase to Render

When deploying your backend on [Render](https://render.com):

1. In Render Dashboard, open your backend service (`goli-transit-backend` or `goli-transit`).
2. Go to **Environment** &rarr; Add/Update the following variables:
   - `DATABASE_URL`: Your Supabase connection string:
     ```
     postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres
     ```
   - `DB_ENABLED`: `true`
   - `DB_SSL`: `true`
3. Click **Save Changes**.
4. The backend will automatically connect to Supabase, run any pending migrations, and load transit graph data!
