import { useState } from 'react';
import '../styles/admin.css';
import AdminLayout from '../components/AdminLayout.jsx';
import SetupPage from './admin/SetupPage.jsx';
import JuriesPage from './admin/JuriesPage.jsx';
import TeamsPage from './admin/TeamsPage.jsx';
import AssignmentsPage from './admin/AssignmentsPage.jsx';
import DashboardPage from './admin/DashboardPage.jsx';
import ActivityPage from './admin/ActivityPage.jsx';
import ResultsPage from './admin/ResultsPage.jsx';
import RankingsPage from './admin/RankingsPage.jsx';
import ExportsPage from './admin/ExportsPage.jsx';

function AdminDashboard({ user, appState, updateState, onLogout, syncError }) {
  const [currentView, setCurrentView] = useState('dashboard');

  const renderView = () => {
    switch (currentView) {
      case 'setup':
        return <SetupPage appState={appState} updateState={updateState} />;
      case 'juries':
        return <JuriesPage appState={appState} updateState={updateState} />;
      case 'teams':
        return <TeamsPage appState={appState} updateState={updateState} />;
      case 'assignments':
        return <AssignmentsPage appState={appState} updateState={updateState} />;
      case 'dashboard':
        return <DashboardPage appState={appState} />;
      case 'activity':
        return <ActivityPage appState={appState} />;
      case 'results':
        return <ResultsPage appState={appState} />;
      case 'rankings':
        return <RankingsPage appState={appState} />;
      case 'exports':
        return <ExportsPage appState={appState} />;
      default:
        return <DashboardPage appState={appState} />;
    }
  };

  return (
    <AdminLayout
      user={user}
      currentView={currentView}
      onViewChange={setCurrentView}
      onLogout={onLogout}
      syncError={syncError}
    >
      {renderView()}
    </AdminLayout>
  );
}

export default AdminDashboard;
