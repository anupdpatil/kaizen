import express from 'express';
import db from '../db.js';

const router = express.Router();

// GET all evaluations
router.get('/', async (req, res) => {
  try {
    const evaluations = await db.getTable('evaluations');
    res.json(evaluations);
  } catch (error) {
    console.error('Get evaluations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST submit evaluation (jury scoring)
router.post('/submit', async (req, res) => {
  try {
    const { contestId, teamId, juryId, scores } = req.body;

    if (!teamId || !juryId || !scores) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate all 8 criteria present
    const criteria = [
      'Problem Definition',
      'Root Cause Analysis',
      'Innovation',
      'Implementation Quality',
      'Measured Impact',
      'Sustainability',
      'Presentation Clarity',
      'Q&A Handling'
    ];

    for (const criterion of criteria) {
      if (scores[criterion] === undefined) {
        return res.status(400).json({ error: `Missing score for ${criterion}` });
      }
      
      const score = parseInt(scores[criterion]);
      if (score < 0 || score > 10) {
        return res.status(400).json({ error: `Score for ${criterion} must be 0-10` });
      }
    }

    // Calculate total
    const total = Object.values(scores).reduce((sum, s) => sum + parseInt(s), 0);

    // Check if jury already submitted for this team
    const evaluations = await db.getTable('evaluations');
    if (evaluations[teamId] && evaluations[teamId][juryId]) {
      return res.status(400).json({ error: 'This jury already submitted scores for this team' });
    }

    // Create evaluation record
    if (!evaluations[teamId]) {
      evaluations[teamId] = {};
    }

    evaluations[teamId][juryId] = {
      scores,
      total,
      submittedAt: new Date().toISOString(),
      submittedBy: juryId
    };

    await db.setTable('evaluations', evaluations);
    res.status(201).json({ success: true, evaluation: evaluations[teamId][juryId] });
  } catch (error) {
    console.error('Submit evaluation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
