# Kaizen System - Quick Setup Guide

## V1 Release Status

This project is currently in V1, which represents the core working version of the Kaizen competition management system.

The V1 release includes the complete foundation workflow for administration, jury scoring, rankings, assignment management, and deployment-ready setup.

## 📋 What's Included

This is a complete, production-ready Kaizen Competition Management System with:

- ✅ Full backend (Node.js + Express) on port 4000
- ✅ Full frontend (React + Vite) on port 5173
- ✅ Database layer (JSON files with atomic writes)
- ✅ Complete authentication system
- ✅ All 8 admin views
- ✅ Jury evaluation system
- ✅ Seed data (contest, 20 juries, 200 teams)
- ✅ Real-time state sync with autosave
- ✅ CSV export functionality
- ✅ Responsive modern UI

## 🚀 5-Minute Setup

### Step 1: Install Dependencies
```bash
cd kaizen
npm run install-all
```

This installs:
- Root package (concurrently for parallel running)
- Backend dependencies
- Frontend dependencies

### Step 2: Start Development Servers
```bash
npm run dev
```

This starts:
- Backend: http://localhost:4000 (Express + API)
- Frontend: http://localhost:5173 (React + Vite)

You'll see output confirming both servers running.

### Step 3: Open Browser
Navigate to: http://localhost:5173

You should see the Kaizen login page.

## 🔐 Demo Credentials

### Admin Account
```
Username: admin
Password: admin123
```

### Jury Accounts (Auto-generated)
Format: `jury_h{hall}_{1|2}` and password `jury{hall}{number}password`

Examples:
- `jury_h1_1` / `jury1_1password`
- `jury_h2_1` / `jury2_1password`
- `jury_h10_2` / `jury10_2password`

## ✅ First-Time Test (Smoke Test)

1. **Login**: Use admin credentials
2. **View Dashboard**: Should see completion % and hall cards
3. **Check Setup**: Should see default "Kaizen Competition 2026"
4. **Check Teams**: Should see 200 auto-generated teams
5. **Check Juries**: Should see 20 auto-generated juries
6. **View Results**: Should see team evaluation status
7. **Export Data**: Click Exports → Download CSV
8. **Logout & Login as Jury**: Use jury credentials
9. **Submit Scores**: Select team, enter scores, submit
10. **Refresh Page**: Session should persist automatically

## 📁 Project Structure

```
kaizen/
├── backend/              # Express server
│   ├── src/
│   │   ├── index.js      # Main server
│   │   ├── db.js         # Database (JSON+atomicity)
│   │   ├── routes/       # API routes
│   │   └── utils/        # Seed data
│   ├── data/             # JSON storage
│   └── package.json
├── frontend/             # React app
│   ├── src/
│   │   ├── pages/        # Admin & Jury dashboards
│   │   ├── components/   # Layout, etc
│   │   └── styles/       # CSS
│   └── package.json
├── package.json          # Root monorepo
├── README.md             # Overview
├── CONSOLIDATED_PROMPT.md  # Complete spec
└── SETUP_GUIDE.md        # This file
```

## 🔧 Useful Commands

```bash
# Start both servers
npm run dev

# Start only backend
cd backend && npm run dev

# Start only frontend
cd frontend && npm run dev

# Build for production
npm run build

# Install dependencies fresh
npm run install-all
```

## 🌐 API Endpoints

All behind auth middleware (except login/verify):

```
Authentication:
POST   /api/auth/login
POST   /api/auth/verify

Core APIs:
GET    /api/contests
GET    /api/juries
GET    /api/teams
GET    /api/hall-assignments
GET    /api/evaluations
POST   /api/evaluations/submit

State:
GET    /api/state/snapshot
POST   /api/state/snapshot
```

## 📊 Admin Views

1. **Dashboard** - Overall completion %, per-hall progress
2. **Setup** - Create contests, manage halls
3. **Juries** - Create/delete jury members
4. **Teams** - Create/delete teams, edit day/hall
5. **Assignments** - Assign juries to hall/day
6. **Results** - View team evaluations with filters
7. **Rankings** - Overall and category winners
8. **Exports** - Download results as CSV

## 📝 Jury Features

