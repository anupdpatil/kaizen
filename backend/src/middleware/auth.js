import jwt from 'jsonwebtoken';
import db from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'kaizen-secret-key-change-in-production';

export const createToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      role: user.role,
      access: user.access || null,
      mustChangePassword: Boolean(user.mustChangePassword),
      sessionVersion: Number(user.sessionVersion || 0),
      sessionId: user.sessionId
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

export const isTokenSessionCurrent = async (decoded) => {
  const state = await db.getTable('state');
  const now = Date.now();
  if (Number(decoded.sessionVersion || 0) !== Number(state?.sessionVersion || 0)) {
    return false;
  }

  if (decoded.role === 'admin') {
    const admins = await db.getTable('admins');
    const admin = admins.find((item) => item.id === decoded.id && !item.isDeleted);
    return Boolean(decoded.sessionId) &&
      decoded.sessionId === admin?.sessionId &&
      new Date(admin?.sessionExpiresAt || 0).getTime() > now;
  }

  if (decoded.role === 'jury') {
    const juries = await db.getTable('juries');
    const jury = juries.find((item) => item.id === decoded.id && !item.isDeleted);
    return Boolean(decoded.sessionId) &&
      decoded.sessionId === jury?.sessionId &&
      new Date(jury?.sessionExpiresAt || 0).getTime() > now;
  }

  return false;
};

export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

export const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  try {
    if (!(await isTokenSessionCurrent(decoded))) {
      return res.status(401).json({ error: 'Session has been terminated. Please sign in again.' });
    }
  } catch (error) {
    console.error('Session validation failed:', error);
    return res.status(500).json({ error: 'Authentication check failed' });
  }

  req.user = decoded;

  if (decoded.role === 'jury') {
    try {
      const juries = await db.getTable('juries');
      const jury = juries.find(j => j.id === decoded.id && !j.isDeleted);

      if (jury && jury.mustChangePassword) {
        return res.status(403).json({ error: 'Password change required before accessing the system.' });
      }
    } catch (error) {
      console.error('Jury password check failed:', error);
      return res.status(500).json({ error: 'Authentication check failed' });
    }
  }

  next();
};

export const adminMiddleware = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  if (req.user.access === 'read_only') {
    return res.status(403).json({ error: 'This admin account has read-only access.' });
  }
  next();
};
