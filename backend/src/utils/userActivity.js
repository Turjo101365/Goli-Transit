import { dbQuery, ensureDbAvailable } from '../config/db.js';

const memoryUserActivities = [];
let memoryActivitySeq = 1;

async function isDbLive() {
  try {
    await ensureDbAvailable();
    return true;
  } catch {
    return false;
  }
}

/**
 * Record a user activity event
 * @param {Object} params
 * @param {string|number} params.userId
 * @param {string} params.type - e.g. 'USER_LOGIN', 'SAVED_ROUTE_CREATED', 'TRIP_RECORDED', 'PROFILE_UPDATED', etc.
 * @param {string} params.title - human-readable description
 * @param {Object} [params.details] - metadata JSON object
 * @param {string} [params.ipAddress]
 */
export async function recordUserActivity({ userId, type, title, details = null, ipAddress = null }) {
  if (!userId) return null;

  const now = new Date();
  const dbLive = await isDbLive();

  if (dbLive) {
    try {
      const result = await dbQuery(
        `INSERT INTO user_activities (user_id, activity_type, title, details, ip_address, created_at)
         VALUES (:userId, :type, :title, :details, :ipAddress, :createdAt)`,
        {
          userId: Number(userId) || userId,
          type,
          title,
          details: details ? JSON.stringify(details) : null,
          ipAddress: ipAddress || null,
          createdAt: now.toISOString().slice(0, 19).replace('T', ' ')
        }
      );
      return result?.insertId || null;
    } catch (err) {
      console.warn('Failed to insert user activity into DB, recording in-memory:', err.message);
    }
  }

  const memId = memoryActivitySeq++;
  const entry = {
    id: memId,
    userId: String(userId),
    activityType: type,
    title,
    details: details || {},
    ipAddress: ipAddress || null,
    createdAt: now.toISOString()
  };

  memoryUserActivities.unshift(entry);
  if (memoryUserActivities.length > 500) {
    memoryUserActivities.pop();
  }

  return memId;
}

export function getMemoryUserActivities({ userId = null, limit = 50 } = {}) {
  let list = memoryUserActivities;
  if (userId) {
    list = list.filter((a) => String(a.userId) === String(userId));
  }
  return list.slice(0, limit);
}