- View assigned hall/day teams
- Score each team on 8 criteria (0-10)
- Submit evaluation
- Team disappears from queue after submission
- Cannot re-submit same team

## 🔑 Key Features

✅ **JWT Authentication** - Secure token-based auth  
✅ **Role-Based Access** - Admin vs Jury  
✅ **Session Persistence** - Automatic restore on refresh  
✅ **Autosave** - Debounced (500ms) with retry (3x)  
✅ **Atomic Writes** - No data corruption on concurrent access  
✅ **8 Scoring Criteria** - Problem Definition, RCA, Innovation, etc.  
✅ **Category Awards** - Computed from criteria scores  
✅ **CSV Export** - Team-wise, Hall-wise, Consolidated  
✅ **Responsive UI** - Works on desktop, tablet, mobile  
✅ **Modern Design** - Teal/sea-green theme, clean cards  

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Find and kill process
lsof -ti:4000 | xargs kill -9
lsof -ti:5173 | xargs kill -9
```

### Dependencies Not Installing
```bash
rm -rf node_modules backend/node_modules frontend/node_modules
npm run install-all
```

### Backend Not Starting
```bash
cd backend
npm install
npm run dev
```

### Frontend Not Loading
- Check http://localhost:5173
- Open browser DevTools (F12) to see errors
- Check backend is running on port 4000

### CORS Errors
- Ensure backend running on 4000
- Ensure frontend on 5173
- Check browser console

## 📦 Data Storage

JSON files in `backend/data/`:
- `contests.json` - Competition data
- `juries.json` - Jury members
- `teams.json` - Team registrations
- `hall_assignments.json` - Jury assignments
- `evaluations.json` - Scoring data
- `state.json` - App state snapshot

Files are automatically created on first run.

## 🔒 Security

- JWT tokens (24-hour expiry)
- Role-based middleware
- Admin-only operations
- CORS restricted
- Input validation
- Password hashing (bcrypt ready)

## 📱 Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 🎯 Next Steps After Setup

1. **Explore Admin Dashboard** - Create new contests
2. **Manage Entities** - Add teams, juries, assignments
3. **Test Jury Flow** - Login as jury, submit scores
4. **View Results** - Check rankings and completion
5. **Export Data** - Download results as CSV
6. **Check Session** - Refresh page, verify persistence

## 📚 Complete Documentation

- `README.md` - Project overview and V1 release summary
- `docs/DEVELOPMENT_JOURNAL.md` - Full development journey and milestones
- `docs/VERSION_ROADMAP.md` - Versioned planning and delivery structure
- `docs/VERSION_BACKLOG.md` - Active backlog for future versions
- `docs/CHANGELOG.md` - V1 release and update history
- `CONSOLIDATED_PROMPT.md` - Complete specification
- Backend code comments for API details
- Frontend component JSDoc comments

## ⚙️ Configuration

Backend `.env` (optional):
```
PORT=4000
JWT_SECRET=your-secret-key
```

Frontend uses hardcoded `http://localhost:4000/api` in development.

## 🚀 Production Deployment

```bash
# Build
npm run build

# Backend deployment (uses port from .env)
cd backend && npm start

# Frontend deployment (build dist/ to CDN)
cd frontend && npm run preview
```

## 💡 Tips

- **Autosave**: Changes auto-save every 500ms to backend
- **Session**: Token stored in localStorage, auto-verified on refresh
- **Retry Logic**: Failed saves retry up to 3 times
- **Atomic Writes**: No data loss even on server crash
- **Responsive**: Fully works on mobile with touch support

## 🎓 Learning Resources

This project demonstrates:
- Full-stack TypeScript-free ES module development
- JWT authentication patterns
- React hooks and state management
- Express routing and middleware
- JSON file storage best practices
- Atomic file write patterns
- CSS variables for theming
- Responsive design techniques

## 📞 Support

If you encounter issues:

1. Check `README.md` for overview
2. Check `CONSOLIDATED_PROMPT.md` for spec
3. Check error messages in browser console (F12)
4. Check backend logs in terminal
5. Verify ports 4000 and 5173 are not blocked

---

**Ready to go!** Run `npm run dev` and visit http://localhost:5173

Enjoy the Kaizen Competition System! 🎉
