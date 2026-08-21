import { useState } from "react";
import { evaluationsAPI } from "../utils/api.js";
import PasswordChangeModal from "../components/PasswordChangeModal.jsx";
import { TEAM_CATEGORIES } from "../constants/teamCategories.js";
import { CATEGORY_WISE_EVALUATION_CRITERIA } from "../constants/categoryWiseEvaluationCriteria.js";
import {
  calculateWeightedTotal,
  getActiveContestId,
  getHallLabel,
} from "../utils/helpers.js";
import "../styles/jury.css";

function JuryDashboard({
  user,
  appState,
  updateState,
  onLogout,
  syncError,
  forcePasswordChange = false,
  onPasswordChanged,
}) {
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [scores, setScores] = useState({});
  const [editMode, setEditMode] = useState(false);

  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [showPasswordModal, setShowPasswordModal] =
    useState(forcePasswordChange);

  const [showConfirmation, setShowConfirmation] = useState(false);

  const [confirmationSummary, setConfirmationSummary] = useState(null);

  /*
   * ============================================================
   * TEAM QUEUE TAB
   * ============================================================
   *
   * pending   = Teams waiting to be evaluated
   * submitted = Teams already evaluated
   *
   * Pending is selected by default.
   */
  const [activeTeamTab, setActiveTeamTab] = useState("pending");

  /*
   * ============================================================
   * FORCE PASSWORD CHANGE
   * ============================================================
   */
  if (forcePasswordChange) {
    return (
      <div className="jury-layout">
        <header className="jury-header">
          <h1>Jury Dashboard</h1>

          <div className="header-right">
            <span className="user-badge">
              <strong>{user.username}</strong>
              <small>(Jury)</small>
            </span>

            <button className="btn btn-secondary btn-sm" onClick={onLogout}>
              Logout
            </button>
          </div>
        </header>

        <main className="jury-content">
          <div className="alert alert-warning mb-3">
            You must change your default password before continuing.
          </div>
        </main>

        <PasswordChangeModal
          isOpen={showPasswordModal}
          onClose={() => {
            if (!forcePasswordChange) {
              setShowPasswordModal(false);
            }
          }}
          user={user}
          forceChange={true}
          onSuccess={() => {
            if (onPasswordChanged) {
              onPasswordChanged({
                ...user,
                mustChangePassword: false,
              });
            }

            setShowPasswordModal(false);
          }}
        />
      </div>
    );
  }

  /*
   * ============================================================
   * ACTIVE CONTEST
   * ============================================================
   */
  const activeContestId = getActiveContestId(appState);
  const activeContest = (appState.contests || []).find(
    (contest) => contest.id === activeContestId,
  );
  const canUpdateSubmittedScores = Boolean(activeContest?.allowScoreUpdates);

  /*
   * ============================================================
   * ASSIGNED HALLS
   * ============================================================
   */
  const assignedHalls =
    appState.hall_assignments
      ?.filter(
        (assignment) =>
          assignment.contestId === activeContestId &&
          assignment.juryIds.includes(user.id),
      )
      .map((assignment) => ({
        day: assignment.day,
        hallId: assignment.hallId,
        contestId: assignment.contestId,
      })) || [];

  /*
   * ============================================================
   * ASSIGNED TEAMS
   * ============================================================
   */
  const assignedTeams =
    appState.teams
      ?.filter((team) => !team.isDeleted && team.contestId === activeContestId)
      .filter((team) =>
        assignedHalls.some(
          (hall) =>
            hall.hallId === team.hallId && hall.day === team.assignedDay,
        ),
      ) || [];

  /*
   * ============================================================
   * PENDING / SUBMITTED TEAMS
   * ============================================================
   */
  const pendingTeams = assignedTeams.filter((team) => {
    const teamEvals = appState.evaluations?.[team.id] || {};

    return !teamEvals[user.id];
  });

  const submittedTeams = assignedTeams.filter((team) => {
    const teamEvals = appState.evaluations?.[team.id] || {};

    return !!teamEvals[user.id];
  });

  /*
   * ============================================================
   * SELECTED TEAM
   * ============================================================
   */
  const selectedTeamCategoryGroup = selectedTeam
    ? TEAM_CATEGORIES[selectedTeam.category] || "Allied Case Study"
    : "Allied Case Study";

  const criteria =
    CATEGORY_WISE_EVALUATION_CRITERIA[selectedTeamCategoryGroup] || [];

  const selectedTeamSubmission = selectedTeam
    ? appState.evaluations?.[selectedTeam.id]?.[user.id] || null
    : null;

  /*
   * ============================================================
   * SELECT TEAM FOR VIEWING
   *
   * Pending team:
   *   -> Open in edit mode
   *
   * Submitted team:
   *   -> Open in READ ONLY mode
   * ============================================================
   */
  const handleSelectTeam = (team) => {
    const existingSubmission =
      appState.evaluations?.[team.id]?.[user.id] || null;

    setSelectedTeam(team);
    setError("");
    setShowConfirmation(false);
    setConfirmationSummary(null);

    if (existingSubmission) {
      /*
       * Submitted team
       * Open read-only.
       */
      setScores(existingSubmission.scores || {});
      setEditMode(false);

      /*
       * Make sure Submitted tab is visible.
       */
      setActiveTeamTab("submitted");
    } else {
      /*
       * Pending team
       * Open in edit mode.
       */
      setScores({});
      setEditMode(true);

      /*
       * Make sure Pending tab is visible.
       */
      setActiveTeamTab("pending");
    }
  };

  /*
   * ============================================================
   * EDIT SUBMITTED TEAM
   *
   * Called ONLY when jury clicks Edit button.
   * ============================================================
   */
  const handleEditTeam = (event, team) => {
    /*
     * Prevent the parent team button click.
     */
    event.stopPropagation();

    const existingSubmission =
      appState.evaluations?.[team.id]?.[user.id] || null;

    if (!existingSubmission) {
      return;
    }

    if (!canUpdateSubmittedScores) {
      return;
    }

    setSelectedTeam(team);
    setScores(existingSubmission.scores || {});
    setEditMode(true);
    setError("");
    setShowConfirmation(false);
    setConfirmationSummary(null);

    /*
     * Keep Submitted tab selected while editing.
     */
    setActiveTeamTab("submitted");

    /*
     * Move the page to the scoring form.
     */
    setTimeout(() => {
      const scoringForm = document.getElementById("jury-scoring-form");

      if (scoringForm) {
        scoringForm.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      } else {
        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      }
    }, 50);
  };

  /*
   * ============================================================
   * VALIDATE SCORES
   * ============================================================
   */
  const validateScores = () => {
    for (const criterion of criteria) {
      const criterionName = criterion.criterion;

      if (
        scores[criterionName] === undefined ||
        scores[criterionName] === null ||
        scores[criterionName] === ""
      ) {
        setError(`Please score ${criterionName}`);
        return false;
      }

      const numericValue = Number(scores[criterionName]);

      if (!Number.isFinite(numericValue)) {
        setError(`Invalid score for ${criterionName}`);
        return false;
      }

      if (numericValue < 0 || numericValue > Number(criterion.weightage)) {
        setError(
          `${criterionName} must be between 0 and ${criterion.weightage}`,
        );

        return false;
      }
    }

    return true;
  };

  /*
   * ============================================================
   * REVIEW SUBMISSION / UPDATE
   * ============================================================
   */
  const handleReviewSubmission = () => {
    if (!selectedTeam) {
      return;
    }

    if (!editMode) {
      return;
    }

    if (!validateScores()) {
      return;
    }

    const scoreObj = {};

    for (const criterion of criteria) {
      const criterionName = criterion.criterion;

      const value = parseInt(scores[criterionName], 10);

      scoreObj[criterionName] = value;
    }

    const total = calculateWeightedTotal(scoreObj, criteria);

    setConfirmationSummary({
      teamName: selectedTeam.teamName,

      organisationName: selectedTeam.organisationName || "N/A",

      category: selectedTeam.category || "Other",

      hallId: selectedTeam.hallId,

      assignedDay: selectedTeam.assignedDay,

      total: Number(total.toFixed(2)),

      scores: scoreObj,
    });

    setError("");
    setShowConfirmation(true);
  };

  /*
   * ============================================================
   * CONFIRM SUBMISSION / UPDATE
   * ============================================================
   */
  const handleConfirmSubmission = async () => {
    if (!selectedTeam || !confirmationSummary) {
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response = await evaluationsAPI.submit({
        teamId: selectedTeam.id,
        juryId: user.id,
        contestId: selectedTeam.contestId,
        scores: confirmationSummary.scores,
        total: confirmationSummary.total,
      });

      /*
       * ========================================================
       * UPDATE LOCAL STATE
       * ========================================================
       */
      const newEvals = {
        ...appState.evaluations,
      };

      if (!newEvals[selectedTeam.id]) {
        newEvals[selectedTeam.id] = {};
      }

      newEvals[selectedTeam.id][user.id] = response.data.evaluation;

      updateState({
        evaluations: newEvals,
      });

      /*
       * ========================================================
       * RESET FORM
       * ========================================================
       */
      setScores({});
      setSelectedTeam(null);
      setEditMode(false);
      setConfirmationSummary(null);
      setShowConfirmation(false);

      /*
       * ========================================================
       * SWITCH TO SUBMITTED TAB
       *
       * This is useful because the team has just moved from
       * Pending -> Submitted.
       * ========================================================
       */
      setActiveTeamTab("submitted");

      /*
       * ========================================================
       * SUCCESS MESSAGE
       * ========================================================
       */
      setSubmitted(true);

      setTimeout(() => {
        setSubmitted(false);
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save scores");
    } finally {
      setLoading(false);
    }
  };

  /*
   * ============================================================
   * RENDER TEAM CARD
   * ============================================================
   */
  const renderTeamButton = (team) => {
    const isSubmitted = !!appState.evaluations?.[team.id]?.[user.id];

    const submission = appState.evaluations?.[team.id]?.[user.id];

    const totalScore = submission?.total ?? 0;

    return (
      <button
        key={team.id}
        type="button"
        className={`team-btn ${isSubmitted ? "submitted" : ""} ${
          selectedTeam?.id === team.id ? "active" : ""
        }`}
        onClick={() => handleSelectTeam(team)}
        style={{
          position: "relative",
        }}
      >
        <strong>{team.teamName}</strong>

        <small>{team.organisationName || "N/A"}</small>

        <small>
          {team.category || "Other"} • {getHallLabel(appState, team.contestId, team.hallId)}, Day{" "}
          {team.assignedDay}
        </small>

        {isSubmitted && (
          <div className="submitted-meta">
            <span className="submitted-badge">Submitted</span>

            <span className="submitted-score">Total: {totalScore}</span>
          </div>
        )}

        {/* ======================================================
            EDIT BUTTON FOR SUBMITTED TEAM
            ====================================================== */}
        {isSubmitted && canUpdateSubmittedScores && (
          <span
            role="button"
            tabIndex={0}
            title="Edit submitted scores"
            onClick={(event) => handleEditTeam(event, team)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                handleEditTeam(event, team);
              }
            }}
            style={{
              position: "absolute",
              top: "10px",
              right: "10px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "32px",
              height: "32px",
              borderRadius: "6px",
              border: "1px solid var(--border-color)",
              background: "var(--background)",
              cursor: "pointer",
              fontSize: "16px",
              zIndex: 2,
            }}
          >
            <button className="btn btn-secondary btn-sm">✎</button>
          </span>
        )}
      </button>
    );
  };

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */
  return (
    <div className="jury-layout">
      {/* ========================================================
          HEADER
          ======================================================== */}
      <header className="jury-header">
        <h1>Jury Dashboard</h1>

        <div className="header-right">
          <span className="user-badge">
            <strong>{user.username}</strong>
            <small>(Jury)</small>
          </span>

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setShowPasswordModal(true)}
          >
            Change Password
          </button>

          <button className="btn btn-secondary btn-sm" onClick={onLogout}>
            Logout
          </button>
        </div>
      </header>

      <main className="jury-content">
        {/* ======================================================
            SYNC ERROR
            ====================================================== */}
        {syncError && (
          <div className="alert alert-error mb-3">
            <strong>Sync Error:</strong> {syncError}
          </div>
        )}

        {/* ======================================================
            SUCCESS
            ====================================================== */}
        {submitted && (
          <div className="alert alert-success mb-3">
            ✓ Scores saved successfully!
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 2fr",
            gap: "var(--spacing-lg)",
          }}
        >
          {/* ====================================================
              TEAM QUEUE
              ==================================================== */}
          <div className="card">
            <h3
              style={{
                marginBottom: "var(--spacing-md)",
              }}
            >
              Team Queue
            </h3>

            {/* ==================================================
                TEAM TABS
                ================================================== */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "4px",
                padding: "4px",
                marginBottom: "var(--spacing-md)",
                background: "var(--background-secondary)",
                borderRadius: "8px",
              }}
            >
              {/* Pending Tab */}
              <button
                type="button"
                onClick={() => {
                  setActiveTeamTab("pending");
                  setSelectedTeam(null);
                  setScores({});
                  setEditMode(false);
                  setError("");
                  setShowConfirmation(false);
                  setConfirmationSummary(null);
                }}
                style={{
                  border: "none",
                  borderRadius: "6px",
                  padding: "10px 12px",
                  cursor: "pointer",
                  background:
                    activeTeamTab === "pending"
                      ? "var(--background)"
                      : "transparent",
                  color:
                    activeTeamTab === "pending"
                      ? "var(--primary)"
                      : "var(--text-secondary)",
                  fontWeight: activeTeamTab === "pending" ? 700 : 500,
                  boxShadow:
                    activeTeamTab === "pending"
                      ? "0 1px 3px rgba(0,0,0,0.08)"
                      : "none",
                }}
              >
                Pending
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: "24px",
                    height: "22px",
                    marginLeft: "6px",
                    padding: "0 6px",
                    borderRadius: "999px",
                    background:
                      activeTeamTab === "pending"
                        ? "var(--primary)"
                        : "var(--border-color)",
                    color:
                      activeTeamTab === "pending"
                        ? "#fff"
                        : "var(--text-secondary)",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                  }}
                >
                  {pendingTeams.length}
                </span>
              </button>

              {/* Submitted Tab */}
              <button
                type="button"
                onClick={() => {
                  setActiveTeamTab("submitted");
                  setSelectedTeam(null);
                  setScores({});
                  setEditMode(false);
                  setError("");
                  setShowConfirmation(false);
                  setConfirmationSummary(null);
                }}
                style={{
                  border: "none",
                  borderRadius: "6px",
                  padding: "10px 12px",
                  cursor: "pointer",
                  background:
                    activeTeamTab === "submitted"
                      ? "var(--background)"
                      : "transparent",
                  color:
                    activeTeamTab === "submitted"
                      ? "var(--primary)"
                      : "var(--text-secondary)",
                  fontWeight: activeTeamTab === "submitted" ? 700 : 500,
                  boxShadow:
                    activeTeamTab === "submitted"
                      ? "0 1px 3px rgba(0,0,0,0.08)"
                      : "none",
                }}
              >
                Submitted
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: "24px",
                    height: "22px",
                    marginLeft: "6px",
                    padding: "0 6px",
                    borderRadius: "999px",
                    background:
                      activeTeamTab === "submitted"
                        ? "var(--primary)"
                        : "var(--border-color)",
                    color:
                      activeTeamTab === "submitted"
                        ? "#fff"
                        : "var(--text-secondary)",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                  }}
                >
                  {submittedTeams.length}
                </span>
              </button>
            </div>

            {/* ==================================================
                SCROLLABLE TEAM LIST
                ================================================== */}
            <div
              style={{
                maxHeight: "550px",
                overflowY: "auto",
                paddingRight: "6px",
              }}
            >
              {activeTeamTab === "pending" && (
                <>
                  {pendingTeams.length > 0 ? (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "var(--spacing-sm)",
                      }}
                    >
                      {pendingTeams.map((team) => renderTeamButton(team))}
                    </div>
                  ) : (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "var(--spacing-lg)",
                        color: "var(--text-secondary)",
                      }}
                    >
                      <div
                        style={{
                          fontSize: "2rem",
                          marginBottom: "8px",
                        }}
                      >
                        ✓
                      </div>

                      <strong>All teams evaluated</strong>

                      <p
                        style={{
                          marginTop: "4px",
                        }}
                      >
                        No pending teams
                      </p>
                    </div>
                  )}
                </>
              )}

              {activeTeamTab === "submitted" && (
                <>
                  {submittedTeams.length > 0 ? (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "var(--spacing-sm)",
                      }}
                    >
                      {submittedTeams.map((team) => renderTeamButton(team))}
                    </div>
                  ) : (
                    <p
                      style={{
                        color: "var(--text-secondary)",
                        textAlign: "center",
                        padding: "var(--spacing-lg)",
                      }}
                    >
                      No submitted teams
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* ====================================================
              SCORING / VIEW FORM
              ==================================================== */}
          <div className="card" id="jury-scoring-form">
            {selectedTeam ? (
              <>
                <div className="card"
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: "16px",
                    marginBottom: "0.75rem",
                    width: "100%",
                    background: "#F5F7FA",
                  }}
                >
                  <div>
                    <h3>{selectedTeam.teamName}</h3>
                    <p
                      style={{
                        color: "var(--text-secondary)",
                        marginBottom: "0.25rem",
                      }}
                    >
                      {selectedTeam.organisationName || "N/A"}
                    </p>
                  </div>
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "middle",
                      marginBottom: "0.75rem",
                      marginRight: "2rem",
                      padding: "4px 10px",
                      borderRadius: "999px",
                      background: "rgba(0, 139, 139, 0.08)",
                      color: "var(--primary)",
                      fontWeight: 600,
                      fontSize: "0.75rem",
                    }}
                  >
                    {selectedTeamCategoryGroup}
                  </div>
                </div>

                {/* <p
                  style={{
                    color: "var(--text-secondary)",
                  }}
                >
                  {selectedTeam.category || "Other"} • Hall{" "}
                  {selectedTeam.hallId} • Day {selectedTeam.assignedDay}
                </p> */}

                {/* ==================================================
                    READ ONLY NOTICE
                    ================================================== */}
                {selectedTeamSubmission && !editMode && (
                  <div className="alert alert-success mb-3">
                    This evaluation has already been submitted. You are viewing
                    your submitted scores in read-only mode.
                  </div>
                )}

                {/* ==================================================
                    EDIT NOTICE
                    ================================================== */}
                {selectedTeamSubmission && editMode && (
                  <div className="alert alert-warning mb-3">
                    You are editing your submitted scores. Review the changes
                    carefully before updating.
                  </div>
                )}

                {/* Error */}
                {error && <div className="alert alert-error mb-3">{error}</div>}

                {/* ==================================================
                    SCORE FIELDS
                    ================================================== */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "var(--spacing-md)",
                    marginTop: "2rem",
                  }}
                >
                  {criteria.map(({ criterion, weightage }) => (
                    <div key={criterion} className="form-group">
                      <label
                        className="required"
                        style={{
                          fontSize: "0.875rem",
                        }}
                      >
                        {criterion} ({weightage} marks)
                      </label>

                      {editMode ? (
                        <select
                          value={scores[criterion] ?? ""}
                          onChange={(e) =>
                            setScores({
                              ...scores,
                              [criterion]: e.target.value,
                            })
                          }
                          disabled={loading}
                        >
                          <option value="">
                            Select (0-
                            {weightage})
                          </option>

                          {Array.from(
                            {
                              length: Number(weightage) + 1,
                            },
                            (_, i) => (
                              <option key={i} value={i}>
                                {i}
                              </option>
                            ),
                          )}
                        </select>
                      ) : (
                        <div className="score-readonly-box">
                          {scores[criterion] ??
                            selectedTeamSubmission?.scores?.[criterion] ??
                            "—"}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* ==================================================
                    TOTAL IN READ ONLY MODE
                    ================================================== */}
                {!editMode && selectedTeamSubmission && (
                  <div
                    className="submission-total"
                    style={{
                      marginTop: "var(--spacing-lg)",
                    }}
                  >
                    Total Score: {selectedTeamSubmission.total}
                  </div>
                )}

                {/* ==================================================
                    EDIT / SUBMIT BUTTON
                    ================================================== */}
                {editMode && (
                  <button
                    className="btn btn-primary btn-lg w-full"
                    onClick={handleReviewSubmission}
                    disabled={loading}
                  >
                    {loading
                      ? "Saving..."
                      : selectedTeamSubmission
                        ? "Update Scores"
                        : "Submit Scores"}
                  </button>
                )}

                {/* ==================================================
                    EXIT EDIT MODE
                    ================================================== */}
                {selectedTeamSubmission && editMode && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-lg w-full"
                    onClick={() => {
                      setScores(selectedTeamSubmission.scores || {});

                      setEditMode(false);
                      setError("");
                      setShowConfirmation(false);
                      setConfirmationSummary(null);
                    }}
                    disabled={loading}
                    style={{
                      marginTop: "var(--spacing-sm)",
                    }}
                  >
                    Cancel Edit
                  </button>
                )}
              </>
            ) : (
              <p
                style={{
                  color: "var(--text-secondary)",
                  textAlign: "center",
                  padding: "var(--spacing-lg)",
                }}
              >
                Select a team from the queue to view or score
              </p>
            )}
          </div>
        </div>
      </main>

      {/* ==========================================================
          CONFIRMATION MODAL
          ========================================================== */}
      {showConfirmation && confirmationSummary && (
        <div className="confirmation-overlay">
          <div className="confirmation-card">
            <h3>
              {selectedTeamSubmission
                ? "Confirm score update"
                : "Confirm ranking submission"}
            </h3>

            {/* Previous total */}
            {selectedTeamSubmission && (
              <div
                style={{
                  marginBottom: "var(--spacing-md)",
                  padding: "10px",
                  borderRadius: "8px",
                  background: "var(--background-secondary)",
                }}
              >
                <strong>Previous Total: </strong>

                {selectedTeamSubmission.total ?? 0}
              </div>
            )}

            {/* Scores */}
            <div className="confirmation-summary-list">
              {criteria.map(({ criterion, weightage }) => (
                <div key={criterion} className="confirmation-row">
                  <span>
                    {criterion} ({weightage}
                    marks)
                  </span>

                  <strong>{confirmationSummary.scores[criterion]}</strong>
                </div>
              ))}
            </div>

            {/* New total */}
            <div className="confirmation-total">
              <span>{selectedTeamSubmission ? "New Total" : "Total"}</span>

              <strong>{confirmationSummary.total}</strong>
            </div>

            {/* Actions */}
            <div className="confirmation-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowConfirmation(false)}
                disabled={loading}
              >
                Edit
              </button>

              <button
                className="btn btn-primary"
                onClick={handleConfirmSubmission}
                disabled={
                  loading ||
                  selectedTeamSubmission?.total === confirmationSummary.total
                }
              >
                {loading
                  ? "Saving..."
                  : selectedTeamSubmission
                    ? "Confirm & Update"
                    : "Confirm & Submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================================
          PASSWORD CHANGE
          ========================================================== */}
      <PasswordChangeModal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        user={user}
        onSuccess={() => {
          if (onPasswordChanged) {
            onPasswordChanged({
              ...user,
              mustChangePassword: false,
            });
          }

          setShowPasswordModal(false);
        }}
      />
    </div>
  );
}

export default JuryDashboard;
