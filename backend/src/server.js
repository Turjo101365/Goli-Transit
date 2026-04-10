import 'dotenv/config';
import { createApp } from './app.js';
import { initDb } from './config/db.js';
import { initRedis } from './config/redis.js';
import { ensureGraphCache } from './cache/graph.cache.js';
import { env } from './config/env.js';

await initDb();
await initRedis();
await ensureGraphCache();

const app = createApp();
const host = env.HOST;
const port = env.PORT;

const server = app.listen(port, host, () => {
  console.log(`Backend listening on http://${host}:${port}`);
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
