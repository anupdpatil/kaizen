import { useState } from "react";
import "../styles/admin.css";
import AdminLayout from "../components/AdminLayout.jsx";
import SetupPage from "./admin/ContestPage.jsx";
import JuriesPage from "./admin/JuriesPage.jsx";
import TeamsPage from "./admin/TeamsPage.jsx";
import AssignmentsPage from "./admin/AssignmentsPage.jsx";
import DashboardPage from "./admin/DashboardPage.jsx";
import ActivityPage from "./admin/ActivityPage.jsx";
import ResultsPage from "./admin/ResultsPage.jsx";
import RankingsPage from "./admin/RankingsPage.jsx";
import ExportsPage from "./admin/ExportsPage.jsx";
import DetailedScoresPage from "./admin/DetailedScoresPage.jsx";
import ConfigurationPage from "./admin/ConfigurationPage.jsx";
import { APP_CONFIG } from "../config/appConfig.js";

function AdminDashboard({ user, appState, updateState, onLogout, syncError, appConfig = APP_CONFIG, onConfigChange = () => {} }) {
  const [currentView, setCurrentView] = useState("dashboard");
  const [selectedResultsHall, setSelectedResultsHall] = useState("");

  const openResults = (hallId = "") => {
    setSelectedResultsHall(String(hallId));
    setCurrentView("results");
  };

  const handleViewChange = view => {
    if (view === "results") {
      setSelectedResultsHall("");
    }
    setCurrentView(view);
  };

  const renderView = () => {
    switch (currentView) {
      case "setup":
        return <SetupPage appState={appState} updateState={updateState} />;
      case "configuration":
        return (
          <ConfigurationPage
            appConfig={appConfig}
            onConfigChange={(nextConfig) => {
              onConfigChange(nextConfig);
              setCurrentView("dashboard");
            }}
          />
        );
      case "juries":
        return <JuriesPage appState={appState} updateState={updateState} />;
      case "teams":
        return <TeamsPage appState={appState} updateState={updateState} />;
      case "assignments":
        return (
          <AssignmentsPage appState={appState} updateState={updateState} />
        );
      case "dashboard":
        return <DashboardPage appState={appState} onViewChange={handleViewChange} onHallSelect={openResults} />;
      case "activity":
        return <ActivityPage appState={appState} />;
      case "results":
        return <ResultsPage appState={appState} initialHallFilter={selectedResultsHall} />;
      case "rankings":
        return <RankingsPage appState={appState} />;
      case "detailed-scores":
        return <DetailedScoresPage appState={appState} />;
      case "exports":
        return <ExportsPage appState={appState} />;
      default:
        return <DashboardPage appState={appState} onViewChange={handleViewChange} onHallSelect={openResults} />;
    }
  };

  return (
    <AdminLayout
      user={user}
      currentView={currentView}
      onViewChange={handleViewChange}
      onLogout={onLogout}
      syncError={syncError}
      appConfig={appConfig}
    >
      {renderView()}
    </AdminLayout>
  );
}

export default AdminDashboard;
