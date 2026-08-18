import express from 'express';
import db from '../db.js';
import { logActivity } from '../utils/activity.js';

const router = express.Router();

// GET snapshot (for hydrating on startup)
router.get('/snapshot', async (req, res) => {
  try {
    const snapshot = await db.getAllData();
    res.json(snapshot);
  } catch (error) {
    console.error('Get snapshot error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/activity', async (req, res) => {
  try {
    const activity = await db.getActivityLogs();
    res.json(activity.slice(0, 25));
  } catch (error) {
    console.error('Get activity error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST save state (autosave from frontend)
router.post('/snapshot', async (req, res) => {
  try {
    const snapshot = req.body;

    // Validate basic structure
    if (!snapshot || typeof snapshot !== 'object') {
      return res.status(400).json({ error: 'Invalid snapshot format' });
    }

    // Persist all data
    await db.setAllData(snapshot);
    await logActivity({
      actor: req.user?.username || 'system',
      actorRole: req.user?.role || 'system',
      action: 'autosave',
      entityType: 'state',
      entityId: 'snapshot',
      details: { version: new Date().getTime() }
    });

    res.json({ success: true, version: new Date().getTime() });
  } catch (error) {
    console.error('Save state error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
