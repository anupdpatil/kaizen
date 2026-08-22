import express from "express";
import db from "../db.js";

const router = express.Router();

// GET all evaluations
router.get("/", async (req, res) => {
  try {
    const evaluations = await db.getTable("evaluations");
    res.json(evaluations);
  } catch (error) {
    console.error("Get evaluations error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /submit
// Create a new evaluation OR update an existing evaluation
router.post("/submit", async (req, res) => {
  try {
    const {
      contestId,
      teamId,
      juryId,
      scores,
      total: providedTotal,
    } = req.body;

    if (!teamId || !juryId || !scores) {
      return res.status(400).json({
        error: "Missing required fields",
      });
    }

    if (req.user?.role !== 'jury' || req.user.id !== juryId) {
      return res.status(403).json({ error: 'Juries can only submit their own scores' });
    }

    const teams = await db.getTable('teams');
    const team = teams.find((item) => item.id === teamId && !item.isDeleted);

    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    if (contestId && contestId !== team.contestId) {
      return res.status(400).json({ error: 'Team does not belong to this contest' });
    }

    const scoreEntries = Object.entries(scores);

    if (scoreEntries.length === 0) {
      return res.status(400).json({
        error: "No scores provided",
      });
    }

    // Validate scores
    for (const [criterion, value] of scoreEntries) {
      const score = Number(value);

      if (!Number.isFinite(score)) {
        return res.status(400).json({
          error: `Score for ${criterion} must be a valid number`,
        });
      }

      if (score < 0) {
        return res.status(400).json({
          error: `Score for ${criterion} cannot be negative`,
        });
      }
    }

    // Calculate / validate total
    const total = Number(
      providedTotal ??
        Object.values(scores).reduce(
          (sum, score) => sum + Number(score),
          0
        )
    );

    if (!Number.isFinite(total)) {
      return res.status(400).json({
        error: "Evaluation total is invalid",
      });
    }

    const evaluations = await db.getTable("evaluations");

    // Make sure team object exists
    if (!evaluations[teamId]) {
      evaluations[teamId] = {};
    }

    const existingEvaluation = evaluations[teamId][juryId];

    if (existingEvaluation) {
      const contests = await db.getTable('contests');
      const contest = contests.find((item) => item.id === team.contestId && !item.deletedAt);

      if (!contest) {
        return res.status(404).json({ error: 'Contest not found' });
      }

      if (!contest.allowScoreUpdates) {
        return res.status(403).json({
          error: 'Score updates are currently disabled by the administrator for this contest',
        });
      }
    }

    const evaluation = {
      scores,
      total,
      submittedAt: new Date().toISOString(),
      submittedBy: juryId,
    };

    // Preserve original submission timestamp if this is an update
    if (existingEvaluation?.submittedAt) {
      evaluation.createdAt =
        existingEvaluation.createdAt ||
        existingEvaluation.submittedAt;
    } else {
      evaluation.createdAt = evaluation.submittedAt;
    }

    // Persist only this jury/team pair. This avoids one jury's submission
    // overwriting scores saved by another jury at the same time.
    await db.setEvaluation(teamId, juryId, evaluation);

    res.status(existingEvaluation ? 200 : 201).json({
      success: true,
      updated: !!existingEvaluation,
      evaluation,
    });
  } catch (error) {
    console.error("Submit evaluation error:", error);

    res.status(500).json({
      error: "Internal server error",
    });
  }
});

export default router;
