import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { adminMiddleware } from '../middleware/auth.js';
import { logActivity } from '../utils/activity.js';

const router = express.Router();

const normalizeHallNames = (hallNames, hallCount) => {
  if (!hallNames || typeof hallNames !== 'object' || Array.isArray(hallNames)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(hallNames)
      .map(([hallId, name]) => [Number(hallId), String(name ?? '').trim()])
      .filter(([hallId, name]) => Number.isInteger(hallId) && hallId >= 1 && hallId <= hallCount && name)
  );
};

// GET all contests
router.get('/', async (req, res) => {
  try {
    const contests = await db.getTable('contests');
    res.json(contests);
  } catch (error) {
    console.error('Get contests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST create contest
router.post('/', adminMiddleware, async (req, res) => {
  try {
    const { name, code, startDate, days, hallCount, hallNames } = req.body;

    if (!name || !code || !startDate || !days || !hallCount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check unique code
    const contests = await db.getTable('contests');
    if (contests.some(c => c.code === code && !c.deletedAt)) {
      return res.status(400).json({ error: 'Contest code already exists' });
    }

    const parsedHallCount = parseInt(hallCount, 10);
    const newContest = {
      id: uuidv4(),
      name,
      code,
      startDate,
      days: parseInt(days),
      hallCount: parsedHallCount,
      hallNames: normalizeHallNames(hallNames, parsedHallCount),
      deletedHalls: [],
      status: 'active',
      published: false,
      // Submitted scores are locked unless an admin enables updates for this contest.
      allowScoreUpdates: false,
      createdAt: new Date().toISOString()
    };

    await db.create('contests', newContest);
    await logActivity({
      actor: req.user?.username,
      actorRole: req.user?.role,
      action: 'create',
      entityType: 'contest',
      entityId: newContest.id,
      details: { name: newContest.name, code: newContest.code }
    });
    res.status(201).json(newContest);
  } catch (error) {
    console.error('Create contest error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT update contest
router.put('/:id', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, startDate, days, hallCount, hallNames, status, allowScoreUpdates } = req.body;
    const parsedHallCount = hallCount ? parseInt(hallCount, 10) : undefined;
    const contests = await db.getTable('contests');
    const contest = contests.find(item => item.id === id);

    if (!contest) {
      return res.status(404).json({ error: 'Contest not found' });
    }

    const nextHallCount = parsedHallCount || contest.hallCount;

    const updated = await db.update('contests', id, {
      ...(name && { name }),
      ...(startDate && { startDate }),
      ...(days && { days: parseInt(days) }),
      ...(parsedHallCount && { hallCount: parsedHallCount }),
      ...(hallNames !== undefined && { hallNames: normalizeHallNames(hallNames, nextHallCount) }),
      ...(status && { status }),
      ...(typeof allowScoreUpdates === 'boolean' && { allowScoreUpdates })
    });

    if (!updated) {
      return res.status(404).json({ error: 'Contest not found' });
    }

    await logActivity({
      actor: req.user?.username,
      actorRole: req.user?.role,
      action: 'update',
      entityType: 'contest',
      entityId: id,
      details: { fields: Object.keys(req.body) }
    });

    res.json(updated);
  } catch (error) {
    console.error('Update contest error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Enable or disable submitted-score updates for every jury member in a contest.
router.post('/:id/score-updates', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { allowScoreUpdates } = req.body;

    if (typeof allowScoreUpdates !== 'boolean') {
      return res.status(400).json({ error: 'allowScoreUpdates must be a boolean' });
    }

    const updated = await db.update('contests', id, { allowScoreUpdates });

    if (!updated) {
      return res.status(404).json({ error: 'Contest not found' });
    }

    await logActivity({
      actor: req.user?.username,
      actorRole: req.user?.role,
      action: allowScoreUpdates ? 'enable_score_updates' : 'disable_score_updates',
      entityType: 'contest',
      entityId: id,
      details: { name: updated.name, allowScoreUpdates }
    });

    res.json(updated);
  } catch (error) {
    console.error('Update score-update setting error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE (soft delete) contest
router.delete('/:id', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const updated = await db.update('contests', id, {
      status: 'archived',
      deletedAt: new Date().toISOString()
    });

    if (!updated) {
      return res.status(404).json({ error: 'Contest not found' });
    }

    await logActivity({
      actor: req.user?.username,
      actorRole: req.user?.role,
      action: 'archive',
      entityType: 'contest',
      entityId: id,
      details: { status: 'archived' }
    });

    res.json({ success: true, message: 'Contest archived' });
  } catch (error) {
    console.error('Delete contest error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST publish contest (with validation)
router.post('/:id/publish', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const contests = await db.getTable('contests');
    const contest = contests.find(c => c.id === id);

    if (!contest) {
      return res.status(404).json({ error: 'Contest not found' });
    }

    if (contest.published) {
      return res.status(400).json({ error: 'Contest is already published' });
    }

    // Validate setup completion
    const teams = await db.getTable('teams');
    const juries = await db.getTable('juries');
    const assignments = await db.getTable('hall_assignments');

    const contestTeams = teams.filter(t => t.contestId === id && !t.isDeleted);
    const activeJuries = juries.filter(j => !j.isDeleted);
    const contestAssignments = assignments.filter(a => a.contestId === id);

    const errors = [];
    if (contestTeams.length === 0) errors.push('At least one team must be created');
    if (activeJuries.length === 0) errors.push('At least one jury must be added');
    if (contestAssignments.length === 0) errors.push('At least one hall-day assignment must be created');

    if (errors.length > 0) {
      return res.status(400).json({ error: 'Contest not ready for publishing: ' + errors.join(', ') });
    }

    const updated = await db.update('contests', id, { published: true });

    await logActivity({
      actor: req.user?.username,
      actorRole: req.user?.role,
      action: 'publish',
      entityType: 'contest',
      entityId: id,
      details: { name: contest.name }
    });

    res.json(updated);
  } catch (error) {
    console.error('Publish contest error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST unpublish contest
router.post('/:id/unpublish', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const updated = await db.update('contests', id, { published: false });

    if (!updated) {
      return res.status(404).json({ error: 'Contest not found' });
    }

    await logActivity({
      actor: req.user?.username,
      actorRole: req.user?.role,
      action: 'unpublish',
      entityType: 'contest',
      entityId: id,
      details: { name: updated.name }
    });

    res.json(updated);
  } catch (error) {
    console.error('Unpublish contest error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
