import { createApp } from '../src/app.js';
import { initDb } from '../src/config/db.js';
import { ensureGraphCache } from '../src/cache/graph.cache.js';

const app = createApp();
let dbReady = false;

export default async function handler(req, res) {
  if (!dbReady) {
    try {
      await initDb();
      await ensureGraphCache();
      dbReady = true;
    } catch (e) {
      console.warn('DB initialization error:', e?.message || e);
    }
  }
  return app(req, res);
}
