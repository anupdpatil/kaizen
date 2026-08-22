import { useState, useEffect, useCallback } from 'react';
import { authAPI, stateAPI } from './utils/api.js';
import LoginPage from './pages/LoginPage.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import JuryDashboard from './pages/JuryDashboard.jsx';
import ToastContainer from './components/ToastContainer.jsx';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [appState, setAppState] = useState({
    contests: [],
    juries: [],
    teams: [],
    hall_assignments: [],
    evaluations: {},
    state: {},
    activity_logs: []
  });
  const [syncError] = useState(null);

  // Initialize app on mount
  useEffect(() => {
    const initApp = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (token && storedUser) {
          // Verify token
          const response = await authAPI.verify(token);
          if (response.data.valid) {
            const user = JSON.parse(storedUser);
            setUser(user);

            // Fetch snapshot
            const snapshotResponse = await stateAPI.getSnapshot();
            setAppState(snapshotResponse.data);
          } else {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setError('Session expired. Please login again.');
          }
        }
      } catch (err) {
        console.error('Init error:', err);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setError('Failed to initialize. Please login again.');
      } finally {
        setLoading(false);
      }
    };

    initApp();
  }, []);

  // Handle login
  const handleLogin = async (username, password, role) => {
    try {
      setError(null);
      const response = await authAPI.login(username, password, role);
      const { token, user: userData } = response.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);

      // Fetch snapshot
      const snapshotResponse = await stateAPI.getSnapshot();
      setAppState(snapshotResponse.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setAppState({
      contests: [],
      juries: [],
      teams: [],
      hall_assignments: [],
      evaluations: {},
      state: {},
      activity_logs: []
    });
  };

  const handlePasswordChanged = (updatedUser) => {
    if (!updatedUser) {
      const nextUser = user ? { ...user, mustChangePassword: false } : null;
      if (nextUser) {
        localStorage.setItem('user', JSON.stringify(nextUser));
        setUser(nextUser);
      }
      return;
    }

    localStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  // Handle state update
  const updateState = useCallback((newState) => {
    // Every mutation is persisted by its dedicated API endpoint before this
    // function runs. Sending a whole snapshot here could overwrite a score
    // just submitted by another jury with an older browser state.
    setAppState((currentState) => ({ ...currentState, ...newState }));
  }, []);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: 'var(--background)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h2>Loading...</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Initializing Kaizen Competition System</p>
        </div>
      </div>
    );
  }

  const content = (() => {
    if (!user) {
      return <LoginPage onLogin={handleLogin} error={error} />;
    }

    if (user.role === 'admin') {
      return (
        <AdminDashboard 
          user={user} 
          appState={appState} 
          updateState={updateState}
          onLogout={handleLogout}
          syncError={syncError}
        />
      );
    }

    if (user.role === 'jury') {
      return (
        <JuryDashboard 
          user={user} 
          appState={appState} 
          updateState={updateState}
          onLogout={handleLogout}
          syncError={syncError}
          forcePasswordChange={Boolean(user.mustChangePassword)}
          onPasswordChanged={handlePasswordChanged}
        />
      );
    }

    return <div>Unknown role</div>;
  })();

  return (
    <div className="app-shell">
      <main className="app-main">{content}</main>
      {/* <footer className="app-footer">
        <div className="app-footer-inner">
          <span className="footer-label">Powered by</span>
          <strong className="footer-brand">InspiringMinds</strong>
          <span className="footer-separator">•</span>
          <span>Developed and maintained by InspiringMinds</span>
        </div>
      </footer>
      <ToastContainer /> */}
    </div>
  );
}

export default App;
