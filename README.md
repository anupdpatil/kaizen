# Kaizen Competition Management System

A production-ready full-stack web application for managing Kaizen competitions with comprehensive role-based access control, scoring, rankings, and data export capabilities.

## Quick Start

### Installation
```bash
cd kaizen
npm run install-all
```

### Run Development
```bash
npm run dev
```

Starts frontend (5173) and backend (4000) in parallel.

### Default Credentials
- **Admin**: `admin` / `admin123`
- **Jury**: `jury_h1_1` / `jury1_1password` (auto-generated)

## Features

✅ Admin & Jury role system  
✅ Contest management  
✅ Team registration & assignments  
✅ 8-criteria scoring system  
✅ Real-time data sync with autosave  
✅ Rankings & category awards  
✅ CSV export  
✅ Session persistence  
✅ Modern responsive UI  

## Tech Stack

**Frontend**: React 18 + Vite + Axios  
**Backend**: Node.js + Express + JWT  
**Storage**: JSON files with atomic writes  
**Architecture**: Full-stack ESM with CORS

## Project Structure

```
kaizen/
├── backend/          # Express server
│   ├── src/
│   │   ├── index.js
│   │   ├── db.js
│   │   ├── routes/
│   │   └── middleware/
│   ├── data/         # JSON storage
│   └── package.json
├── frontend/         # React app
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   └── styles/
│   ├── index.html
│   └── package.json
├── package.json      # Root monorepo
└── CONSOLIDATED_PROMPT.md  # Complete spec
```

## Key Endpoints

```
POST   /api/auth/login                 # Admin/Jury login
POST   /api/auth/verify                # Verify token
GET    /api/contests                   # List contests
GET    /api/evaluations                # List scores
POST   /api/evaluations/submit         # Jury submit scores
GET    /api/state/snapshot             # Get full state
POST   /api/state/snapshot             # Auto-save state
```

## Data Models

- **Contest**: name, code, startDate, days, hallCount
- **Team**: contestId, teamCode, teamName, assignedDay, hallId
- **Jury**: name, username, password, isDeleted, role
- **Evaluation**: teamId → juryId → {scores, total, submittedAt}

## Scoring (8 Criteria, Max 10 Each)

1. Problem Definition
2. Root Cause Analysis
3. Innovation
4. Implementation Quality
5. Measured Impact
6. Sustainability
7. Presentation Clarity
8. Q&A Handling

**Calculation**: Per jury total = sum of 8 criteria (80 max)  
**Team score** = average of 2 jury totals  

## Smoke Test

1. Login as admin → Create contest
2. View teams & juries (auto-seeded)
3. View dashboard → See completion %
4. Export results as CSV
5. Logout & login as jury
6. Submit evaluation scores
7. Refresh page → Verify session restored
8. Check results updated in admin

## Deployment

### Build
```bash
npm run build
```

### Production
```bash
cd backend && npm start
cd frontend && npm run preview
```

## File Storage

JSON files in `backend/data/`:
- contests.json
- juries.json
- teams.json
- hall_assignments.json
- evaluations.json
- state.json

**Atomic writes** prevent corruption during concurrent access.

## Security

✅ JWT authentication  
✅ Role-based access control  
✅ Admin-only operations  
✅ CORS restricted  
✅ Input validation  
✅ Graceful error handling  

## Troubleshooting

**Port in use?**
```bash
lsof -ti:4000 | xargs kill -9
lsof -ti:5173 | xargs kill -9
```

**Dependencies missing?**
```bash
rm -rf node_modules backend/node_modules frontend/node_modules
npm run install-all
```

## Environment

Create `backend/.env`:
```
PORT=4000
JWT_SECRET=your-secret
```

## Browser Support

Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

## Performance

- Debounced autosave (500ms)
- Retry logic for failed saves (3x)
- Atomic writes prevent data loss
- CSS variables for efficient theming
- Responsive mobile-first design

---

**Version**: 1.0.0  
**Complete Spec**: See [CONSOLIDATED_PROMPT.md](./CONSOLIDATED_PROMPT.md)
