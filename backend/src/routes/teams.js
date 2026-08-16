import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { adminMiddleware } from '../middleware/auth.js';
import { logActivity } from '../utils/activity.js';

const router = express.Router();

// GET all teams
router.get('/', async (req, res) => {
  try {
    const teams = await db.getTable('teams');
    res.json(teams);
  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST create team
router.post('/', adminMiddleware, async (req, res) => {
  try {
    const { contestId, teamCode, teamName, organisationName, category, assignedDay, hallId } = req.body;

    const normalizedTeamName = (teamName || '').trim();
    const normalizedOrganisationName = (organisationName || '').trim();
    const normalizedTeamCode = (teamCode || normalizedTeamName || '').trim();
    const normalizedCategory = category || 'Other';

    if (!contestId || !normalizedTeamName || !normalizedOrganisationName || !assignedDay || hallId === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const contest = (await db.getTable('contests')).find(c => c.id === contestId);
    if (!contest) {
      return res.status(400).json({ error: 'Contest not found' });
    }

    const parsedDay = parseInt(assignedDay, 10);
    const parsedHall = parseInt(hallId, 10);

    if (parsedDay < 1 || parsedDay > contest.days) {
      return res.status(400).json({ error: `Day must be between 1 and ${contest.days} for this contest.` });
    }

    if (parsedHall < 1 || parsedHall > contest.hallCount) {
      return res.status(400).json({ error: `Hall must be between 1 and ${contest.hallCount} for this contest.` });
    }

    const newTeam = {
      id: uuidv4(),
      contestId,
      teamCode: normalizedTeamCode || `${normalizedOrganisationName.replace(/\s+/g, '-').toUpperCase()}-${Date.now()}`,
      teamName: normalizedTeamName,
      organisationName: normalizedOrganisationName,
      category: normalizedCategory,
      assignedDay: parsedDay,
      hallId: parsedHall,
      isDeleted: false,
      createdAt: new Date().toISOString()
    };

    await db.create('teams', newTeam);
    await logActivity({
      actor: req.user?.username,
      actorRole: req.user?.role,
      action: 'create',
      entityType: 'team',
      entityId: newTeam.id,
      details: { teamCode: newTeam.teamCode, teamName: newTeam.teamName, organisationName: newTeam.organisationName, category: newTeam.category }
    });
    res.status(201).json(newTeam);
  } catch (error) {
    console.error('Create team error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT update team (soft delete/restore or edit day/hall)
router.put('/:id', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { teamCode, teamName, organisationName, category, assignedDay, hallId, isDeleted } = req.body;
    const existing = await db.getTable('teams');
    const team = existing.find(item => item.id === id);

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const contest = (await db.getTable('contests')).find(c => c.id === team.contestId);
    if (!contest) {
      return res.status(400).json({ error: 'Contest not found' });
    }

    const nextDay = assignedDay !== undefined ? parseInt(assignedDay, 10) : team.assignedDay;
    const nextHall = hallId !== undefined ? parseInt(hallId, 10) : team.hallId;
    const nextTeamName = teamName !== undefined ? teamName.trim() : team.teamName;
    const nextOrganisationName = organisationName !== undefined ? organisationName.trim() : (team.organisationName || team.teamName || '');
    const nextTeamCode = teamCode !== undefined ? teamCode.trim() : (team.teamCode || nextTeamName || '');

    if (nextDay < 1 || nextDay > contest.days) {
      return res.status(400).json({ error: `Day must be between 1 and ${contest.days} for this contest.` });
    }

    if (nextHall < 1 || nextHall > contest.hallCount) {
      return res.status(400).json({ error: `Hall must be between 1 and ${contest.hallCount} for this contest.` });
    }

    const updated = await db.update('teams', id, {
      ...(teamName !== undefined && { teamName: nextTeamName }),
      ...(organisationName !== undefined && { organisationName: nextOrganisationName }),
      ...(teamCode !== undefined && { teamCode: nextTeamCode }),
      ...(category && { category }),
      ...(assignedDay !== undefined && { assignedDay: nextDay }),
      ...(hallId !== undefined && { hallId: nextHall }),
      ...(typeof isDeleted !== 'undefined' && { isDeleted })
    });

    if (!updated) {
      return res.status(404).json({ error: 'Team not found' });
    }

    await logActivity({
      actor: req.user?.username,
      actorRole: req.user?.role,
      action: 'update',
      entityType: 'team',
      entityId: id,
      details: { fields: Object.keys(req.body) }
    });

    res.json(updated);
  } catch (error) {
    console.error('Update team error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE (hard delete) team with cascading
router.delete('/:id', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // Remove team
    const deleted = await db.delete('teams', id);
    if (!deleted) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Remove evaluations for this team
    const evaluations = await db.getTable('evaluations');
    delete evaluations[id];
    await db.setTable('evaluations', evaluations);

    res.json({ success: true, message: 'Team deleted and evaluations removed' });
  } catch (error) {
    console.error('Delete team error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
