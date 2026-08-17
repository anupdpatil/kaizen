import { useMemo, useState } from 'react';
import { getActiveContestId } from '../../utils/helpers.js';

function ResultsPage({ appState }) {
  const [hallFilter, setHallFilter] = useState('');
  const [dayFilter, setDayFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: 'average', direction: 'desc' });
  const pageSize = 5;

  const activeContestId = getActiveContestId(appState);
  const results = useMemo(() => {
    return (appState.teams || [])
      .filter(t => !t.isDeleted)
      .filter(t => !activeContestId || t.contestId === activeContestId)
      .filter(t => !hallFilter || t.hallId === parseInt(hallFilter))
      .filter(t => !dayFilter || t.assignedDay === parseInt(dayFilter))
      .filter(t => {
        if (!searchTerm.trim()) return true;
        const text = [t.teamName, t.organisationName || '', t.category || '', String(t.hallId), String(t.assignedDay)].join(' ').toLowerCase();
        return text.includes(searchTerm.trim().toLowerCase());
      })
      .map(team => {
        const teamEvals = appState.evaluations[team.id] || {};
        const evals = Object.entries(teamEvals);
        const scores = evals.map(([, e]) => e.total);
        const avg = scores.length >= 2 ? ((scores[0] + scores[1]) / 2).toFixed(2) : '-';
        const jury = evals.map(([jid, e]) => {
          const juryName = appState.juries?.find(j => j.id === jid)?.name || 'Unknown';
          return { juryName, score: e.total };
        });

        return {
          team,
          jury1: jury[0]?.juryName || '-',
          score1: jury[0]?.score || '-',
          jury2: jury[1]?.juryName || '-',
          score2: jury[1]?.score || '-',
          average: avg,
          status: evals.length >= 2 ? '✓ Complete' : '⏳ Pending',
          averageValue: Number(avg) || 0,
          assignedDay: team.assignedDay,
          hallId: team.hallId,
          teamName: team.teamName,
          organisationName: team.organisationName || '',
          category: team.category || 'Other'
        };
      })
      .sort((a, b) => {
        const direction = sortConfig.direction === 'asc' ? 1 : -1;
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return (aValue - bValue) * direction;
        }
        return String(aValue).localeCompare(String(bValue)) * direction;
      });
  }, [appState.evaluations, appState.juries, appState.teams, dayFilter, hallFilter, searchTerm, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(results.length / pageSize));
  const paginatedResults = results.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
    setCurrentPage(1);
  };

  return (
    <div>
      <h2>Results</h2>
      <div className="card">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--spacing-md)' }}>
          <div>
            <label>Filter by Hall</label>
            <input
              type="number"
              value={hallFilter}
              onChange={(e) => setHallFilter(e.target.value)}
              placeholder="All"
            />
          </div>
          <div>
            <label>Filter by Day</label>
            <input
              type="number"
              value={dayFilter}
              onChange={(e) => setDayFilter(e.target.value)}
              placeholder="All"
            />
          </div>
          <div>
            <label>Search</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search results..."
            />
          </div>
        </div>
      </div>
      <br />
      <div className="card">
        {results.length > 0 ? (
          <>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th onClick={() => handleSort('assignedDay')} style={{ cursor: 'pointer' }}>Day {sortConfig.key === 'assignedDay' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                    <th onClick={() => handleSort('hallId')} style={{ cursor: 'pointer' }}>Hall {sortConfig.key === 'hallId' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                    <th onClick={() => handleSort('teamName')} style={{ cursor: 'pointer' }}>Team {sortConfig.key === 'teamName' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                    <th onClick={() => handleSort('organisationName')} style={{ cursor: 'pointer' }}>Organisation {sortConfig.key === 'organisationName' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                    <th onClick={() => handleSort('category')} style={{ cursor: 'pointer' }}>Category {sortConfig.key === 'category' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                    <th>Jury 1</th>
                    <th>Score 1</th>
                    <th>Jury 2</th>
                    <th>Score 2</th>
                    <th onClick={() => handleSort('averageValue')} style={{ cursor: 'pointer' }}>Average {sortConfig.key === 'averageValue' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                    <th onClick={() => handleSort('status')} style={{ cursor: 'pointer' }}>Status {sortConfig.key === 'status' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedResults.map(r => (
                    <tr key={r.team.id}>
                      <td>{r.team.assignedDay}</td>
                      <td>{r.team.hallId}</td>
                      <td><strong>{r.team.teamName}</strong></td>
                      <td>{r.team.organisationName || 'N/A'}</td>
                      <td>{r.team.category || 'Other'}</td>
                      <td>{r.jury1}</td>
                      <td>{r.score1}</td>
                      <td>{r.jury2}</td>
                      <td>{r.score2}</td>
                      <td><strong>{r.average}</strong></td>
                      <td>{r.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', gap: '1rem' }}>
              <button className="btn btn-secondary btn-sm" disabled={currentPage === 1} onClick={() => setCurrentPage(page => Math.max(1, page - 1))}>Prev</button>
              <span>Page {currentPage} of {totalPages}</span>
              <button className="btn btn-secondary btn-sm" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(page => Math.min(totalPages, page + 1))}>Next</button>
            </div>
          </>
        ) : (
          <p>No results match your filters.</p>
        )}
      </div>
    </div>
  );
}

export default ResultsPage;
