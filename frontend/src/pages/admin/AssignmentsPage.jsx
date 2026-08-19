import { useMemo, useState } from "react";
import { assignmentsAPI } from "../../utils/api.js";
import { showToast } from "../../utils/notify.js";

function AssignmentsPage({ appState, updateState }) {
  const [form, setForm] = useState({
    contestId: "",
    day: 1,
    hallId: 1,
    juryIds: ["", ""],
  });

  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortConfig, setSortConfig] = useState({
    key: "day",
    direction: "asc",
  });

  // ------------------------------------------------------------
  // Filter and sort existing assignments
  // ------------------------------------------------------------
  const filteredAssignments = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    const sorted = (appState.hall_assignments || [])
      .filter((assignment) => {
        if (!term) return true;

        const contest = appState.contests?.find(
          (c) => c.id === assignment.contestId,
        );

        const jury1 = appState.juries?.find(
          (j) => j.id === assignment.juryIds[0],
        );

        const jury2 = appState.juries?.find(
          (j) => j.id === assignment.juryIds[1],
        );

        return [
          contest?.name,
          String(assignment.day),
          String(assignment.hallId),
          jury1?.name,
          jury2?.name,
        ]
          .join(" ")
          .toLowerCase()
          .includes(term);
      })
      .sort((a, b) => {
        const direction = sortConfig.direction === "asc" ? 1 : -1;

        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (sortConfig.key === "contestName") {
          aValue =
            appState.contests?.find((c) => c.id === a.contestId)?.name || "";

          bValue =
            appState.contests?.find((c) => c.id === b.contestId)?.name || "";
        }

        if (sortConfig.key === "jury1") {
          aValue =
            appState.juries?.find((j) => j.id === a.juryIds[0])?.name || "";

          bValue =
            appState.juries?.find((j) => j.id === b.juryIds[0])?.name || "";
        }

        if (sortConfig.key === "jury2") {
          aValue =
            appState.juries?.find((j) => j.id === a.juryIds[1])?.name || "";

          bValue =
            appState.juries?.find((j) => j.id === b.juryIds[1])?.name || "";
        }

        if (typeof aValue === "number" && typeof bValue === "number") {
          return (aValue - bValue) * direction;
        }

        return String(aValue).localeCompare(String(bValue)) * direction;
      });

    return sorted;
  }, [
    appState.contests,
    appState.hall_assignments,
    appState.juries,
    searchTerm,
    sortConfig,
  ]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredAssignments.length / pageSize),
  );

  const paginatedAssignments = filteredAssignments.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  // ------------------------------------------------------------
  // Sorting
  // ------------------------------------------------------------
  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));

    setCurrentPage(1);
  };

  // ------------------------------------------------------------
  // Selected contest
  // ------------------------------------------------------------
  const selectedContest = appState.contests?.find(
    (contest) => contest.id === form.contestId,
  );

  const maxDayForContest = selectedContest?.days || 1;

  const maxHallForContest = selectedContest?.hallCount || 1;

  // ------------------------------------------------------------
  // Jury filter logic
  //
  // A jury can only be assigned once within a contest.
  //
  // If a jury is already assigned to ANY hall in the
  // selected contest, it will NOT appear in either
  // Jury 1 or Jury 2 dropdown.
  //
  // Day is intentionally ignored.
  // Hall is intentionally ignored.
  // ------------------------------------------------------------
  const assignedJuryIdsForContest = useMemo(() => {
    if (!form.contestId) {
      return new Set();
    }

    const assignedJuryIds = new Set();

    (appState.hall_assignments || [])
      .filter((assignment) => assignment.contestId === form.contestId)
      .forEach((assignment) => {
        assignment.juryIds?.forEach((juryId) => {
          if (juryId) {
            assignedJuryIds.add(juryId);
          }
        });
      });

    return assignedJuryIds;
  }, [appState.hall_assignments, form.contestId]);

  // ------------------------------------------------------------
  // Available juries
  // ------------------------------------------------------------
  const availableJuries = useMemo(() => {
    return (
      appState.juries?.filter(
        (jury) => !jury.isDeleted && !assignedJuryIdsForContest.has(jury.id),
      ) || []
    );
  }, [appState.juries, assignedJuryIdsForContest]);

  // ------------------------------------------------------------
  // Assign
  // ------------------------------------------------------------
  const handleAssign = async (e) => {
    e.preventDefault();

    if (!form.contestId || !form.juryIds[0] || !form.juryIds[1]) {
      setError("Please fill all fields");
      return;
    }

    if (!selectedContest) {
      setError("Selected contest is no longer available");
      return;
    }

    if (form.day < 1 || form.day > selectedContest.days) {
      setError(
        `Day must be between 1 and ${selectedContest.days} for this contest.`,
      );
      return;
    }

    if (form.hallId < 1 || form.hallId > selectedContest.hallCount) {
      setError(
        `Hall must be between 1 and ${selectedContest.hallCount} for this contest.`,
      );
      return;
    }

    // Jury 1 and Jury 2 cannot be the same
    if (form.juryIds[0] === form.juryIds[1]) {
      setError("Must select 2 different juries");
      return;
    }

    // Extra safety validation
    const alreadyAssignedJury = form.juryIds.find((juryId) =>
      assignedJuryIdsForContest.has(juryId),
    );

    if (alreadyAssignedJury) {
      setError(
        "One or more selected juries are already assigned to this contest.",
      );
      return;
    }

    setError("");
    setLoading(true);

    try {
      const response = await assignmentsAPI.create({
        contestId: form.contestId,
        day: form.day,
        hallId: form.hallId,
        juryIds: form.juryIds,
      });

      const assignments = appState.hall_assignments || [];

      const existing = assignments.findIndex((a) => a.id === response.data.id);

      let updated;

      if (existing >= 0) {
        updated = [...assignments];
        updated[existing] = response.data;
      } else {
        updated = [...assignments, response.data];
      }

      updateState({
        hall_assignments: updated,
      });

      showToast("Assignment saved successfully", "success");

      setForm({
        contestId: form.contestId,
        day: 1,
        hallId: 1,
        juryIds: ["", ""],
      });

      setShowForm(false);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to assign");
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------------------------------------
  // Delete
  // ------------------------------------------------------------
  const handleDelete = async (assignmentId) => {
    const assignment = (appState.hall_assignments || []).find(
      (item) => item.id === assignmentId,
    );

    const contestName =
      appState.contests?.find((c) => c.id === assignment?.contestId)?.name ||
      "this contest";

    const day = assignment?.day || "this day";

    const hall = assignment?.hallId || "this hall";

    if (
      !window.confirm(
        `Delete assignment for ${contestName} on Day ${day}, Hall ${hall}? This action cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      setError("");

      await assignmentsAPI.delete(assignmentId);

      const updated = (appState.hall_assignments || []).filter(
        (item) => item.id !== assignmentId,
      );

      updateState({
        hall_assignments: updated,
      });

      showToast("Assignment deleted successfully", "success");

      // Keep the current page valid after deletion
      const newTotalPages = Math.max(1, Math.ceil(updated.length / pageSize));

      if (currentPage > newTotalPages) {
        setCurrentPage(newTotalPages);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete assignment");
    }
  };

  return (
    <div>
      <div className="card mb-3">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <h2>Hall-Jury Assignment</h2>
          {error && <div className="alert alert-error mb-3">{error}</div>}
        </div>

        {!showForm ? (
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setError("");
              setShowForm(true);
            }}
          >
            Assign Juries
          </button>
        ) : (
          <form
            onSubmit={handleAssign}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: "var(--spacing-md)",
              width: "100%",
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

            {/* Contest */}
            <div className="form-group" style={{ minWidth: 0 }}>
              <label className="required">Contest</label>

              <select
                value={form.contestId}
                onChange={(e) => {
                  const contest = appState.contests?.find(
                    (c) => c.id === e.target.value,
                  );

                  setForm({
                    ...form,
                    contestId: e.target.value,
                    day: contest ? Math.min(form.day || 1, contest.days) : 1,
                    hallId: contest
                      ? Math.min(form.hallId || 1, contest.hallCount)
                      : 1,
                    juryIds: ["", ""],
                  });

                  setError("");
                }}
                required
              >
                <option value="">Select</option>

                {appState.contests?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Day */}
            <div className="form-group" style={{ minWidth: 0 }}>
              <label className="required">Day</label>

              <input
                type="number"
                value={form.day}
                onChange={(e) => {
                  const nextValue = parseInt(e.target.value) || 1;

                  const validValue = selectedContest
                    ? Math.min(Math.max(nextValue, 1), selectedContest.days)
                    : nextValue;

                  setForm({
                    ...form,
                    day: validValue,
                  });
                }}
                min="1"
                max={maxDayForContest}
                required
              />
            </div>

            {/* Hall */}
            <div className="form-group" style={{ minWidth: 0 }}>
              <label className="required">Hall</label>

              <select
                value={form.hallId}
                onChange={(e) => {
                  setForm({
                    ...form,
                    hallId: parseInt(e.target.value) || 1,
                    juryIds: ["", ""],
                  });

                  setError("");
                }}
                required
              >
                {Array.from(
                  {
                    length: maxHallForContest,
                  },
                  (_, i) => i + 1,
                ).map((h) => (
                  <option key={h} value={h}>
                    Hall {h}
                  </option>
                ))}
              </select>
            </div>

            {/* Jury 1 */}
            <div className="form-group" style={{ minWidth: 0 }}>
              <label className="required">Jury 1</label>

              <select
                value={form.juryIds[0]}
                onChange={(e) =>
                  setForm({
                    ...form,
                    juryIds: [e.target.value, form.juryIds[1]],
                  })
                }
                required
              >
                <option value="">Select</option>

                {availableJuries
                  .filter((jury) => jury.id !== form.juryIds[1])
                  .map((jury) => (
                    <option key={jury.id} value={jury.id}>
                      {jury.name}
                    </option>
                  ))}
              </select>
            </div>

            {/* Jury 2 */}
            <div className="form-group" style={{ minWidth: 0 }}>
              <label className="required">Jury 2</label>

              <select
                value={form.juryIds[1]}
                onChange={(e) =>
                  setForm({
                    ...form,
                    juryIds: [form.juryIds[0], e.target.value],
                  })
                }
                required
              >
                <option value="">Select</option>

                {availableJuries
                  .filter((jury) => jury.id !== form.juryIds[0])
                  .map((jury) => (
                    <option key={jury.id} value={jury.id}>
                      {jury.name}
                    </option>
                  ))}
              </select>
            </div>

            {/* Submit */}
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
                {loading ? "Assigning..." : "Assign"}
              </button>
              {showForm && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setShowForm(false);
                    setError("");
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        )}
      </div>

      <div className="card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <h3>Current Assignments</h3>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1.5rem",
              flexWrap: "wrap",
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
              {filteredAssignments.length === 0
                ? "0 of 0"
                : `${(currentPage - 1) * pageSize + 1}–${Math.min(
                    currentPage * pageSize,
                    filteredAssignments.length,
                  )} of ${filteredAssignments.length}`}
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
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
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
            marginBottom: "1rem",
          }}
        >
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search assignments..."
          />
        </div>

        {filteredAssignments.length > 0 ? (
          <>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th
                      onClick={() => handleSort("contestName")}
                      style={{
                        cursor: "pointer",
                      }}
                    >
                      Contest{" "}
                      {sortConfig.key === "contestName"
                        ? sortConfig.direction === "asc"
                          ? "↑"
                          : "↓"
                        : ""}
                    </th>

                    <th
                      onClick={() => handleSort("day")}
                      style={{
                        cursor: "pointer",
                      }}
                    >
                      Day{" "}
                      {sortConfig.key === "day"
                        ? sortConfig.direction === "asc"
                          ? "↑"
                          : "↓"
                        : ""}
                    </th>

                    <th
                      onClick={() => handleSort("hallId")}
                      style={{
                        cursor: "pointer",
                      }}
                    >
                      Hall{" "}
                      {sortConfig.key === "hallId"
                        ? sortConfig.direction === "asc"
                          ? "↑"
                          : "↓"
                        : ""}
                    </th>

                    <th
                      onClick={() => handleSort("jury1")}
                      style={{
                        cursor: "pointer",
                      }}
                    >
                      Jury 1{" "}
                      {sortConfig.key === "jury1"
                        ? sortConfig.direction === "asc"
                          ? "↑"
                          : "↓"
                        : ""}
                    </th>

                    <th
                      onClick={() => handleSort("jury2")}
                      style={{
                        cursor: "pointer",
                      }}
                    >
                      Jury 2{" "}
                      {sortConfig.key === "jury2"
                        ? sortConfig.direction === "asc"
                          ? "↑"
                          : "↓"
                        : ""}
                    </th>

                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedAssignments.map((a) => {
                    const jury1 = appState.juries?.find(
                      (j) => j.id === a.juryIds[0],
                    );

                    const jury2 = appState.juries?.find(
                      (j) => j.id === a.juryIds[1],
                    );

                    return (
                      <tr key={a.id}>
                        <td>
                          {
                            appState.contests?.find((c) => c.id === a.contestId)
                              ?.name
                          }
                        </td>

                        <td>{a.day}</td>

                        <td>{a.hallId}</td>

                        <td>{jury1?.name}</td>

                        <td>{jury2?.name}</td>

                        <td>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleDelete(a.id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p>No assignments match your search.</p>
        )}
      </div>
    </div>
  );
}

export default AssignmentsPage;
