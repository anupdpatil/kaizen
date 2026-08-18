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

// POST bulk import teams
router.post('/bulk-import', adminMiddleware, async (req, res) => {
  try {
    const { contestId, teams } = req.body;

    if (!contestId) {
      return res.status(400).json({
        error: 'Contest is required'
      });
    }

    if (!Array.isArray(teams) || teams.length === 0) {
      return res.status(400).json({
        error: 'No teams were supplied for import'
      });
    }

    if (teams.length > 1000) {
      return res.status(400).json({
        error: 'Maximum 1000 teams can be imported at once'
      });
    }

    const contests = await db.getTable('contests');

    const contest = contests.find(
      item => item.id === contestId
    );

    if (!contest) {
      return res.status(400).json({
        error: 'Contest not found'
      });
    }

    const existingTeams =
      await db.getTable('teams');

    /*
     * Existing active teams for this contest.
     */
    const existingContestTeams =
      existingTeams.filter(
        team =>
          team.contestId === contestId &&
          !team.isDeleted
      );

    const existingTeamNames =
      new Set(
        existingContestTeams.map(team =>
          String(team.teamName || '')
            .trim()
            .toLowerCase()
        )
      );

    const csvTeamNames = new Set();

    const validationErrors = [];

    const newTeams = [];

    for (
      let index = 0;
      index < teams.length;
      index += 1
    ) {
      const row = teams[index];

      const rowNumber = index + 2;

      const teamName =
        String(row.teamName || '').trim();

      const organisationName =
        String(
          row.organisationName || ''
        ).trim();

      const category =
        String(
          row.category || ''
        ).trim();

      const assignedDay =
        Number(row.assignedDay);

      const hallId =
        Number(row.hallId);

      const errors = [];

      if (!teamName) {
        errors.push(
          'Team Name is required'
        );
      }

      if (!organisationName) {
        errors.push(
          'Organization Name is required'
        );
      }

      if (!category) {
        errors.push(
          'Category is required'
        );
      }

      if (
        !Number.isInteger(assignedDay)
      ) {
        errors.push(
          'Day must be a whole number'
        );
      } else if (
        assignedDay < 1 ||
        assignedDay > contest.days
      ) {
        errors.push(
          `Day must be between 1 and ${contest.days}`
        );
      }

      if (
        !Number.isInteger(hallId)
      ) {
        errors.push(
          'Hall must be a whole number'
        );
      } else if (
        hallId < 1 ||
        hallId > contest.hallCount
      ) {
        errors.push(
          `Hall must be between 1 and ${contest.hallCount}`
        );
      }

      const normalizedName =
        teamName.toLowerCase();

      if (
        normalizedName &&
        existingTeamNames.has(
          normalizedName
        )
      ) {
        errors.push(
          'Team already exists for this contest'
        );
      }

      // if (
      //   normalizedName &&
      //   csvTeamNames.has(
      //     normalizedName
      //   )
      // ) {
      //   errors.push(
      //     'Duplicate team name in import file'
      //   );
      // }

      if (normalizedName) {
        csvTeamNames.add(
          normalizedName
        );
      }

      if (errors.length > 0) {
        validationErrors.push({
          row: rowNumber,
          teamName,
          errors
        });

        continue;
      }

      const teamCode =
        teamName
          .replace(/\s+/g, '-')
          .toUpperCase();

      newTeams.push({
        id: uuidv4(),

        contestId,

        teamCode,

        teamName,

        organisationName,

        category,

        assignedDay,

        hallId,

        isDeleted: false,

        createdAt:
          new Date().toISOString()
      });
    }

    /*
     * IMPORTANT:
     *
     * Do not insert anything when there
     * are validation errors.
     *
     * This gives us an all-or-nothing import.
     */
    if (validationErrors.length > 0) {
      return res.status(400).json({
        error:
          'Import contains validation errors',
        errors: validationErrors
      });
    }

    /*
     * Existing db.setTable() ultimately writes
     * the complete teams array to MongoDB.
     */
    const updatedTeams = [
      ...existingTeams,
      ...newTeams
    ];

    await db.setTable(
      'teams',
      updatedTeams
    );

    await logActivity({
      actor: req.user?.username,
      actorRole: req.user?.role,

      action: 'bulk_import',

      entityType: 'team',

      entityId: contestId,

      details: {
        contestId,
        importedCount: newTeams.length
      }
    });

    return res.status(201).json({
      success: true,

      count: newTeams.length,

      teams: newTeams,

      message:
        `${newTeams.length} teams imported successfully`
    });

  } catch (error) {
    console.error(
      'Bulk import teams error:',
      error
    );

    return res.status(500).json({
      error:
        'Internal server error while importing teams'
    });
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
