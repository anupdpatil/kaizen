import jwt from 'jsonwebtoken';
import db from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'kaizen-secret-key-change-in-production';

export const createToken = (user) => {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role, mustChangePassword: Boolean(user.mustChangePassword) },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
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
  next();
};
