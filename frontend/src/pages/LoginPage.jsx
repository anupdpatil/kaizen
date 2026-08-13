import { useState } from 'react';
import '../styles/login.css';

function LoginPage({ onLogin, error }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('admin');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onLogin(username, password, role);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-content">
        <div className="login-header">
          <h1>Kaizen</h1>
          <p>Competition Management System</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="alert alert-error mb-3">{error}</div>}

          <div className="role-toggle">
            <button
              type="button"
              className={`role-btn ${role === 'admin' ? 'active' : ''}`}
              onClick={() => setRole('admin')}
              disabled={loading}
            >
              Admin
            </button>
            <button
              type="button"
              className={`role-btn ${role === 'jury' ? 'active' : ''}`}
              onClick={() => setRole('jury')}
              disabled={loading}
            >
              Jury
            </button>
          </div>

          <div className="form-group">
            <label className="required">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={role === 'admin' ? 'admin' : 'jury_h1_1'}
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="required">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={role === 'admin' ? 'admin123' : 'password'}
              required
              disabled={loading}
            />
          </div>

          {role === 'admin' && (
            <div className="login-hint">
              <strong>Demo Admin:</strong>
              <p>Username: admin</p>
              <p>Password: admin123</p>
            </div>
          )}

          {role === 'jury' && (
            <div className="login-hint">
              <strong>Demo Jury:</strong>
              <p>Check generated credentials</p>
              <p>Format: jury_h{'{hall}'}_{'{1-2}'}</p>
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary btn-lg w-full"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;
