import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import path from 'path';
import db from './db.js';
import { authMiddleware, adminMiddleware, createToken, verifyToken } from './middleware/auth.js';

// Import route handlers
import authRouter from './routes/auth.js';
import contestsRouter from './routes/contests.js';
import juriesRouter from './routes/juries.js';
import teamsRouter from './routes/teams.js';
import assignmentsRouter from './routes/assignments.js';
import evaluationsRouter from './routes/evaluations.js';
import stateRouter from './routes/state.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(express.json());
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'https://kaizen-ui.onrender.com'
    ];

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Initialize database
async function initializeApp() {
  try {
    await db.init();
    
    // Initialize empty database without seed data
    const state = await db.getTable('state');

    if (!state?.adminPassword) {
      const currentState = await db.getTable('state');
      await db.setTable('state', { ...(currentState || {}), adminPassword: 'admin123' });
    }

    console.log('✓ Database initialized (empty)');
  } catch (error) {
    console.error('Database initialization error:', error);
    process.exit(1);
  }
}

// Routes
app.use('/api/auth', authRouter);
app.use('/api/contests', authMiddleware, contestsRouter);
app.use('/api/juries', authMiddleware, juriesRouter);
app.use('/api/teams', authMiddleware, teamsRouter);
app.use('/api/hall-assignments', authMiddleware, assignmentsRouter);
app.use('/api/evaluations', authMiddleware, evaluationsRouter);
app.use('/api/state', authMiddleware, stateRouter);

// Block /data access
app.use('/data', (req, res) => {
  res.status(403).json({ error: 'Direct data access forbidden' });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
async function start() {
  await initializeApp();
  
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

start().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
