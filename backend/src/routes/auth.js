import express from 'express';
import db from '../db.js';
import { createToken, verifyToken } from '../middleware/auth.js';
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

    if (role === 'admin') {
      const state = await db.getTable('state');
      const adminPassword = state?.adminPassword || 'admin123';

      if (username === 'admin' && password === adminPassword) {
        user = {
          id: 'admin-1',
          username: 'admin',
          role: 'admin'
        };
      }
    } else if (role === 'jury') {
      // Check jury credentials
      const juries = await db.getTable('juries');
      const jury = juries.find(j => j.username === username && !j.isDeleted);

      if (jury && jury.password === password) {
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

    const token = createToken(user);
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
router.post('/verify', (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ valid: false });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(200).json({ valid: false });
    }

    res.json({ valid: true, user: decoded });
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({ error: 'Internal server error' });
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
    if (!decoded) {
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
      if (decoded.username !== 'admin') {
        return res.status(403).json({ error: 'Admin account mismatch' });
      }

      const state = await db.getTable('state');
      const adminPassword = state?.adminPassword || 'admin123';

      if (currentPassword !== adminPassword) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }

      const updatedState = { ...(state || {}), adminPassword: newPassword };
      await db.setTable('state', updatedState);

      await logActivity({
        actor: 'admin',
        actorRole: 'admin',
        action: 'password_changed',
        entityType: 'auth',
        details: { username: 'admin' }
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
