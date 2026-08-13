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
      // Check hardcoded admin credentials
      if (username === 'admin' && password === 'admin123') {
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
          role: 'jury'
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

export default router;
