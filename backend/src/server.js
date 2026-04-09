import 'dotenv/config';
import { createApp } from './app.js';
import { initDb } from './config/db.js';
import { initRedis } from './config/redis.js';
import { ensureGraphCache } from './cache/graph.cache.js';

await initDb();
await initRedis();
await ensureGraphCache();

const app = createApp();
const port = Number(process.env.PORT || 3001);

const server = app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});

server.on('error', (error) => {
  console.error('Server failed to start:', error);
  process.exit(1);
});

process.on('SIGTERM', () => {
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  server.close(() => {
    process.exit(0);
  });
});