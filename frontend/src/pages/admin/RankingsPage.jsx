import { useMemo, useState } from 'react';
import { calculateTeamScore, getActiveContestId } from '../../utils/helpers.js';
import { CATEGORY_WISE_EVALUATION_CRITERIA } from '../../constants/categoryWiseEvaluationCriteria.js';

function RankingsPage({ appState }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: 'score', direction: 'desc' });
  const pageSize = 5;

  const activeContestId = getActiveContestId(appState);
  const rankings = useMemo(() => {
    return (appState.teams || [])
      .filter(t => !t.isDeleted)
      .filter(t => !activeContestId || t.contestId === activeContestId)
      .map(t => {
        const criteria = CATEGORY_WISE_EVALUATION_CRITERIA[t.category] || CATEGORY_WISE_EVALUATION_CRITERIA['Allied Case Study'];
        return {
          team: t,
          score: calculateTeamScore(appState.evaluations, t.id, criteria)
        };
      })
      .filter(r => r.score !== null)
      .filter(r => {
        if (!searchTerm.trim()) return true;
        const text = [r.team.teamName, r.team.organisationName || '', r.team.category || '', String(r.team.hallId), String(r.team.assignedDay)].join(' ').toLowerCase();
        return text.includes(searchTerm.trim().toLowerCase());
      })
      .sort((a, b) => {
        const direction = sortConfig.direction === 'asc' ? 1 : -1;
        const aValue = sortConfig.key === 'teamName' ? a.team.teamName : sortConfig.key === 'organisationName' ? (a.team.organisationName || '') : sortConfig.key === 'category' ? (a.team.category || 'Other') : sortConfig.key === 'hallId' ? a.team.hallId : sortConfig.key === 'assignedDay' ? a.team.assignedDay : a.score;
        const bValue = sortConfig.key === 'teamName' ? b.team.teamName : sortConfig.key === 'organisationName' ? (b.team.organisationName || '') : sortConfig.key === 'category' ? (b.team.category || 'Other') : sortConfig.key === 'hallId' ? b.team.hallId : sortConfig.key === 'assignedDay' ? b.team.assignedDay : b.score;

        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return (aValue - bValue) * direction;
        }
        return String(aValue).localeCompare(String(bValue)) * direction;
      });
  }, [appState.evaluations, appState.teams, searchTerm, sortConfig]);

  const totalPages = Math.max(1, Math.ceil(rankings.length / pageSize));
  const paginatedRankings = rankings.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
    setCurrentPage(1);
  };

  return (
    <div>
      <h2>Rankings</h2>
      <div className="card">
        <h3>Overall Rankings</h3>
        <div style={{ marginBottom: '1rem' }}>
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
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th onClick={() => handleSort('teamName')} style={{ cursor: 'pointer' }}>Team {sortConfig.key === 'teamName' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                    <th onClick={() => handleSort('organisationName')} style={{ cursor: 'pointer' }}>Organisation {sortConfig.key === 'organisationName' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                    <th onClick={() => handleSort('category')} style={{ cursor: 'pointer' }}>Category {sortConfig.key === 'category' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                    <th onClick={() => handleSort('hallId')} style={{ cursor: 'pointer' }}>Hall {sortConfig.key === 'hallId' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                    <th onClick={() => handleSort('assignedDay')} style={{ cursor: 'pointer' }}>Day {sortConfig.key === 'assignedDay' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                    <th onClick={() => handleSort('score')} style={{ cursor: 'pointer' }}>Weighted Score {sortConfig.key === 'score' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : ''}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRankings.map((r, idx) => (
                    <tr key={r.team.id}>
                      <td style={{ fontWeight: 'bold', color: 'var(--primary)' }}>
                        #{(currentPage - 1) * pageSize + idx + 1}
                        {idx === 0 && ' 🥇'}
                        {idx === 1 && ' 🥈'}
                        {idx === 2 && ' 🥉'}
                      </td>
                      <td><strong>{r.team.teamName}</strong></td>
                      <td>{r.team.organisationName || 'N/A'}</td>
                      <td>{r.team.category || 'Other'}</td>
                      <td>{r.team.hallId}</td>
                      <td>{r.team.assignedDay}</td>
                      <td style={{ fontWeight: 'bold' }}>{r.score.toFixed(2)}</td>
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
          <p>No completed evaluations yet</p>
        )}
      </div>
    </div>
  );
}

export default RankingsPage;
