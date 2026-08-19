import { useMemo, useState } from "react";
import { calculateTeamScore, getActiveContestId } from "../../utils/helpers.js";
import { CATEGORY_WISE_EVALUATION_CRITERIA } from "../../constants/categoryWiseEvaluationCriteria.js";

function RankingsPage({ appState }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [sortConfig, setSortConfig] = useState({
    key: "score",
    direction: "desc",
  });

  const activeContestId = getActiveContestId(appState);

  // ------------------------------------------------------------
  // Calculate, filter and sort rankings
  // ------------------------------------------------------------
  const rankings = useMemo(() => {
    return (appState.teams || [])
      .filter((t) => !t.isDeleted)
      .filter((t) => !activeContestId || t.contestId === activeContestId)
      .map((t) => {
        const criteria =
          CATEGORY_WISE_EVALUATION_CRITERIA[t.category] ||
          CATEGORY_WISE_EVALUATION_CRITERIA["Allied Case Study"];

        return {
          team: t,
          score: calculateTeamScore(appState.evaluations, t.id, criteria),
        };
      })
      .filter((r) => r.score !== null)
      .filter((r) => {
        if (!searchTerm.trim()) {
          return true;
        }

        const text = [
          r.team.teamName,
          r.team.organisationName || "",
          r.team.category || "",
          String(r.team.hallId),
          String(r.team.assignedDay),
        ]
          .join(" ")
          .toLowerCase();

        return text.includes(searchTerm.trim().toLowerCase());
      })
      .sort((a, b) => {
        const direction = sortConfig.direction === "asc" ? 1 : -1;

        const aValue =
          sortConfig.key === "teamName"
            ? a.team.teamName
            : sortConfig.key === "organisationName"
              ? a.team.organisationName || ""
              : sortConfig.key === "category"
                ? a.team.category || "Other"
                : sortConfig.key === "hallId"
                  ? a.team.hallId
                  : sortConfig.key === "assignedDay"
                    ? a.team.assignedDay
                    : a.score;

        const bValue =
          sortConfig.key === "teamName"
            ? b.team.teamName
            : sortConfig.key === "organisationName"
              ? b.team.organisationName || ""
              : sortConfig.key === "category"
                ? b.team.category || "Other"
                : sortConfig.key === "hallId"
                  ? b.team.hallId
                  : sortConfig.key === "assignedDay"
                    ? b.team.assignedDay
                    : b.score;

        if (typeof aValue === "number" && typeof bValue === "number") {
          return (aValue - bValue) * direction;
        }

        return String(aValue).localeCompare(String(bValue)) * direction;
      });
  }, [
    appState.evaluations,
    appState.teams,
    activeContestId,
    searchTerm,
    sortConfig,
  ]);

  // ------------------------------------------------------------
  // Pagination
  // ------------------------------------------------------------
  const totalPages = Math.max(1, Math.ceil(rankings.length / pageSize));

  const paginatedRankings = rankings.slice(
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

  return (
    <div>
      <h2>Rankings</h2>

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
          <h3>Overall Rankings</h3>
          {/* ==================================================
                PAGINATION
                ================================================== */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1.5rem",
              flexWrap: "wrap",
              marginTop: "1rem",
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
              {rankings.length === 0
                ? "0 of 0"
                : `${(currentPage - 1) * pageSize + 1}–${Math.min(
                    currentPage * pageSize,
                    rankings.length,
                  )} of ${rankings.length}`}
            </span>

            {/* Previous / Next */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
              }}
            >
              {/* Previous */}
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

              {/* Next */}
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
        {/* Search */}
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
            placeholder="Search rankings..."
          />
        </div>

        {rankings.length > 0 ? (
          <>
            {/* ==================================================
                RANKINGS TABLE
                ================================================== */}
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    {/* Rank */}
                    <th>Rank</th>

                    {/* Team */}
                    <th
                      onClick={() => handleSort("teamName")}
                      style={{
                        cursor: "pointer",
                      }}
                    >
                      Team{" "}
                      {sortConfig.key === "teamName"
                        ? sortConfig.direction === "asc"
                          ? "↑"
                          : "↓"
                        : ""}
                    </th>

                    {/* Organisation */}
                    <th
                      onClick={() => handleSort("organisationName")}
                      style={{
                        cursor: "pointer",
                      }}
                    >
                      Organisation{" "}
                      {sortConfig.key === "organisationName"
                        ? sortConfig.direction === "asc"
                          ? "↑"
                          : "↓"
                        : ""}
                    </th>

                    {/* Category */}
                    <th
                      onClick={() => handleSort("category")}
                      style={{
                        cursor: "pointer",
                      }}
                    >
                      Category{" "}
                      {sortConfig.key === "category"
                        ? sortConfig.direction === "asc"
                          ? "↑"
                          : "↓"
                        : ""}
                    </th>

                    {/* Hall */}
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

                    {/* Day */}
                    <th
                      onClick={() => handleSort("assignedDay")}
                      style={{
                        cursor: "pointer",
                      }}
                    >
                      Day{" "}
                      {sortConfig.key === "assignedDay"
                        ? sortConfig.direction === "asc"
                          ? "↑"
                          : "↓"
                        : ""}
                    </th>

                    {/* Weighted Score */}
                    <th
                      onClick={() => handleSort("score")}
                      style={{
                        cursor: "pointer",
                      }}
                    >
                      Weighted Score{" "}
                      {sortConfig.key === "score"
                        ? sortConfig.direction === "asc"
                          ? "↑"
                          : "↓"
                        : ""}
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {paginatedRankings.map((r, idx) => (
                    <tr key={r.team.id}>
                      {/* Rank */}
                      <td
                        style={{
                          fontWeight: "bold",
                          color: "var(--primary)",
                        }}
                      >
                        #{(currentPage - 1) * pageSize + idx + 1}
                        {idx === 0 && " 🥇"}
                        {idx === 1 && " 🥈"}
                        {idx === 2 && " 🥉"}
                      </td>

                      {/* Team */}
                      <td>
                        <strong>{r.team.teamName}</strong>
                      </td>

                      {/* Organisation */}
                      <td>{r.team.organisationName || "N/A"}</td>

                      {/* Category */}
                      <td>{r.team.category || "Other"}</td>

                      {/* Hall */}
                      <td>{r.team.hallId}</td>

                      {/* Day */}
                      <td>{r.team.assignedDay}</td>

                      {/* Score */}
                      <td
                        style={{
                          fontWeight: "bold",
                        }}
                      >
                        {r.score.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p>No completed evaluations yet</p>
        )}
      </div>
    </div>
  );
}

export default RankingsPage;
