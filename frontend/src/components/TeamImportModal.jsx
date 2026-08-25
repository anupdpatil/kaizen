import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { teamsAPI } from "../utils/api.js";
import { showToast } from "../utils/notify.js";
import { getHallLabel } from "../utils/helpers.js";

const EXPECTED_HEADERS = [
  "Contest",
  "Team Name",
  "Organization Name",
  "Category",
  "Day",
  "Hall No",
];

function normalizeHeader(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function parseNumber(value) {
  if (value === null || value === undefined || value === "") {
    return NaN;
  }

  const number = Number(value);

  return Number.isInteger(number) ? number : NaN;
}

function parseWorkbook(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);

        const workbook = XLSX.read(data, {
          type: "array",
          cellDates: true,
        });

        const sheetName =
          workbook.SheetNames.find(
            (name) =>
              normalizeHeader(name) === normalizeHeader("Registration List"),
          ) || workbook.SheetNames[0];

        if (!sheetName) {
          throw new Error("No worksheet found in the file.");
        }

        const worksheet = workbook.Sheets[sheetName];

        const rawRows = XLSX.utils.sheet_to_json(worksheet, {
          defval: "",
          raw: false,
        });

        if (!rawRows.length) {
          throw new Error("The selected worksheet does not contain any data.");
        }

        const originalHeaders =
          XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: "",
          })[0] || [];

        const normalizedHeaders = originalHeaders.map(normalizeHeader);

        const missingHeaders = EXPECTED_HEADERS.filter(
          (header) => !normalizedHeaders.includes(normalizeHeader(header)),
        );

        if (missingHeaders.length) {
          throw new Error(`Missing columns: ${missingHeaders.join(", ")}`);
        }

        const rows = rawRows.map((rawRow, index) => ({
          rowNumber: index + 2,

          contestCode: String(rawRow["Contest"] || "").trim(),

          teamName: String(rawRow["Team Name"] || "").trim(),

          organisationName: String(rawRow["Organization Name"] || "").trim(),

          category: String(rawRow["Category"] || "").trim(),

          assignedDay: parseNumber(rawRow["Day"]),

          hallId: parseNumber(rawRow["Hall No"]),
        }));

        resolve({
          sheetName,
          rows,
        });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error("Unable to read the selected file."));
    };

    reader.readAsArrayBuffer(file);
  });
}

