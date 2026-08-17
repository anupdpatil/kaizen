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

// POST submit evaluation (jury scoring)
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
      return res.status(400).json({ error: "Missing required fields" });
    }

    const scoreEntries = Object.entries(scores);
    if (scoreEntries.length === 0) {
      return res.status(400).json({ error: "No scores provided" });
    }

    // for (const [criterion, value] of scoreEntries) {
    //   const score = Number(value);
    //   if (!Number.isFinite(score) || score < 0 || score > 10) {
    //     return res.status(400).json({ error: `Score for ${criterion} must be between 0 and 10` });
    //   }
    // }
    for (const [criterion, value] of scoreEntries) {
      const score = Number(value);
      if (!Number.isFinite(score)) {
        return res.status(400).json({
          error: `Score for ${criterion} must be a valid number`,
        });
      }
    }

    const total = Number(
      providedTotal ??
        Object.values(scores).reduce((sum, s) => sum + Number(s), 0),
    );
    if (!Number.isFinite(total)) {
      return res.status(400).json({ error: "Evaluation total is invalid" });
    }

    // Check if jury already submitted for this team
    const evaluations = await db.getTable("evaluations");
    if (evaluations[teamId] && evaluations[teamId][juryId]) {
      return res
        .status(400)
        .json({ error: "This jury already submitted scores for this team" });
    }

    // Create evaluation record
    if (!evaluations[teamId]) {
      evaluations[teamId] = {};
    }

    evaluations[teamId][juryId] = {
      scores,
      total,
      submittedAt: new Date().toISOString(),
      submittedBy: juryId,
    };

    await db.setTable("evaluations", evaluations);
    res
      .status(201)
      .json({ success: true, evaluation: evaluations[teamId][juryId] });
  } catch (error) {
    console.error("Submit evaluation error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
