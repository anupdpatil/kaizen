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

    // Save / overwrite evaluation
    evaluations[teamId][juryId] = evaluation;

    await db.setTable("evaluations", evaluations);

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