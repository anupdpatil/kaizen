import { useEffect, useMemo, useRef, useState } from "react";
import { juriesAPI } from "../../utils/api.js";
import { showToast } from "../../utils/notify.js";

function JuriesPage({ appState, updateState }) {
  const [newJury, setNewJury] = useState({
    name: "",
    username: "",
    password: "",
  });

  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortConfig, setSortConfig] = useState({
    key: "name",
    direction: "asc",
  });
  const [visiblePasswords, setVisiblePasswords] = useState({});

  const passwordTimersRef = useRef({});

  const filteredJuries = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    const sorted = (appState.juries || [])
      .filter((jury) => {
        if (!term) return true;

        return [jury.name, jury.username, jury.isDeleted ? "deleted" : "active"]
          .join(" ")
          .toLowerCase()
          .includes(term);
      })
      .sort((a, b) => {
        const direction = sortConfig.direction === "asc" ? 1 : -1;

        const aValue =
          sortConfig.key === "status"
            ? a.isDeleted
              ? "deleted"
              : "active"
            : (a[sortConfig.key] ?? "");

        const bValue =
          sortConfig.key === "status"
            ? b.isDeleted
              ? "deleted"
              : "active"
            : (b[sortConfig.key] ?? "");

        return String(aValue).localeCompare(String(bValue)) * direction;
      });

    return sorted;
  }, [appState.juries, searchTerm, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(filteredJuries.length / pageSize));

  const paginatedJuries = filteredJuries.slice(
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

  useEffect(() => {
    return () => {
      Object.values(passwordTimersRef.current).forEach((timer) =>
        clearTimeout(timer),
      );

      passwordTimersRef.current = {};
    };
  }, []);

  const togglePasswordVisibility = (juryId) => {
    const currentlyVisible = Object.keys(visiblePasswords).find(
      (id) => visiblePasswords[id],
    );

    if (currentlyVisible && currentlyVisible !== String(juryId)) {
      setVisiblePasswords((prev) => ({
        ...prev,
        [currentlyVisible]: false,
      }));

      if (passwordTimersRef.current[currentlyVisible]) {
        clearTimeout(passwordTimersRef.current[currentlyVisible]);

        delete passwordTimersRef.current[currentlyVisible];
      }
    }

    if (visiblePasswords[juryId]) {
      setVisiblePasswords((prev) => ({
        ...prev,
        [juryId]: false,
      }));

      if (passwordTimersRef.current[juryId]) {
        clearTimeout(passwordTimersRef.current[juryId]);

        delete passwordTimersRef.current[juryId];
      }

      return;
    }

    setVisiblePasswords((prev) => ({
      ...prev,
      [juryId]: true,
    }));

    if (passwordTimersRef.current[juryId]) {
      clearTimeout(passwordTimersRef.current[juryId]);
    }

    passwordTimersRef.current[juryId] = setTimeout(() => {
      setVisiblePasswords((prev) => ({
        ...prev,
        [juryId]: false,
      }));

      delete passwordTimersRef.current[juryId];
    }, 10000);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await juriesAPI.create(newJury);

      const updated = [...appState.juries, response.data];

      updateState({ juries: updated });

      showToast("Jury created successfully", "success");

      setNewJury({
        name: "",
        username: "",
        password: "",
      });

      setShowForm(false);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create jury");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this jury?")) {
      return;
    }

    try {
      await juriesAPI.delete(id);

      const updated = appState.juries.filter((j) => j.id !== id);

      updateState({ juries: updated });

      showToast("Jury deleted successfully", "success");

      // Keep the current page valid after deletion.
      const newTotalPages = Math.max(1, Math.ceil(updated.length / pageSize));

      if (currentPage > newTotalPages) {
        setCurrentPage(newTotalPages);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete jury");
    }
  };

  const handleToggleSoftDelete = async (jury) => {
    if (
      !jury.isDeleted &&
      !window.confirm(
        `Archive jury "${jury.name}" (${jury.username})? They will no longer be active in assignments.`,
      )
    ) {
      return;
    }

    try {
      await juriesAPI.update(jury.id, {
        isDeleted: !jury.isDeleted,
      });

      const updated = appState.juries.map((j) =>
        j.id === jury.id
          ? {
              ...j,
              isDeleted: !j.isDeleted,
            }
          : j,
      );

      updateState({ juries: updated });

      showToast(
        jury.isDeleted
          ? "Jury restored successfully"
          : "Jury archived successfully",
        "info",
      );
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update jury");
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
        <div className="card mb-3" style={{ marginBottom: 0 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "1rem",
            }}
          >
            <h2>Jury Management</h2>
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
              Add Jury
            </button>
          ) : (
            <form
              onSubmit={handleCreate}
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "1rem",
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

              <div className="form-group">
                <label className="required">Name</label>

                <input
                  type="text"
                  value={newJury.name}
                  onChange={(e) =>
                    setNewJury({
                      ...newJury,
                      name: e.target.value,
                    })
                  }
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label className="required">Username</label>

                <input
                  type="text"
                  value={newJury.username}
                  onChange={(e) =>
                    setNewJury({
                      ...newJury,
                      username: e.target.value,
                    })
                  }
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label className="required">Password</label>

                <input
                  type="password"
                  value={newJury.password}
                  onChange={(e) =>
                    setNewJury({
                      ...newJury,
                      password: e.target.value,
                    })
                  }
                  required
                  disabled={loading}
                />
              </div>

              <div
                style={{
                  gridColumn: "1 / -1",
                  display: "flex",
                  justifyContent: "flex-start",
                  gap:"1rem"
                }}
              >
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? "Creating..." : "Add Jury"}
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
            <h3>Juries</h3>

            {/* New Pagination */}
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
                {filteredJuries.length === 0
                  ? "0 of 0"
                  : `${(currentPage - 1) * pageSize + 1}–${Math.min(
                      currentPage * pageSize,
                      filteredJuries.length,
                    )} of ${filteredJuries.length}`}
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
          {/* ************************ */}
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
              placeholder="Search juries..."
            />
          </div>

          {filteredJuries.length > 0 ? (
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
                        onClick={() => handleSort("username")}
                        style={{
                          cursor: "pointer",
                        }}
                      >
                        Username{" "}
                        {sortConfig.key === "username"
                          ? sortConfig.direction === "asc"
                            ? "↑"
                            : "↓"
                          : ""}
                      </th>

                      <th>Password</th>

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
                    {paginatedJuries.map((jury) => (
                      <tr
                        key={jury.id}
                        style={{
                          opacity: jury.isDeleted ? 0.6 : 1,
                        }}
                      >
                        <td>
                          <strong>{jury.name}</strong>
                        </td>

                        <td>{jury.username}</td>

                        <td>
                          <button
                            type="button"
                            className="btn btn-link btn-sm"
                            onClick={() => togglePasswordVisibility(jury.id)}
                            title={
                              visiblePasswords[jury.id]
                                ? "Hide password"
                                : "Show password"
                            }
                            style={{
                              padding: 0,
                              background: "transparent",
                              border: "none",
                              color: "var(--text-primary)",
                              fontWeight: 600,
                              cursor: "pointer",
                            }}
                          >
                            {visiblePasswords[jury.id] ? jury.password : "****"}
                          </button>
                        </td>

                        <td>{jury.isDeleted ? "🗑️ Deleted" : "✓ Active"}</td>

                        <td>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleToggleSoftDelete(jury)}
                          >
                            {jury.isDeleted ? "Restore" : "Delete"}
                          </button>

                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(jury.id)}
                            style={{
                              marginLeft: "4px",
                            }}
                          >
                            Hard Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p>No juries match your search.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default JuriesPage;
