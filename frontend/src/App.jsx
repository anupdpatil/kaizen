import { useState, useEffect, useCallback } from "react";
import { authAPI, stateAPI } from "./utils/api.js";
import LoginPage from "./pages/LoginPage.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import JuryDashboard from "./pages/JuryDashboard.jsx";
import PublicPortal from "./pages/PublicPortal.jsx";
import ContestLanding from "./pages/ContestLanding.jsx";
import ContactPage from "./pages/ContactPage.jsx";

const createInitialAppState = () => ({
  contests: [],
  juries: [],
  teams: [],
  hall_assignments: [],
  evaluations: {},
  state: {},
  activity_logs: [],
});

const getTokenExpiration = (token) => {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;

    const base64Payload = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decodedPayload = JSON.parse(
      atob(
        base64Payload.padEnd(
          base64Payload.length + ((4 - (base64Payload.length % 4)) % 4),
          "=",
        ),
      ),
    );
    return Number.isFinite(decodedPayload.exp)
      ? decodedPayload.exp * 1000
      : null;
  } catch {
    return null;
  }
};

function App() {
  const [pathname, setPathname] = useState(() => window.location.pathname);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [appState, setAppState] = useState(createInitialAppState);
  const [syncError] = useState(null);

  useEffect(() => {
    const updatePathname = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", updatePathname);
    return () => window.removeEventListener("popstate", updatePathname);
  }, []);

  const isContestWorkspace =
    pathname === "/contest/login" ||
    pathname === "/contest/admin" ||
    pathname === "/contest/jury";

  const clearLocalSession = useCallback((message = null) => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setAppState(createInitialAppState());
    if (message) setError(message);
  }, []);

  // The public portal intentionally requires no application-data request.
  useEffect(() => {
    if (!isContestWorkspace) {
      setLoading(false);
      return undefined;
    }
    const initApp = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        const storedUser = localStorage.getItem("user");

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
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            setError("Session expired. Please login again.");
          }
        }
      } catch (err) {
        console.error("Init error:", err);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setError("Failed to initialize. Please login again.");
      } finally {
        setLoading(false);
      }
    };

    initApp();
  }, [isContestWorkspace]);

  useEffect(() => {
    if (!user) return undefined;

    const expireSessionIfNeeded = () => {
      const expiration = getTokenExpiration(
        localStorage.getItem("token") || "",
      );
      if (!expiration || expiration <= Date.now()) {
        clearLocalSession("Session expired. Please login again.");
        return true;
      }
      return false;
    };

    if (expireSessionIfNeeded()) return undefined;

    const expiration = getTokenExpiration(localStorage.getItem("token") || "");
    const timeoutId = window.setTimeout(
      () => clearLocalSession("Session expired. Please login again."),
      Math.max(0, expiration - Date.now()),
    );
    const handleFocus = () => expireSessionIfNeeded();

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);
    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, [clearLocalSession, user]);

  // Handle login
  const handleLogin = async (username, password, role) => {
    try {
      setError(null);
      const response = await authAPI.login(username, password, role);
      const { token, user: userData } = response.data;

      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(userData));
      setUser(userData);

      window.history.replaceState(
        {},
        "",
        userData.role === "admin" ? "/contest/admin" : "/contest/jury",
      );
      setPathname(window.location.pathname);

      // Fetch snapshot
      const snapshotResponse = await stateAPI.getSnapshot();
      setAppState(snapshotResponse.data);
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
    }
  };

  // Handle logout
  const handleLogout = async () => {
    // Tell the server first so this account can sign in from another device.
    // Local cleanup must still happen if the token has already expired.
    try {
      await authAPI.logout();
    } catch (err) {
      console.warn("Server logout failed:", err);
    }

    clearLocalSession();
    window.history.replaceState({}, "", "/contest/login");
    setPathname(window.location.pathname);
  };

  const handlePasswordChanged = (updatedUser) => {
    if (!updatedUser) {
      const nextUser = user ? { ...user, mustChangePassword: false } : null;
      if (nextUser) {
        localStorage.setItem("user", JSON.stringify(nextUser));
        setUser(nextUser);
      }
      return;
    }

    localStorage.setItem("user", JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  // Handle state update
  const updateState = useCallback((newState) => {
    // Every mutation is persisted by its dedicated API endpoint before this
    // function runs. Sending a whole snapshot here could overwrite a score
    // just submitted by another jury with an older browser state.
    setAppState((currentState) => ({ ...currentState, ...newState }));
  }, []);

  if (!isContestWorkspace) {
    if (pathname === "/contact" || pathname === "/contact/") {
      return <ContactPage />;
    }
    return pathname === "/contest" || pathname === "/contest/"
      ? <ContestLanding />
      : <PublicPortal />;
  }

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          backgroundColor: "var(--background)",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <h2>Loading...</h2>
          <p style={{ color: "var(--text-secondary)" }}>
            Initializing Kaizen Competition System
          </p>
        </div>
      </div>
    );
  }

  const content = (() => {
    if (!user) {
      return <LoginPage onLogin={handleLogin} error={error} />;
    }

    if (user.role === "admin") {
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

    if (user.role === "jury") {
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
