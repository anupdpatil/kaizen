import { useMemo, useState } from "react";
import { contestsAPI, stateAPI } from "../../utils/api.js";
import { showToast } from "../../utils/notify.js";

function ContestPage({ appState, updateState }) {
  const getEmptyForm = () => ({
    name: "",
    code: "",
    startDate: new Date().toISOString().split("T")[0],
    days: "",
    hallCount: "",
    hallNames: {},
  });

  const [formData, setFormData] = useState(getEmptyForm());
  const [editingContestId, setEditingContestId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [publishError, setPublishError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortConfig, setSortConfig] = useState({
    key: "name",
    direction: "asc",
  });

  const filteredContests = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    const sorted = (appState.contests || [])
      .filter((contest) => {
        if (!term) return true;

        return [
          contest.name,
          contest.code,
          String(contest.days),
          String(contest.hallCount),
        ]
          .join(" ")
          .toLowerCase()
          .includes(term);
      })
      .sort((a, b) => {
        const direction = sortConfig.direction === "asc" ? 1 : -1;

        const aValue =
          sortConfig.key === "status"
            ? a.published
              ? "published"
              : "draft"
            : (a[sortConfig.key] ?? "");

        const bValue =
          sortConfig.key === "status"
            ? b.published
              ? "published"
              : "draft"
            : (b[sortConfig.key] ?? "");

        if (typeof aValue === "number" && typeof bValue === "number") {
          return (aValue - bValue) * direction;
        }

        return String(aValue).localeCompare(String(bValue)) * direction;
      });

    return sorted;
  }, [appState.contests, searchTerm, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(filteredContests.length / pageSize));

  const paginatedContests = filteredContests.slice(
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

  const resetForm = () => {
    setFormData(getEmptyForm());
    setEditingContestId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (editingContestId) {
        const response = await contestsAPI.update(editingContestId, formData);

        const updatedContests = (appState.contests || []).map((contest) =>
          contest.id === editingContestId ? response.data : contest,
        );

        updateState({ contests: updatedContests });

        showToast("Contest updated successfully", "success");
      } else {
        const response = await contestsAPI.create(formData);

        const newContests = [...(appState.contests || []), response.data];

        updateState({ contests: newContests });

        showToast("Contest created successfully", "success");
      }

      resetForm();
    } catch (err) {
      setError(
        err.response?.data?.error ||
          (editingContestId
            ? "Failed to update contest"
            : "Failed to create contest"),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (contest) => {
    setEditingContestId(contest.id);
    setShowForm(true);
    setError("");

    setFormData({
      name: contest.name,
      code: contest.code,
      startDate: contest.startDate,
      days: contest.days,
      hallCount: contest.hallCount,
      hallNames: contest.hallNames || {},
    });
  };

  const handleSetActiveContest = async (contestId) => {
    try {
      await stateAPI.setActiveContest(contestId);
      updateState({
        state: {
          ...(appState.state || {}),
          activeContestId: contestId,
        },
      });
      showToast("Active contest updated", "success");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update active contest");
    }
  };

  const handleDelete = async (contestId) => {
    const contest = (appState.contests || []).find(
      (item) => item.id === contestId,
    );

    const contestName = contest?.name || "this contest";

    if (
      !window.confirm(
        `Delete contest "${contestName}"? This will remove the contest and related records. This action cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      setError("");

      await contestsAPI.delete(contestId);

      const updatedContests = (appState.contests || []).filter(
        (contest) => contest.id !== contestId,
      );

      updateState({
        contests: updatedContests,
      });

      showToast("Contest deleted successfully", "success");

      if (editingContestId === contestId) {
        resetForm();
      }

      // Make sure the current page remains valid
      const remainingCount = updatedContests.filter((contest) => {
        const term = searchTerm.trim().toLowerCase();

        if (!term) return true;

        return [
          contest.name,
          contest.code,
          String(contest.days),
          String(contest.hallCount),
        ]
          .join(" ")
          .toLowerCase()
          .includes(term);
      }).length;

      const newTotalPages = Math.max(1, Math.ceil(remainingCount / pageSize));

      if (currentPage > newTotalPages) {
        setCurrentPage(newTotalPages);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete contest");
    }
  };

  const handlePublish = async (contestId) => {
    try {
      setPublishError("");

      const response = await contestsAPI.publish(contestId);

      const updatedContests = (appState.contests || []).map((contest) =>
        contest.id === contestId ? response.data : contest,
      );

      updateState({
        contests: updatedContests,
      });

      showToast("Contest published successfully", "success");
    } catch (err) {
      setPublishError(err.response?.data?.error || "Failed to publish contest");
    }
  };

  const handleUnpublish = async (contestId) => {
    try {
      setPublishError("");

      const response = await contestsAPI.unpublish(contestId);

      const updatedContests = (appState.contests || []).map((contest) =>
        contest.id === contestId ? response.data : contest,
      );

      updateState({
        contests: updatedContests,
      });

      showToast("Contest unpublished successfully", "info");
    } catch (err) {
      setPublishError(
        err.response?.data?.error || "Failed to unpublish contest",
      );
    }
  };

  const handleScoreUpdates = async (contest) => {
    const allowScoreUpdates = !contest.allowScoreUpdates;

    try {
      setError("");
      const response = await contestsAPI.setScoreUpdates(
        contest.id,
        allowScoreUpdates,
      );

      updateState({
        contests: (appState.contests || []).map((item) =>
          item.id === contest.id ? response.data : item,
        ),
      });

      showToast(
        allowScoreUpdates
          ? "Jury score updates enabled for this contest"
          : "Jury score updates disabled for this contest",
        "success",
      );
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update score settings");
    }
  };

  const handleCompleteContest = async (contest) => {
    if (!window.confirm(
      `Mark "${contest.name}" as complete? This disables score updates and immediately signs out all juries assigned to this contest.`
    )) {
      return;
    }

    try {
      setError("");
      const response = await contestsAPI.complete(contest.id);
      updateState({
        contests: (appState.contests || []).map((item) =>
          item.id === contest.id ? response.data : item,
        ),
      });
      showToast("Contest completed and jury access disabled", "success");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to complete contest");
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
        <div className="card" style={{ width: "100%" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "1rem",
            }}
          >
            <h2>Contests</h2>
          </div>

          {!showForm ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setError("");
                setFormData(getEmptyForm());
                setEditingContestId(null);
                setShowForm(true);
              }}
            >
              Add Contest
            </button>
          ) : (
            <form
              onSubmit={handleSubmit}
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, minmax(120px, 1fr))",
                gap: "1rem",
                alignItems: "end",
              }}
            >
              {error && (
                <div
                  className="alert alert-error mb-3"
                  style={{
                    gridColumn: "1 / -1",
                  }}
                >
                  {error}
                </div>
              )}

              <div className="form-group" style={{ minWidth: 0 }}>
                <label className="required">Contest Name</label>

                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      name: e.target.value,
                    })
                  }
                  placeholder="e.g., Kaizen 2026"
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group" style={{ minWidth: 0 }}>
                <label className="required">Code</label>

                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      code: e.target.value,
                    })
                  }
                  placeholder="e.g., KC2026"
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group" style={{ minWidth: 0 }}>
                <label className="required">Start Date</label>

                <input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      startDate: e.target.value,
                    })
                  }
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group" style={{ minWidth: 0 }}>
                <label className="required">Days</label>

                <input
                  type="number"
                  value={formData.days}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      days: parseInt(e.target.value),
                    })
                  }
                  min="1"
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group" style={{ minWidth: 0 }}>
                <label className="required">Halls</label>

                <input
                  type="number"
                  value={formData.hallCount}
                  onChange={(e) =>
                    setFormData((current) => ({
                      ...current,
                      hallCount: parseInt(e.target.value),
                      hallNames: Object.fromEntries(
                        Object.entries(current.hallNames || {}).filter(
                          ([hallId]) => Number(hallId) <= parseInt(e.target.value),
                        ),
                      ),
                    }))
                  }
                  min="1"
                  required
                  disabled={loading}
                />
              </div>

              {Number.isInteger(formData.hallCount) && formData.hallCount > 0 && (
                <div style={{ gridColumn: "1 / -1" }}>
                  <label>Hall names <small style={{ color: "var(--text-secondary)" }}>(optional)</small></label>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                    gap: "0.75rem",
                    marginTop: "0.5rem",
                  }}>
                    {Array.from({ length: formData.hallCount }, (_, index) => index + 1).map((hallId) => (
                      <div className="form-group" key={hallId} style={{ margin: 0 }}>
                        <label>Hall {hallId}</label>
                        <input
                          type="text"
                          value={formData.hallNames?.[hallId] || ""}
                          onChange={(e) => setFormData((current) => ({
                            ...current,
                            hallNames: {
                              ...current.hallNames,
                              [hallId]: e.target.value,
                            },
                          }))}
                          placeholder={`e.g., Auditorium ${hallId}`}
                          disabled={loading}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div
                style={{
                  gridColumn: "1 / -1",
                  display: "flex",
                  justifyContent: "flex-start",
                  gap: "1rem",
                }}
              >
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading
                    ? editingContestId
                      ? "Updating..."
                      : "Creating..."
                    : editingContestId
                      ? "Update Contest"
                      : "Create Contest"}
                </button>
                {showForm && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={resetForm}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          )}
        </div>

        <div className="card" style={{ width: "100%" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "1rem",
              flexWrap: "wrap",
            }}
          >
            <h3>Active Contests</h3>
            {/* Pagination */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1.5rem",
                flexWrap: "wrap",
                // marginTop: "1rem",
              }}
            >
              {/* Rows per page */}
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

              {/* Record range */}
              <span
                style={{
                  whiteSpace: "nowrap",
                }}
              >
                {filteredContests.length === 0
                  ? "0 of 0"
                  : `${(currentPage - 1) * pageSize + 1}–${Math.min(
                      currentPage * pageSize,
                      filteredContests.length,
                    )} of ${filteredContests.length}`}
              </span>

              {/* Previous / Next */}
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
          {publishError && (
            <div className="alert alert-error mb-3">{publishError}</div>
          )}

          <div style={{ marginBottom: "1rem" }}>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search contests..."
            />
          </div>

          {filteredContests.length > 0 ? (
            <>
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th
                        onClick={() => handleSort("name")}
                        style={{
                          cursor: "pointer",
                        }}
                      >
                        Name{" "}
                        {sortConfig.key === "name"
                          ? sortConfig.direction === "asc"
                            ? "↑"
                            : "↓"
                          : ""}
                      </th>

                      <th
                        onClick={() => handleSort("code")}
                        style={{
                          cursor: "pointer",
                        }}
                      >
                        Code{" "}
                        {sortConfig.key === "code"
                          ? sortConfig.direction === "asc"
                            ? "↑"
                            : "↓"
                          : ""}
                      </th>

                      <th
                        onClick={() => handleSort("days")}
                        style={{
                          cursor: "pointer",
                        }}
                      >
                        Days{" "}
                        {sortConfig.key === "days"
                          ? sortConfig.direction === "asc"
                            ? "↑"
                            : "↓"
                          : ""}
                      </th>

                      <th
                        onClick={() => handleSort("hallCount")}
                        style={{
                          cursor: "pointer",
                        }}
                      >
                        Halls{" "}
                        {sortConfig.key === "hallCount"
                          ? sortConfig.direction === "asc"
                            ? "↑"
                            : "↓"
                          : ""}
                      </th>

                      <th
                        onClick={() => handleSort("status")}
                        style={{
                          cursor: "pointer",
                        }}
                      >
                        Status{" "}
                        {sortConfig.key === "status"
                          ? sortConfig.direction === "asc"
                            ? "↑"
                            : "↓"
                          : ""}
                      </th>

                      <th>Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {paginatedContests.map((contest) => (
                      <tr key={contest.id}>
                        <td>
                          <strong>{contest.name}</strong>
                        </td>

                        <td>{contest.code}</td>

                        <td>{contest.days}</td>

                        <td>{contest.hallCount}</td>

                        <td>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "2px 8px",
                              borderRadius: "var(--radius-md)",
                              fontSize: "0.8rem",
                              fontWeight: 600,
                              backgroundColor: contest.published
                                ? "#d4edda"
                                : "#fff3cd",
                              color: contest.published ? "#155724" : "#856404",
                            }}
                          >
                            {contest.published ? "Published" : "Draft"}
                          </span>
                        </td>

                        <td>
                          <div
                            style={{
                              display: "flex",
                              gap: "0.5rem",
                              flexWrap: "wrap",
                            }}
                          >
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleEdit(contest)}
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleDelete(contest.id)}
                            >
                              Delete
                            </button>

                            <button
                              type="button"
                              className={`btn btn-sm ${
                                appState.state?.activeContestId === contest.id
                                  ? "btn-primary"
                                  : "btn-secondary"
                              }`}
                              onClick={() => handleSetActiveContest(contest.id)}
                            >
                              {appState.state?.activeContestId === contest.id
                                ? "Active"
                                : "Set Active"}
                            </button>

                            <button
                              type="button"
                              className={`btn btn-sm ${
                                contest.allowScoreUpdates
                                  ? "btn-primary"
                                  : "btn-secondary"
                              }`}
                              onClick={() => handleScoreUpdates(contest)}
                            >
                              {contest.allowScoreUpdates
                                ? "Disable Score Updates"
                                : "Allow Score Updates"}
                            </button>

                            <button
                              type="button"
                              className={`btn btn-sm ${
                                contest.status === "completed"
                                  ? "btn-secondary"
                                  : "btn-primary"
                              }`}
                              onClick={() => handleCompleteContest(contest)}
                              disabled={contest.status === "completed"}
                            >
                              {contest.status === "completed"
                                ? "Completed"
                                : "Mark Complete"}
                            </button>

                            {!contest.published && (
                              <button
                                type="button"
                                className="btn btn-primary btn-sm"
                                onClick={() => handlePublish(contest.id)}
                              >
                                Publish
                              </button>
                            )}

                            {contest.published && (
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleUnpublish(contest.id)}
                              >
                                Unpublish
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p
              style={{
                color: "var(--text-secondary)",
              }}
            >
              No contests match your search.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default ContestPage;
