import express from 'express';
import db from '../db.js';
import { adminMiddleware } from '../middleware/auth.js';

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

// Full snapshots are deliberately not accepted. A stale browser used to be
// able to replace every collection (including evaluations) with its local
// copy, erasing work submitted by other users.
router.post('/snapshot', async (req, res) => {
  res.status(410).json({
    error: 'Full state snapshots are no longer supported. Use the dedicated resource endpoints.'
  });
});

// Persist the one UI preference that is not managed by a CRUD resource.
router.post('/active-contest', adminMiddleware, async (req, res) => {
  try {
    const { activeContestId } = req.body;
    if (typeof activeContestId !== 'string' || !activeContestId) {
      return res.status(400).json({ error: 'A valid activeContestId is required' });
    }

    const contests = await db.getTable('contests');
    if (!contests.some((contest) => contest.id === activeContestId && !contest.deletedAt)) {
      return res.status(404).json({ error: 'Contest not found' });
    }

    const state = await db.getTable('state');
    await db.setTable('state', { ...state, activeContestId });
    res.json({ activeContestId });
  } catch (error) {
    console.error('Set active contest error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
