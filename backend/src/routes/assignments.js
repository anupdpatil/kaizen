import express from 'express';
import db from '../db.js';
import { adminMiddleware } from '../middleware/auth.js';
import { logActivity } from '../utils/activity.js';

const router = express.Router();

// GET all hall assignments
router.get('/', async (req, res) => {
  try {
    const assignments = await db.getTable('hall_assignments');
    res.json(assignments);
  } catch (error) {
    console.error('Get assignments error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST create or update assignment
router.post('/', adminMiddleware, async (req, res) => {
  try {
    const { contestId, day, hallId, juryIds } = req.body;

    if (!contestId || day === undefined || hallId === undefined || !juryIds) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const contest = (await db.getTable('contests')).find(c => c.id === contestId);
    if (!contest) {
      return res.status(400).json({ error: 'Contest not found' });
    }

    const parsedDay = parseInt(day, 10);
    const parsedHall = parseInt(hallId, 10);

    if (parsedDay < 1 || parsedDay > contest.days) {
      return res.status(400).json({ error: `Day must be between 1 and ${contest.days} for this contest.` });
    }

    if (parsedHall < 1 || parsedHall > contest.hallCount) {
      return res.status(400).json({ error: `Hall must be between 1 and ${contest.hallCount} for this contest.` });
    }

    if (juryIds.length !== 2 || new Set(juryIds).size !== 2) {
      return res.status(400).json({ error: 'Must assign exactly 2 distinct juries' });
    }

    const id = `${contestId}-D${parsedDay}-H${parsedHall}`;
    const assignments = await db.getTable('hall_assignments');
    
    // Check if exists
    const existing = assignments.find(a => a.id === id);
    
    const assignment = {
      id,
      contestId,
      day: parsedDay,
      hallId: parsedHall,
      juryIds,
      updatedAt: new Date().toISOString()
    };

    if (existing) {
      const index = assignments.findIndex(a => a.id === id);
      assignments[index] = assignment;
      await db.setTable('hall_assignments', assignments);
    } else {
      assignment.createdAt = new Date().toISOString();
      await db.create('hall_assignments', assignment);
    }

    await logActivity({
      actor: req.user?.username,
      actorRole: req.user?.role,
      action: 'assign',
      entityType: 'assignment',
      entityId: id,
      details: { contestId, day, hallId, juryIds }
    });

    res.status(201).json(assignment);
  } catch (error) {
    console.error('Create/update assignment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT update assignment
router.put('/:id', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { juryIds, day, hallId } = req.body;

    if (juryIds && (juryIds.length !== 2 || new Set(juryIds).size !== 2)) {
      return res.status(400).json({ error: 'Must assign exactly 2 distinct juries' });
    }

    const assignments = await db.getTable('hall_assignments');
    const index = assignments.findIndex(a => a.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    const contest = (await db.getTable('contests')).find(c => c.id === assignments[index].contestId);
    if (!contest) {
      return res.status(400).json({ error: 'Contest not found' });
    }

    const nextDay = day !== undefined ? parseInt(day, 10) : assignments[index].day;
    const nextHall = hallId !== undefined ? parseInt(hallId, 10) : assignments[index].hallId;

    if (nextDay < 1 || nextDay > contest.days) {
      return res.status(400).json({ error: `Day must be between 1 and ${contest.days} for this contest.` });
    }

    if (nextHall < 1 || nextHall > contest.hallCount) {
      return res.status(400).json({ error: `Hall must be between 1 and ${contest.hallCount} for this contest.` });
    }

    const assignment = assignments[index];
    assignments[index] = {
      ...assignment,
      ...(day !== undefined && { day: nextDay }),
      ...(hallId !== undefined && { hallId: nextHall }),
      ...(juryIds && { juryIds }),
      updatedAt: new Date().toISOString()
    };

    await db.setTable('hall_assignments', assignments);
    await logActivity({
      actor: req.user?.username,
      actorRole: req.user?.role,
      action: 'update_assignment',
      entityType: 'assignment',
      entityId: id,
      details: { juryIds, day: nextDay, hallId: nextHall }
    });
    res.json(assignments[index]);
  } catch (error) {
    console.error('Update assignment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE assignment
router.delete('/:id', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await db.delete('hall_assignments', id);

    if (!deleted) {
      return res.status(404).json({ error: 'Assignment not found' });
    }

    await logActivity({
      actor: req.user?.username,
      actorRole: req.user?.role,
      action: 'delete_assignment',
      entityType: 'assignment',
      entityId: id,
      details: { message: 'Assignment deleted' }
    });

    res.json({ success: true, message: 'Assignment deleted' });
  } catch (error) {
    console.error('Delete assignment error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
