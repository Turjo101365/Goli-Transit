import 'dotenv/config';
import { createApp } from './app.js';
import { dbQuery, initDb } from './config/db.js';
import { initRedis } from './config/redis.js';
import { ensureGraphCache } from './cache/graph.cache.js';
import { env } from './config/env.js';
import { runMigrations } from '../migrations/runMigrations.js';
import { hashPassword } from './utils/password.js';

const app = createApp();

async function bootstrap() {
  let dbPool = null;

  try {
    dbPool = await initDb();
  } catch (e) {
    console.warn('MySQL unavailable, continuing without DB');
  }

  if (dbPool) {
    try {
      await runMigrations();
      const existingUsers = await dbQuery('SELECT id FROM users LIMIT 1');

      if (existingUsers.length === 0 && env.NODE_ENV !== 'production') {
        await dbQuery(
          [
            'INSERT INTO users (name, email, password, password_hash)',
            'VALUES (:name, :email, :passwordHash, :passwordHash)'
          ].join(' '),
          {
            name: 'Demo User',
            email: 'demo@goli-transit.local',
            passwordHash: hashPassword('DemoPass123!')
          }
        );
      }
    } catch (e) {
      console.warn('Database migration skipped', { message: e.message });
    }
  }

  try {
    await initRedis();
  } catch (e) {
    console.warn('Redis unavailable, using fallback');
  }

  try {
    await ensureGraphCache();
  } catch (e) {
    console.warn('Graph cache skipped');
  }

  startServer(env.PORT, env.HOST);
}

function startServer(port, host) {
  const server = app.listen(port, host, () => {
    console.log(`Backend listening on http://${host}:${port}`);
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.warn(`Port ${port} busy → trying ${port + 1}`);
      startServer(port + 1, host);
    } else {
      console.error('Fatal server error:', error);
      process.exit(1);
    }
  });

  process.on('SIGTERM', () => server.close(() => process.exit(0)));
  process.on('SIGINT', () => server.close(() => process.exit(0)));
}

bootstrap();
