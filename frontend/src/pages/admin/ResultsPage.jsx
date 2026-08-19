import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { getActiveContestId } from "../../utils/helpers.js";

function ResultsPage({ appState }) {
  const [hallFilter, setHallFilter] = useState("");
  const [dayFilter, setDayFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [sortConfig, setSortConfig] = useState({
    key: "average",
    direction: "desc",
  });

  const activeContestId = getActiveContestId(appState);

  // ------------------------------------------------------------
  // Filter, calculate and sort results
  // ------------------------------------------------------------
  const results = useMemo(() => {
    return (appState.teams || [])
      .filter((t) => !t.isDeleted)

      .filter(
        (t) =>
          !activeContestId ||
          t.contestId === activeContestId
      )

      .filter(
        (t) =>
          !hallFilter ||
          t.hallId === parseInt(hallFilter)
      )

      .filter(
        (t) =>
          !dayFilter ||
          t.assignedDay === parseInt(dayFilter)
      )

      .filter((t) => {
        if (!categoryFilter.trim()) return true;

        return String(t.category || "")
          .trim()
          .toLowerCase()
          .includes(
            categoryFilter
              .trim()
              .toLowerCase()
          );
      })

      .filter((t) => {
        if (!searchTerm.trim()) return true;

        const text = [
          t.teamName,
          t.organisationName || "",
          t.category || "",
          String(t.hallId),
          String(t.assignedDay),
        ]
          .join(" ")
          .toLowerCase();

        return text.includes(
          searchTerm.trim().toLowerCase()
        );
      })

      .map((team) => {
        const teamEvals =
          appState.evaluations[team.id] || {};

        const evals =
          Object.entries(teamEvals);

        const scores = evals.map(
          ([, e]) => e.total
        );

        const avg =
          scores.length >= 2
            ? (
                (scores[0] + scores[1]) /
                2
              ).toFixed(2)
            : "-";

        const jury = evals.map(
          ([jid, e]) => {
            const juryName =
              appState.juries?.find(
                (j) => j.id === jid
              )?.name || "Unknown";

            return {
              juryName,
              score: e.total,
            };
          }
        );

        return {
          team,

          jury1:
            jury[0]?.juryName || "-",

          score1:
            jury[0]?.score ?? "-",

          jury2:
            jury[1]?.juryName || "-",

          score2:
            jury[1]?.score ?? "-",

          average: avg,

          status:
            evals.length >= 2
              ? "✓ Complete"
              : "⏳ Pending",

          averageValue:
            Number(avg) || 0,

          assignedDay:
            team.assignedDay,

          hallId:
            team.hallId,

          teamName:
            team.teamName,

          organisationName:
            team.organisationName || "",

          category:
            team.category || "Other",
        };
      })

      .sort((a, b) => {
        const direction =
          sortConfig.direction === "asc"
            ? 1
            : -1;

        const aValue =
          a[sortConfig.key];

        const bValue =
          b[sortConfig.key];

        if (
          typeof aValue === "number" &&
          typeof bValue === "number"
        ) {
          return (
            (aValue - bValue) *
            direction
          );
        }

        return (
          String(aValue).localeCompare(
            String(bValue)
          ) * direction
        );
      });
  }, [
    appState.evaluations,
    appState.juries,
    appState.teams,
    activeContestId,
    dayFilter,
    categoryFilter,
    hallFilter,
    searchTerm,
    sortConfig,
  ]);

  // ------------------------------------------------------------
  // Pagination
  // ------------------------------------------------------------
  const totalPages = Math.max(
    1,
    Math.ceil(
      results.length / pageSize
    )
  );

  const paginatedResults =
    results.slice(
      (currentPage - 1) * pageSize,
      currentPage * pageSize
    );

  // ------------------------------------------------------------
  // Sorting
  // ------------------------------------------------------------
  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,

      direction:
        prev.key === key &&
        prev.direction === "asc"
          ? "desc"
          : "asc",
    }));

    setCurrentPage(1);
  };

  // ------------------------------------------------------------
  // Download filtered results to Excel
  //
  // IMPORTANT:
  // Uses "results", NOT "paginatedResults".
  // Therefore all filtered records are exported.
  // ------------------------------------------------------------
  const handleDownloadExcel = () => {
    if (results.length === 0) {
      return;
    }

    const excelData = results.map(
      (r, index) => ({
        "Sr. No.": index + 1,
        Hall: r.hallId,
        Team: r.teamName,
        Organisation:
          r.organisationName || "N/A",
        Category:
          r.category || "Other",
        "Jury 1": r.jury1,
        "Score 1": r.score1,
        "Jury 2": r.jury2,
        "Score 2": r.score2,
        Average: r.average,
        Status: r.status,
      })
    );

    const worksheet =
      XLSX.utils.json_to_sheet(
        excelData
      );

    // Set useful column widths
    worksheet["!cols"] = [
      { wch: 10 }, // Sr. No.
      { wch: 10 }, // Hall
      { wch: 25 }, // Team
      { wch: 30 }, // Organisation
      { wch: 25 }, // Category
      { wch: 25 }, // Jury 1
      { wch: 12 }, // Score 1
      { wch: 25 }, // Jury 2
      { wch: 12 }, // Score 2
      { wch: 12 }, // Average
      { wch: 18 }, // Status
    ];

    const workbook =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      "Results"
    );

    XLSX.writeFile(
      workbook,
      "Results.xlsx"
    );
  };

  return (
    <div>
      {/* ======================================================
          FILTERS
          ====================================================== */}
      <div className="card">
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "1fr 1fr",
            gap: "var(--spacing-md)",
            alignItems: "end",
          }}
        >
          {/* Left 50% - Filters */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "1fr 1fr 1fr",
              gap: "var(--spacing-md)",
            }}
          >
            {/* Hall */}
            <div>
              <label>
                Filter by Hall
              </label>

              <input
                type="number"
                value={hallFilter}
                onChange={(e) => {
                  setHallFilter(
                    e.target.value
                  );
                  setCurrentPage(1);
                }}
                placeholder="All"
              />
            </div>

            {/* Category */}
            <div>
              <label>
                Filter by Category
              </label>

              <input
                type="text"
                value={
                  categoryFilter
                }
                onChange={(e) => {
                  setCategoryFilter(
                    e.target.value
                  );
                  setCurrentPage(1);
                }}
                placeholder="All"
              />
            </div>

            {/* Day */}
            <div>
              <label>
                Filter by Day
              </label>

              <input
                type="number"
                value={dayFilter}
                onChange={(e) => {
                  setDayFilter(
                    e.target.value
                  );
                  setCurrentPage(1);
                }}
                placeholder="All"
              />
            </div>
          </div>

          {/* Right 50% - Search */}
          <div>
            <label>Search</label>

            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(
                  e.target.value
                );
                setCurrentPage(1);
              }}
              placeholder="Search results..."
            />
          </div>
        </div>
      </div>

      <br />

      {/* ======================================================
          RESULTS TABLE
          ====================================================== */}
      <div className="card">
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          {/* Results heading + Download */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
            }}
          >
            <h3
              style={{
                margin: 0,
              }}
            >
              Results
            </h3>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={
                handleDownloadExcel
              }
              disabled={
                results.length === 0
              }
            >
              Download Excel
            </button>
          </div>

          {/* ==================================================
              PAGINATION
              ================================================== */}
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
                  whiteSpace:
                    "nowrap",
                }}
              >
                Rows per page:
              </label>

              <select
                id="pageSize"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(
                    Number(
                      e.target.value
                    )
                  );
                  setCurrentPage(1);
                }}
                style={{
                  minWidth: "60px",
                  width: "60px",
                  padding:
                    "0.35rem 0.5rem",
                }}
              >
                <option value={10}>
                  10
                </option>

                <option value={50}>
                  50
                </option>

                <option value={100}>
                  100
                </option>
              </select>
            </div>

            {/* Record range */}
            <span
              style={{
                whiteSpace:
                  "nowrap",
              }}
            >
              {results.length === 0
                ? "0 of 0"
                : `${(currentPage - 1) * pageSize + 1}–${Math.min(
                    currentPage *
                      pageSize,
                    results.length
                  )} of ${
                    results.length
                  }`}
            </span>

            {/* Previous / Next */}
            <div
              style={{
                display: "flex",
                alignItems:
                  "center",
                gap: "1rem",
              }}
            >
              {/* Previous */}
              <button
                type="button"
                aria-label="Previous page"
                disabled={
                  currentPage === 1
                }
                onClick={() =>
                  setCurrentPage(
                    (page) =>
                      Math.max(
                        1,
                        page - 1
                      )
                  )
                }
                style={{
                  border: "none",
                  background:
                    "transparent",
                  padding: "0.25rem",
                  fontSize: "2rem",
                  lineHeight: 1,
                  cursor:
                    currentPage ===
                    1
                      ? "default"
                      : "pointer",
                  opacity:
                    currentPage ===
                    1
                      ? 0.35
                      : 1,
                }}
              >
                &#8249;
              </button>

              {/* Next */}
              <button
                type="button"
                aria-label="Next page"
                disabled={
                  currentPage >=
                  totalPages
                }
                onClick={() =>
                  setCurrentPage(
                    (page) =>
                      Math.min(
                        totalPages,
                        page + 1
                      )
                  )
                }
                style={{
                  border: "none",
                  background:
                    "transparent",
                  padding: "0.25rem",
                  fontSize: "2rem",
                  lineHeight: 1,
                  cursor:
                    currentPage >=
                    totalPages
                      ? "default"
                      : "pointer",
                  opacity:
                    currentPage >=
                    totalPages
                      ? 0.35
                      : 1,
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
          {results.length > 0 ? (
            <>
              {/* ==================================================
                  TABLE
                  ================================================== */}
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      {/* Day intentionally hidden */}

                      {/* Hall */}
                      <th
                        onClick={() =>
                          handleSort(
                            "hallId"
                          )
                        }
                        style={{
                          cursor:
                            "pointer",
                        }}
                      >
                        Hall{" "}
                        {sortConfig.key ===
                        "hallId"
                          ? sortConfig.direction ===
                            "asc"
                            ? "↑"
                            : "↓"
                          : ""}
                      </th>

                      {/* Team */}
                      <th
                        onClick={() =>
                          handleSort(
                            "teamName"
                          )
                        }
                        style={{
                          cursor:
                            "pointer",
                        }}
                      >
                        Team{" "}
                        {sortConfig.key ===
                        "teamName"
                          ? sortConfig.direction ===
                            "asc"
                            ? "↑"
                            : "↓"
                          : ""}
                      </th>

                      {/* Organisation */}
                      <th
                        onClick={() =>
                          handleSort(
                            "organisationName"
                          )
                        }
                        style={{
                          cursor:
                            "pointer",
                        }}
                      >
                        Organisation{" "}
                        {sortConfig.key ===
                        "organisationName"
                          ? sortConfig.direction ===
                            "asc"
                            ? "↑"
                            : "↓"
                          : ""}
                      </th>

                      {/* Category */}
                      <th
                        onClick={() =>
                          handleSort(
                            "category"
                          )
                        }
                        style={{
                          cursor:
                            "pointer",
                        }}
                      >
                        Category{" "}
                        {sortConfig.key ===
                        "category"
                          ? sortConfig.direction ===
                            "asc"
                            ? "↑"
                            : "↓"
                          : ""}
                      </th>

                      {/* Jury 1 */}
                      <th>Jury 1</th>

                      {/* Score 1 */}
                      <th>Score 1</th>

                      {/* Jury 2 */}
                      <th>Jury 2</th>

                      {/* Score 2 */}
                      <th>Score 2</th>

                      {/* Average */}
                      <th
                        onClick={() =>
                          handleSort(
                            "averageValue"
                          )
                        }
                        style={{
                          cursor:
                            "pointer",
                        }}
                      >
                        Average{" "}
                        {sortConfig.key ===
                        "averageValue"
                          ? sortConfig.direction ===
                            "asc"
                            ? "↑"
                            : "↓"
                          : ""}
                      </th>

                      {/* Status */}
                      <th
                        onClick={() =>
                          handleSort(
                            "status"
                          )
                        }
                        style={{
                          cursor:
                            "pointer",
                        }}
                      >
                        Status{" "}
                        {sortConfig.key ===
                        "status"
                          ? sortConfig.direction ===
                            "asc"
                            ? "↑"
                            : "↓"
                          : ""}
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {paginatedResults.map(
                      (r) => (
                        <tr
                          key={
                            r.team.id
                          }
                        >
                          {/* Hall */}
                          <td>
                            {
                              r.team
                                .hallId
                            }
                          </td>

                          {/* Team */}
                          <td>
                            <strong>
                              {
                                r.team
                                  .teamName
                              }
                            </strong>
                          </td>

                          {/* Organisation */}
                          <td>
                            {r.team
                              .organisationName ||
                              "N/A"}
                          </td>

                          {/* Category */}
                          <td>
                            {r.team
                              .category ||
                              "Other"}
                          </td>

                          {/* Jury 1 */}
                          <td>
                            {r.jury1}
                          </td>

                          {/* Score 1 */}
                          <td>
                            {r.score1}
                          </td>

                          {/* Jury 2 */}
                          <td>
                            {r.jury2}
                          </td>

                          {/* Score 2 */}
                          <td>
                            {r.score2}
                          </td>

                          {/* Average */}
                          <td>
                            <strong>
                              {
                                r.average
                              }
                            </strong>
                          </td>

                          {/* Status */}
                          <td>
                            {r.status}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <p>
              No results match your
              filters.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default ResultsPage;