function TeamImportModal({
  contests = [],
  categories = [],
  onImported,
  onClose,
}) {
  const fileInputRef = useRef(null);

  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState([]);
  const [sheetName, setSheetName] = useState("");
  const [fileError, setFileError] = useState("");
  const [importing, setImporting] = useState(false);

//   const contestMap = useMemo(() => {
//     const map = new Map();

//     contests.forEach((contest) => {
//       map.set(String(contest.id).toLowerCase(), contest);

//       if (contest.code) {
//         map.set(String(contest.code).toLowerCase(), contest);
//       }

//       if (contest.contestCode) {
//         map.set(String(contest.contestCode).toLowerCase(), contest);
//       }

//       if (contest.name) {
//         map.set(String(contest.name).toLowerCase(), contest);
//       }
//     });

//     return map;
//   }, [contests]);

  //   const validatedRows = useMemo(() => {
  //     return rows.map(row => {
  //       const errors = [];

  //       const contest =
  //         contestMap.get(
  //           row.contestCode.toLowerCase()
  //         );
  const validatedRows = useMemo(() => {
    return rows.map((row) => {
      const errors = [];

      const contest = contests.find(
        (item) =>
          String(item.code || "")
            .trim()
            .toLowerCase() ===
          String(row.contestCode || "")
            .trim()
            .toLowerCase(),
      );

      if (!row.contestCode) {
        errors.push("Contest is required");
      } else if (!contest) {
        errors.push(`Contest "${row.contestCode}" not found`);
      }

      if (!row.teamName) {
        errors.push("Team Name is required");
      }

      if (!row.organisationName) {
        errors.push("Organization Name is required");
      }

      if (!row.category) {
        errors.push("Category is required");
      } else if (categories.length && !categories.includes(row.category)) {
        errors.push(`Invalid category "${row.category}"`);
      }

      if (!Number.isInteger(row.assignedDay)) {
        errors.push("Day must be a number");
      } else if (
        contest &&
        (row.assignedDay < 1 || row.assignedDay > contest.days)
      ) {
        errors.push(`Day must be between 1 and ${contest.days}`);
      }

      if (!Number.isInteger(row.hallId)) {
        errors.push("Hall No must be a number");
      } else if (
        contest &&
        (row.hallId < 1 || row.hallId > contest.hallCount)
      ) {
        errors.push(`Hall must be between 1 and ${contest.hallCount}`);
      }

      return {
        ...row,
        contest,
        errors,
      };
    });
  }, [rows, contests, categories]);

  const validRows = validatedRows.filter((row) => row.errors.length === 0);

  const invalidRows = validatedRows.filter((row) => row.errors.length > 0);

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setFileError("");
    setRows([]);
    setFileName(file.name);

    try {
      const result = await parseWorkbook(file);

      setSheetName(result.sheetName);
      setRows(result.rows);
    } catch (error) {
      setFileError(error.message || "Unable to process file.");
    }
  };

  const handleImport = async () => {
    if (!validRows.length) {
      return;
    }

    if (invalidRows.length) {
      setFileError("Please fix all validation errors before importing.");
      return;
    }

    /*
     * Grouping by contest allows the same Excel file
     * to contain multiple contests.
     */
    const groupedByContest = new Map();

    validRows.forEach((row) => {
      const contestId = row.contest.id;

      if (!groupedByContest.has(contestId)) {
        groupedByContest.set(contestId, {
          contestId,
          teams: [],
        });
      }

      groupedByContest.get(contestId).teams.push({
        teamName: row.teamName,
        organisationName: row.organisationName,
        category: row.category,
        assignedDay: row.assignedDay,
        hallId: row.hallId,
      });
    });

    setImporting(true);
    setFileError("");

    try {
      const importedTeams = [];

      for (const payload of groupedByContest.values()) {
        const response = await teamsAPI.bulkCreate(payload);

        if (response.data?.teams) {
          importedTeams.push(...response.data.teams);
        }
      }

      onImported(importedTeams);

      showToast(
        `${importedTeams.length} teams imported successfully`,
        "success",
      );

      onClose();
    } catch (error) {
      const responseData = error.response?.data;

      setFileError(responseData?.error || "Failed to import teams.");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="card">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <div>
          <h3 style={{ margin: 0 }}>Import Teams</h3>

          <small>Upload the Registration List Excel file or CSV.</small>
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={onClose}
          disabled={importing}
        >
          Cancel
        </button>
      </div>

      <div className="form-group">
        <label className="required">Excel / CSV File</label>

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileChange}
          disabled={importing}
        />

        {fileName && (
          <small>
            File: <strong>{fileName}</strong>
          </small>
        )}
      </div>

      {fileError && (
        <div className="alert alert-error" style={{ marginTop: "1rem" }}>
          {fileError}
        </div>
      )}

      {sheetName && (
        <div
          style={{
            marginTop: "1rem",
            marginBottom: "1rem",
          }}
        >
          <strong>Sheet:</strong> {sheetName}
        </div>
      )}

      {rows.length > 0 && (
        <>
          <div
            style={{
              display: "flex",
              gap: "1rem",
              marginBottom: "1rem",
              flexWrap: "wrap",
            }}
          >
            <strong>Total: {validatedRows.length}</strong>

            <strong>Valid: {validRows.length}</strong>

            <strong>Errors: {invalidRows.length}</strong>
          </div>

          <div
            className="table-wrapper"
            style={{
              maxHeight: "500px",
              overflow: "auto",
            }}
          >
            <table>
              <thead>
                <tr>
                  <th>Row</th>
                  <th>Contest</th>
                  <th>Team</th>
                  <th>Organisation</th>
                  <th>Category</th>
                  <th>Day</th>
                  <th>Hall</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {validatedRows.map((row) => (
                  <tr key={row.rowNumber}>
                    <td>{row.rowNumber}</td>

                    <td>{row.contestCode}</td>

                    <td>
                      <strong>{row.teamName}</strong>
                    </td>

                    <td>{row.organisationName}</td>

                    <td>{row.category}</td>

                    <td>{row.assignedDay}</td>

                    <td>{getHallLabel({ contests }, row.contest?.id, row.hallId)}</td>

                    <td>
                      {row.errors.length === 0 ? (
                        <span>✓ Valid</span>
                      ) : (
                        <span>❌ {row.errors.join(", ")}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: "0.75rem",
              marginTop: "1rem",
            }}
          >
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setRows([]);
                setFileName("");
                setFileError("");

                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                }
              }}
              disabled={importing}
            >
              Clear
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={handleImport}
              disabled={
                importing || !validRows.length || invalidRows.length > 0
              }
            >
              {importing ? "Importing..." : `Import ${validRows.length} Teams`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default TeamImportModal;
