import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { adminMiddleware } from '../middleware/auth.js';
import { logActivity } from '../utils/activity.js';

const router = express.Router();

// GET all juries
router.get('/', async (req, res) => {
  try {
    const juries = await db.getTable('juries');
    res.json(juries);
  } catch (error) {
    console.error('Get juries error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST create jury
router.post('/', adminMiddleware, async (req, res) => {
  try {
    const { name, username, password, role } = req.body;

    if (!name || !username || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check unique username
    const juries = await db.getTable('juries');
    if (juries.some(j => j.username === username)) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const newJury = {
      id: uuidv4(),
      name,
      username,
      password, // In production, should be hashed
      isDeleted: false,
      role: role || 'jury',
      createdAt: new Date().toISOString()
    };

    await db.create('juries', newJury);
    await logActivity({
      actor: req.user?.username,
      actorRole: req.user?.role,
      action: 'create',
      entityType: 'jury',
      entityId: newJury.id,
      details: { username: newJury.username, name: newJury.name }
    });
    res.status(201).json(newJury);
  } catch (error) {
    console.error('Create jury error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT update jury (soft delete/restore)
router.put('/:id', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, isDeleted } = req.body;

    const updated = await db.update('juries', id, {
      ...(name && { name }),
      ...(typeof isDeleted !== 'undefined' && { isDeleted })
    });

    if (!updated) {
      return res.status(404).json({ error: 'Jury not found' });
    }

    await logActivity({
      actor: req.user?.username,
      actorRole: req.user?.role,
      action: 'update',
      entityType: 'jury',
      entityId: id,
      details: { fields: Object.keys(req.body) }
    });

    res.json(updated);
  } catch (error) {
    console.error('Update jury error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE (hard delete) jury with cascading
router.delete('/:id', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // Remove from juries list
    const deleted = await db.delete('juries', id);
    if (!deleted) {
      return res.status(404).json({ error: 'Jury not found' });
    }

    // Remove from all hall assignments
    const assignments = await db.getTable('hall_assignments');
    const updatedAssignments = assignments.map(a => ({
      ...a,
      juryIds: a.juryIds.filter(jid => jid !== id)
    }));
    await db.setTable('hall_assignments', updatedAssignments);

    // Remove jury's scores from all evaluations
    const evaluations = await db.getTable('evaluations');
    const updatedEvaluations = {};
    for (const [teamId, teamEvals] of Object.entries(evaluations)) {
      updatedEvaluations[teamId] = {};
      for (const [juryId, juryEvaluation] of Object.entries(teamEvals)) {
        if (juryId !== id) {
          updatedEvaluations[teamId][juryId] = juryEvaluation;
        }
      }
    }
    await db.setTable('evaluations', updatedEvaluations);

    await logActivity({
      actor: req.user?.username,
      actorRole: req.user?.role,
      action: 'delete',
      entityType: 'jury',
      entityId: id,
      details: { message: 'Jury deleted and cascaded' }
    });

    res.json({ success: true, message: 'Jury deleted and cascaded' });
  } catch (error) {
    console.error('Delete jury error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
