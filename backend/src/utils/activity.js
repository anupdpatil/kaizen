import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';

export async function logActivity({
  actor,
  actorRole = 'system',
  action,
  entityType,
  entityId = null,
  details = {},
  request = null
}) {
  try {
    const actorName = actor || request?.user?.username || 'system';
    const actorType = actorRole || request?.user?.role || 'system';

    const entry = {
      id: uuidv4(),
      actor: actorName,
      actorRole: actorType,
      action,
      entityType,
      entityId,
      details,
      createdAt: new Date().toISOString()
    };

    if (db.useMongo) {
      const collection = await db.getCollection('activity_logs');
      await collection.insertOne(entry);
      return entry;
    }

    const table = await db.getTable('activity_logs');
    table.unshift(entry);
    await db.setTable('activity_logs', table.slice(0, 200));
    return entry;
  } catch (error) {
    console.error('Activity log failed:', error);
    return null;
  }
}

export async function getRecentActivity(limit = 50) {
  try {
    if (db.useMongo) {
      const collection = await db.getCollection('activity_logs');
      return collection.find({}).sort({ createdAt: -1 }).limit(limit).toArray();
    }

    const rows = await db.getTable('activity_logs');
    return Array.isArray(rows) ? rows.slice(0, limit) : [];
  } catch (error) {
    console.error('Get recent activity failed:', error);
    return [];
  }
}
