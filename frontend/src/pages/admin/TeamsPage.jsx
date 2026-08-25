import { useMemo, useState } from "react";
import { teamsAPI } from "../../utils/api.js";
import { showToast } from "../../utils/notify.js";
import { TEAM_CATEGORIES } from "../../constants/teamCategories.js";
import TeamImportModal from "../../components/TeamImportModal.jsx";
import { getHallLabel } from "../../utils/helpers.js";

const TEAM_CATEGORY_OPTIONS = Object.keys(TEAM_CATEGORIES);

function TeamsPage({ appState, updateState }) {
  const [newTeam, setNewTeam] = useState({
    contestId: "",
    teamName: "",
    organisationName: "",
    category: TEAM_CATEGORY_OPTIONS[0],
    assignedDay: 1,
    hallId: 1,
  });
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortConfig, setSortConfig] = useState({
    key: "teamName",
    direction: "asc",
  });
  const [showImport, setShowImport] = useState(false);

  const filteredTeams = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const sorted = (appState.teams || [])
      .filter((team) => {
        if (!term) return !team.isDeleted;
        return (
          !team.isDeleted &&
          [
            team.teamCode || "",
            team.teamName || "",
            team.organisationName || "",
            team.category || "",
            String(team.hallId),
            getHallLabel(appState, team.contestId, team.hallId),
            String(team.assignedDay),
          ]
            .join(" ")
            .toLowerCase()
            .includes(term)
        );
      })
      .sort((a, b) => {
        const direction = sortConfig.direction === "asc" ? 1 : -1;
        const aValue =
          sortConfig.key === "evaluationType"
            ? TEAM_CATEGORIES[a.category] || "Other"
            : (a[sortConfig.key] ?? "");
        const bValue =
          sortConfig.key === "evaluationType"
            ? TEAM_CATEGORIES[b.category] || "Other"
            : (b[sortConfig.key] ?? "");
        if (typeof aValue === "number" && typeof bValue === "number") {
          return (aValue - bValue) * direction;
        }
        return String(aValue).localeCompare(String(bValue)) * direction;
      });

    return sorted;
  }, [appState.contests, appState.teams, searchTerm, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(filteredTeams.length / pageSize));
  const paginatedTeams = filteredTeams.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
    setCurrentPage(1);
  };

  const selectedContest = appState.contests?.find(
    (contest) => contest.id === newTeam.contestId,
  );
  const maxDayForContest = selectedContest?.days || 1;
  const maxHallForContest = selectedContest?.hallCount || 1;

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newTeam.contestId) {
      setError("Please select a contest");
      return;
    }

    if (!selectedContest) {
      setError("Selected contest is no longer available");
      return;
    }

    if (!newTeam.teamName?.trim()) {
      setError("Team Name is required");
      return;
    }

    if (!newTeam.organisationName?.trim()) {
      setError("Organisation Name is required");
      return;
    }

    if (newTeam.assignedDay < 1 || newTeam.assignedDay > selectedContest.days) {
      setError(
        `Day must be between 1 and ${selectedContest.days} for the selected contest.`,
      );
      return;
    }

    if (newTeam.hallId < 1 || newTeam.hallId > selectedContest.hallCount) {
      setError(
        `Hall must be between 1 and ${selectedContest.hallCount} for the selected contest.`,
      );
      return;
    }

    setError("");
    setLoading(true);

    try {
      const payload = {
        contestId: newTeam.contestId,
        teamCode: newTeam.teamName.trim().replace(/\s+/g, "-").toUpperCase(),
        teamName: newTeam.teamName.trim(),
        organisationName: newTeam.organisationName.trim(),
        category: newTeam.category || TEAM_CATEGORY_OPTIONS[0],
        assignedDay: newTeam.assignedDay,
        hallId: newTeam.hallId,
      };

      const response = await teamsAPI.create(payload);
      const updated = [...appState.teams, response.data];
      updateState({ teams: updated });
      showToast("Team created successfully", "success");
      setNewTeam({
        contestId: "",
        teamName: "",
        organisationName: "",
        category: TEAM_CATEGORY_OPTIONS[0],
        assignedDay: 1,
        hallId: 1,
      });
      setShowForm(false);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create team");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    const team = (appState.teams || []).find((t) => t.id === id);
    const teamName = team?.teamName || team?.teamCode || "this team";
    const organisationName = team?.organisationName || "this organisation";
    const category = team?.category || "this category";

    if (
      !window.confirm(
        `Delete team "${teamName}" from ${organisationName} (${category})? This action cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      await teamsAPI.delete(id);
      const updated = appState.teams.filter((t) => t.id !== id);
      updateState({ teams: updated });
      showToast("Team deleted successfully", "success");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete team");
    }
  };

  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: "1rem",
          width: "100%",
        }}
      >
        <div className="card mb-3">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "1rem",
            }}
          >
            <h2>Team Management</h2>
            {error && <div className="alert alert-error mb-3">{error}</div>}
          </div>

          {!showForm ? (
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setError("");
                  setShowForm(true);
                  setShowImport(false);
                }}
              >
                Add Team
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setError("");
                  setShowForm(false);
                  setShowImport(true);
                }}
              >
                Import Teams
              </button>
            </div>
          ) : (
            <form
              onSubmit={handleCreate}
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "var(--spacing-md)",
                marginTop: "1.5rem",
              }}
            >
              {error && (
                <div
                  className="alert alert-error mb-3"
                  style={{ gridColumn: "1 / -1" }}
                >
                  {error}
                </div>
              )}

              <div className="form-group">
                <label className="required">Contest</label>
                <select
                  value={newTeam.contestId}
                  onChange={(e) => {
                    const contest = appState.contests?.find(
                      (c) => c.id === e.target.value,
                    );
                    setNewTeam({
                      ...newTeam,
                      contestId: e.target.value,
                      assignedDay: contest
                        ? Math.min(newTeam.assignedDay || 1, contest.days)
                        : 1,
                      hallId: contest
                        ? Math.min(newTeam.hallId || 1, contest.hallCount)
                        : 1,
                    });
                  }}
                  required
                  disabled={loading}
                >
                  <option value="">Select contest</option>
                  {appState.contests?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="required">Team Name</label>
                <input
                  type="text"
                  value={newTeam.teamName}
                  onChange={(e) =>
                    setNewTeam({ ...newTeam, teamName: e.target.value })
                  }
                  placeholder="e.g., Team Kaizen"
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label className="required">Organisation Name</label>
                <input
                  type="text"
                  value={newTeam.organisationName}
                  onChange={(e) =>
                    setNewTeam({ ...newTeam, organisationName: e.target.value })
                  }
                  placeholder="e.g., InspiringMinds Labs"
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label className="required">Category</label>
                <select
                  value={newTeam.category}
                  onChange={(e) =>
                    setNewTeam({ ...newTeam, category: e.target.value })
                  }
                  required
                  disabled={loading}
                >
                  {TEAM_CATEGORY_OPTIONS.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="required">Day</label>
                <input
                  type="number"
                  value={newTeam.assignedDay}
                  onChange={(e) => {
                    const nextValue = parseInt(e.target.value) || 1;
                    const validValue = selectedContest
                      ? Math.min(Math.max(nextValue, 1), selectedContest.days)
                      : nextValue;
                    setNewTeam({ ...newTeam, assignedDay: validValue });
                  }}
                  min="1"
                  max={maxDayForContest}
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label className="required">Hall</label>
                <select
                  value={newTeam.hallId}
                  onChange={(e) => setNewTeam({ ...newTeam, hallId: parseInt(e.target.value) || 1 })}
                  required
                  disabled={loading}
                >
                  {Array.from({ length: maxHallForContest }, (_, index) => index + 1).map((hallId) => (
                    <option key={hallId} value={hallId}>
                      {getHallLabel(appState, newTeam.contestId, hallId)}
                    </option>
                  ))}
                </select>
              </div>

              <div
                style={{
                  gridColumn: "1 / -1",
                  display: "flex",
                  justifyContent: "flex-start",
                  gap: "0.5rem",
                }}
              >
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? "Creating..." : "Add Team"}
                </button>
                {showForm && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setShowForm(false)}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          )}

          {showImport && (
            <TeamImportModal
              contests={appState.contests || []}
              categories={TEAM_CATEGORY_OPTIONS}
              onImported={(importedTeams) => {
                updateState({
                  teams: [...(appState.teams || []), ...importedTeams],
                });

                setShowImport(false);
                setCurrentPage(1);
              }}
              onClose={() => {
                setShowImport(false);
              }}
            />
          )}
        </div>

        <div className="card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "1rem",
              // marginTop: "1rem",
              // padding: "0.5rem 0",
              flexWrap: "wrap",
            }}
          >
            {/* Left side */}
            <h3>Teams</h3>

            {/* Right side */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1.5rem",
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                <label
                  htmlFor="pageSize"
                  style={{
                    margin: 0,
                    whiteSpace: "nowrap",
                  }}
                >
                  Rows per page:
                </label>

                <select
                  id="pageSize"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  style={{
                    minWidth: "60px",
                    width: "60px",
                    padding: "0.35rem 0.5rem",
                  }}
                >
                  <option value={10}>10</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              <span style={{ whiteSpace: "nowrap" }}>
                {filteredTeams.length === 0
                  ? "0 of 0"
                  : `${(currentPage - 1) * pageSize + 1}–${Math.min(
                      currentPage * pageSize,
                      filteredTeams.length,
                    )} of ${filteredTeams.length}`}
              </span>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                }}
              >
                <button
                  type="button"
                  aria-label="Previous page"
                  disabled={currentPage === 1}
                  onClick={() =>
                    setCurrentPage((page) => Math.max(1, page - 1))
                  }
                  style={{
                    border: "none",
                    background: "transparent",
                    padding: "0.25rem",
                    fontSize: "2rem",
                    lineHeight: 1,
                    cursor: currentPage === 1 ? "default" : "pointer",
                    opacity: currentPage === 1 ? 0.35 : 1,
                  }}
                >
                  &#8249;
                </button>

                <button
                  type="button"
                  aria-label="Next page"
                  disabled={currentPage >= totalPages}
                  onClick={() =>
                    setCurrentPage((page) => Math.min(totalPages, page + 1))
                  }
                  style={{
                    border: "none",
                    background: "transparent",
                    padding: "0.25rem",
                    fontSize: "2rem",
                    lineHeight: 1,
                    cursor: currentPage >= totalPages ? "default" : "pointer",
                    opacity: currentPage >= totalPages ? 0.35 : 1,
                  }}
                >
                  &#8250;
                </button>
              </div>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "1rem",
              marginBottom: "1rem",
              flexWrap: "wrap",
            }}
          >
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search teams..."
            />
          </div>

          {filteredTeams.length > 0 ? (
            <>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th
                        onClick={() => handleSort("teamName")}
                        style={{ cursor: "pointer" }}
                      >
                        Team Name{" "}
                        {sortConfig.key === "teamName"
                          ? sortConfig.direction === "asc"
                            ? "↑"
                            : "↓"
                          : ""}
                      </th>
                      <th
                        onClick={() => handleSort("organisationName")}
                        style={{ cursor: "pointer" }}
                      >
                        Organisation{" "}
                        {sortConfig.key === "organisationName"
                          ? sortConfig.direction === "asc"
                            ? "↑"
                            : "↓"
                          : ""}
                      </th>
                      <th
                        onClick={() => handleSort("category")}
                        style={{ cursor: "pointer" }}
                      >
                        Category{" "}
                        {sortConfig.key === "category"
                          ? sortConfig.direction === "asc"
                            ? "↑"
                            : "↓"
                          : ""}
                      </th>
                      <th
                        onClick={() => handleSort("evaluationType")}
                        style={{ cursor: "pointer" }}
                      >
                        Evaluation Type{" "}
                        {sortConfig.key === "evaluationType"
                          ? sortConfig.direction === "asc"
                            ? "↑"
                            : "↓"
                          : ""}
                      </th>
                      <th
                        onClick={() => handleSort("assignedDay")}
                        style={{ cursor: "pointer" }}
                      >
                        Day{" "}
                        {sortConfig.key === "assignedDay"
                          ? sortConfig.direction === "asc"
                            ? "↑"
                            : "↓"
                          : ""}
                      </th>
                      <th
                        onClick={() => handleSort("hallId")}
                        style={{ cursor: "pointer" }}
                      >
                        Hall{" "}
                        {sortConfig.key === "hallId"
                          ? sortConfig.direction === "asc"
                            ? "↑"
                            : "↓"
                          : ""}
                      </th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedTeams.map((team) => (
                      <tr key={team.id}>
                        <td>
                          <strong>
                            {team.teamName || team.teamCode || "Unnamed Team"}
                          </strong>
                        </td>
                        <td>
                          {team.organisationName || team.teamName || "N/A"}
                        </td>
                        <td>{team.category || "Other"}</td>
                        <td>{TEAM_CATEGORIES[team.category] || "Other"}</td>
                        <td>{team.assignedDay}</td>
                        <td>{getHallLabel(appState, team.contestId, team.hallId)}</td>
                        <td>✓ Active</td>
                        <td>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(team.id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p>No teams match your search.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default TeamsPage;
