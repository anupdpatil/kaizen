import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';
import { adminMiddleware, authMiddleware, createToken, isJuryAccessLocked, isTokenSessionCurrent, verifyToken } from '../middleware/auth.js';
import { logActivity } from '../utils/activity.js';

const router = express.Router();

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { username, password, role } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    let user = null;
    let accountRecord = null;
    const state = await db.getTable('state');

    if (role === 'admin') {
      const admins = await db.getTable('admins');
      const admin = admins.find((item) => item.username === username && !item.isDeleted);
      if (admin && admin.password === password) {
        accountRecord = admin;
        user = {
          id: admin.id,
          username: admin.username,
          role: 'admin',
          access: admin.access || 'full'
        };
      }
    } else if (role === 'jury') {
      // Check jury credentials
      const juries = await db.getTable('juries');
      const jury = juries.find(j => j.username === username && !j.isDeleted);

      if (jury && jury.password === password) {
        accountRecord = jury;
        user = {
          id: jury.id,
          username: jury.username,
          role: 'jury',
          mustChangePassword: Boolean(jury.mustChangePassword)
        };
      }
    }

    if (!user) {
      await logActivity({
        actor: username,
        actorRole: role || 'unknown',
        action: 'login_failed',
        entityType: 'auth',
        details: { username, role, reason: 'invalid credentials' }
      });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.role === 'jury' && await isJuryAccessLocked()) {
      await logActivity({
        actor: user.username,
        actorRole: 'jury',
        action: 'login_failed',
        entityType: 'auth',
        details: { username: user.username, role: 'jury', reason: 'active contest completed' }
      });
      return res.status(403).json({ error: 'The contest has been completed. Jury login is no longer available.' });
    }

    const now = Date.now();
    const existingSessionExpiresAt = accountRecord?.sessionExpiresAt;
    const existingSessionId = accountRecord?.sessionId;

    if (existingSessionId && new Date(existingSessionExpiresAt || 0).getTime() > now) {
      return res.status(409).json({
        error: 'Multiple logins are not allowed. Please sign out from the device currently in use.'
      });
    }

    // A user can have exactly one active session at a time.
    const sessionId = uuidv4();
    const sessionExpiresAt = new Date(now + 24 * 60 * 60 * 1000).toISOString();
    if (user.role === 'admin') {
      await db.update('admins', user.id, {
        sessionId,
        sessionExpiresAt
      });
    } else {
      await db.update('juries', user.id, { sessionId, sessionExpiresAt });
    }

    const token = createToken({
      ...user,
      sessionVersion: state?.sessionVersion || 0,
      sessionId
    });
    await logActivity({
      actor: user.username,
      actorRole: user.role,
      action: 'login',
      entityType: 'auth',
      details: { username: user.username, role: user.role }
    });
    res.json({ token, user });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify token endpoint
router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ valid: false });
    }

    const decoded = verifyToken(token);
    if (!decoded || !(await isTokenSessionCurrent(decoded))) {
      return res.status(200).json({ valid: false });
    }

    res.json({ valid: true, user: decoded });
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Explicit logout frees the account for a login on another device.
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      await db.update('admins', req.user.id, {
        sessionId: null,
        sessionExpiresAt: null
      });
    } else if (req.user.role === 'jury') {
      await db.update('juries', req.user.id, {
        sessionId: null,
        sessionExpiresAt: null
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Unable to end session' });
  }
});

// Invalidates every currently issued token, including the caller's token.
router.post('/logout-all', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const state = await db.getTable('state');
    const sessionVersion = Number(state?.sessionVersion || 0) + 1;
    await db.setTable('state', {
      ...(state || {}),
      sessionVersion
    });

    const admins = await db.getTable('admins');
    await db.setTable('admins', admins.map((admin) => ({
      ...admin,
      sessionId: null,
      sessionExpiresAt: null
    })));

    const juries = await db.getTable('juries');
    await db.setTable('juries', juries.map((jury) => ({
      ...jury,
      sessionId: null,
      sessionExpiresAt: null
    })));

    await logActivity({
      actor: req.user.username,
      actorRole: req.user.role,
      action: 'logout_all',
      entityType: 'auth',
      details: { sessionVersion }
    });

    res.json({ success: true, message: 'All sessions have been terminated.' });
  } catch (error) {
    console.error('Terminate sessions error:', error);
    res.status(500).json({ error: 'Unable to terminate sessions' });
  }
});

// Change password endpoint
router.post('/change-password', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const decoded = verifyToken(token);
    if (!decoded || !(await isTokenSessionCurrent(decoded))) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'All password fields are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'New passwords do not match' });
    }

    if (decoded.role === 'admin') {
      const admins = await db.getTable('admins');
      const admin = admins.find((item) => item.id === decoded.id && !item.isDeleted);
      if (!admin) {
        return res.status(404).json({ error: 'Admin account not found' });
      }
      if (currentPassword !== admin.password) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }

      await db.update('admins', admin.id, { password: newPassword });

      await logActivity({
        actor: admin.username,
        actorRole: 'admin',
        action: 'password_changed',
        entityType: 'auth',
        details: { username: admin.username }
      });

      return res.json({ success: true, message: 'Password updated successfully' });
    }

    if (decoded.role === 'jury') {
      const juries = await db.getTable('juries');
      const jury = juries.find(j => j.id === decoded.id && !j.isDeleted);

      if (!jury) {
        return res.status(404).json({ error: 'Jury not found' });
      }

      if (jury.password !== currentPassword) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }

      const updatedJury = await db.update('juries', jury.id, {
        password: newPassword,
        mustChangePassword: false
      });

      await logActivity({
        actor: jury.username,
        actorRole: 'jury',
        action: 'password_changed',
        entityType: 'jury',
        entityId: jury.id,
        details: { username: jury.username }
      });

      return res.json({ success: true, message: 'Password updated successfully', jury: updatedJury });
    }

    return res.status(403).json({ error: 'Unsupported user role' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
