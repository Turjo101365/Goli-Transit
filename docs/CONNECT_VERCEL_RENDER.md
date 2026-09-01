# Connecting Vercel Frontend to Render Backend

Follow these 3 steps to fix the connection between your **Vercel Frontend** and **Render Backend**:

---

## 1. Get Your Render Backend URL
1. Go to your **[Render Dashboard](https://dashboard.render.com)**.
2. Click on your backend service (e.g. `goli-transit-backend`).
3. Copy the URL under the service title (e.g. `https://goli-transit-backend.onrender.com`).
4. Test in your browser: `https://goli-transit-backend.onrender.com/health` &rarr; It should return `{"ok": true, ...}`.

---

## 2. Set Environment Variables in Vercel
In Vite, environment variables **must be present at build time**.

1. Go to your **[Vercel Dashboard](https://vercel.com/dashboard)**.
2. Select your frontend project.
3. Go to **Settings** &rarr; **Environment Variables**.
4. Add the following variable:
   - **Key**: `VITE_BACKEND_ENDPOINT`
   - **Value**: `https://goli-transit-backend.onrender.com` *(Replace with your real Render backend URL, without trailing slash)*
   - **Environments**: Check **Production**, **Preview**, and **Development**.
5. Click **Save**.

> [!IMPORTANT]
> Because Vite embeds environment variables during `npm run build`, you **MUST REDEPLOY** on Vercel after adding the variable:
> - Go to **Deployments** tab in Vercel.
> - Click the `...` menu on your latest deployment &rarr; Click **Redeploy** (make sure to uncheck "Use existing Build Cache" if asked).

---

## 3. Set Frontend URL in Render Backend
1. In your **Render Dashboard**, open `goli-transit-backend`.
2. Go to **Environment** tab.
3. Set or update:
   - `FRONTEND_URL`: `https://your-project.vercel.app` *(Your Vercel domain)*
4. Click **Save Changes** (Render will automatically redeploy).

---

## Troubleshooting Checklist
- [x] Backend CORS accepts all `*.vercel.app` domains automatically.
- [x] Preflight `OPTIONS` requests return status `204` with proper CORS headers.
- [x] Vercel `vercel.json` rewrite is configured for SPA routes.
- [x] `VITE_BACKEND_ENDPOINT` is added on Vercel and project is **Redeployed**.
