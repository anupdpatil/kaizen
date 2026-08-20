import { useMemo, useState } from "react";
import { getActiveContestId, getHallLabel } from "../../utils/helpers.js";
import { CATEGORY_WISE_EVALUATION_CRITERIA } from "../../constants/categoryWiseEvaluationCriteria.js";

function DetailedScoresPage({ appState }) {
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [selectedJuryId, setSelectedJuryId] = useState("");

  const activeContestId = getActiveContestId(appState);

  const teams = useMemo(() => {
    return (appState.teams || [])
      .filter((t) => !t.isDeleted)
      .filter((t) => !activeContestId || t.contestId === activeContestId)
      .sort((a, b) => a.teamName.localeCompare(b.teamName));
  }, [appState.teams, activeContestId]);

  const selectedTeam = teams.find((t) => t.id === selectedTeamId) || teams[0];
  const selectedTeamId_actual = selectedTeam?.id;

  const detailedScores = useMemo(() => {
    if (!selectedTeamId_actual) return [];

    const teamEvals = appState.evaluations[selectedTeamId_actual] || {};
    const entries = Object.entries(teamEvals);

    return entries
      .map(([juryId, evaluation]) => {
        const jury = appState.juries?.find((j) => j.id === juryId);
        return {
          juryId,
          juryName: jury?.name || "Unknown",
          scores: evaluation?.scores || {},
          total: evaluation?.total || 0,
          submittedAt: evaluation?.submittedAt,
        };
      })
      .sort((a, b) => a.juryName.localeCompare(b.juryName));
  }, [selectedTeamId_actual, appState.evaluations, appState.juries]);

  const selectedJuryScore =
    detailedScores.find((score) => score.juryId === selectedJuryId) ||
    detailedScores[0];

  const categories = selectedTeam
    ? [selectedTeam.category || "Allied Case Study"]
    : [];
  const criteria =
    categories.length > 0
      ? CATEGORY_WISE_EVALUATION_CRITERIA[categories[0]] ||
        CATEGORY_WISE_EVALUATION_CRITERIA["Allied Case Study"]
      : [];

  return (
    <div>
      <h2>Detailed Jury Scores</h2>

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: "var(--spacing-md)",
          }}
        >
          <div>
            <label>
              <strong>Select Team</strong>
            </label>
            <select
              value={selectedTeamId_actual || ""}
              onChange={(e) => {
                setSelectedTeamId(e.target.value);
                setSelectedJuryId("");
              }}
              style={{ width: "100%", padding: "0.5rem", marginTop: "0.5rem" }}
            >
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.teamCode} - {team.teamName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {selectedTeam && (
        <div className="card">
          <div
            className="card"
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: "16px",
              marginBottom: "0.5rem",
              width: "100%",
              background: "#F5F7FA",
            }}
          >
            <h3>
              {selectedTeam.teamCode} - {selectedTeam.teamName}
            </h3>
            <p
              style={{
                color: "var(--color-text-secondary)",
                // marginTop: "0.5rem",
              }}
            >
              Category: <strong>{selectedTeam.category || "Other"}</strong> |
              Hall:{" "}
              <strong>
                {getHallLabel(
                  appState,
                  selectedTeam.contestId,
                  selectedTeam.hallId,
                )}
              </strong>{" "}
              | Day: <strong>{selectedTeam.assignedDay}</strong>
            </p>
          </div>

          {detailedScores.length === 0 ? (
            <p
              style={{
                color: "var(--color-text-secondary)",
                textAlign: "center",
                padding: "2rem",
              }}
            >
              No evaluations submitted yet for this team
            </p>
          ) : (
            <>
              <div
                role="tablist"
                aria-label="Jury evaluations"
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  marginBottom: "1.5rem",
                  borderBottom: "1px solid var(--color-border)",
                  overflowX: "auto",
                }}
              >
                {detailedScores.map((juryScore) => {
                  const isSelected =
                    juryScore.juryId === selectedJuryScore?.juryId;

                  return (
                    <button
                      key={juryScore.juryId}
                      type="button"
                      role="tab"
                      aria-selected={isSelected}
                      className="btn"
                      onClick={() => setSelectedJuryId(juryScore.juryId)}
                      style={{
                        borderRadius: "var(--radius-md) var(--radius-md) 0 0",
                        border: isSelected
                          ? "1px solid var(--primary-dark)"
                          : "1px solid var(--border)",
                        borderBottom: isSelected
                          ? "3px solid var(--primary-dark)"
                          : "3px solid transparent",
                        background: isSelected
                          ? "var(--primary)"
                          : "var(--surface-alt)",
                        color: isSelected ? "#fff" : "var(--text-secondary)",
                        fontWeight: isSelected ? 700 : 500,
                        boxShadow: isSelected
                          ? "0 2px 6px rgba(0, 139, 139, 0.25)"
                          : "none",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {juryScore.juryName}
                    </button>
                  );
                })}
              </div>

              {selectedJuryScore &&
                detailedScores
                  .filter(
                    (juryScore) =>
                      juryScore.juryId === selectedJuryScore.juryId,
                  )
                  .map((juryScore) => (
                    <div
                      className="card"
                      key={juryScore.juryId}
                      style={{
                        paddingBottom: "1.5rem",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "1rem",
                        }}
                      >
                        <h4 style={{ margin: 0 }}>{juryScore.juryName}</h4>
                        <div
                          style={{
                            display: "flex",
                            gap: "1rem",
                            alignItems: "center",
                          }}
                        >
                          <span
                            style={{
                              backgroundColor: "var(--color-accent)",
                              padding: "0.5rem 1rem",
                              borderRadius: "4px",
                              fontWeight: "bold",
                              color: "white",
                            }}
                          >
                            Total: {juryScore.total}
                          </span>
                          <span
                            style={{
                              fontSize: "0.85rem",
                              color: "var(--color-text-secondary)",
                            }}
                          >
                            <u>Submitted on:</u>{" "}
                            {new Date(
                              juryScore.submittedAt,
                            ).toLocaleDateString()}{" "}
                            {new Date(
                              juryScore.submittedAt,
                            ).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(300px, 1fr))",
                          gap: "1rem",
                        }}
                      >
                        {criteria.map((c, criterionIdx) => (
                          <div
                            className="card"
                            key={criterionIdx}
                            style={{
                              padding: "0.75rem",
                              backgroundColor:
                                "var(--color-background-secondary)",
                              borderRadius: "4px",
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <div>
                              <div
                                style={{
                                  fontWeight: "500",
                                  marginBottom: "0.25rem",
                                }}
                              >
                                {c.criterion}
                              </div>
                              {/* <div
                          style={{
                            fontSize: "0.85rem",
                            color: "var(--color-text-secondary)",
                          }}
                        >
                          Weight: {c.weightage} marks
                        </div> */}
                            </div>
                            <div
                              style={{
                                fontSize: "1.25rem",
                                fontWeight: "bold",
                                color:
                                  juryScore.scores[c.criterion] !== undefined
                                    ? "var(--color-accent)"
                                    : "var(--color-text-secondary)",
                              }}
                            >
                              {juryScore.scores[c.criterion] !== undefined
                                ? `${juryScore.scores[c.criterion]}/${c.weightage}`
                                : "-"}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default DetailedScoresPage;
