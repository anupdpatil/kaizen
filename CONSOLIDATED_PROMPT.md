# KAIZEN COMPETITION MANAGEMENT SYSTEM - COMPLETE SPECIFICATION

Build a production-ready, full-stack web application that replicates a Kaizen Competition management system with exact business rules, role-based workflows, and comprehensive competition management capabilities.

## PROJECT OVERVIEW

A Kaizen Competition management platform enabling admins to orchestrate competitions with multiple days, halls, and teams while juries independently evaluate teams using standardized scoring criteria. The system must replicate complete workflows without simplification or screen removal.

## TECH STACK & PROJECT SETUP

### Frontend
- **Framework**: React + Vite (SPA)
- **Port**: 5173
- **Module System**: ESM

### Backend
- **Runtime**: Node.js
- **Framework**: Express
- **Port**: 4000
- **Module System**: ESM

### Data Storage
- **Type**: JSON files on disk (no SQL/NoSQL databases)
- **Location**: `data/` folder
- **Strategy**: Atomic writes via temp file + rename, mutation queue/lock to prevent concurrent corruption

### Authentication
- **Type**: JWT token-based (contains id, username, role)
- **Storage**: localStorage on client
- **Middleware**: Required for non-public endpoints, admin-only for privileged writes

### CORS Configuration
Allow: `localhost:5173`, `localhost:3000`, `127.0.0.1:5173`

### Build & Run Scripts
Include scripts: `dev`, `build`, `lint`, `preview`

---

## CORE DOMAIN & ROLES

### Two Roles
1. **Admin**
   - Hardcoded credentials: username `admin`, password `admin123`
   - Full system access: contests, halls, juries, teams, assignments, results
   - Cannot be deleted

2. **Jury**
   - Created and managed by admin
   - Stored in JSON data, can be soft-deleted
   - Assigned to specific halls/days
   - Score teams during assigned sessions
   - Cannot re-submit scores for same team

### Login & Session Management
- Login supports role toggle (admin/jury)
- Token verification endpoint exists
- Frontend restores session from localStorage on startup
- Session token contains: `{id, username, role}`

---

## DATA MODELS

### Contest
```
{
  id: string (uuid),
  name: string,
  code: string (unique),
  startDate: ISO8601,
  days: number,
  hallCount: number,
  deletedHalls: array<number> (soft-deleted hall indices),
  status: string (active|archived)
}
```

### Jury
```
{
  id: string (uuid),
  name: string,
  username: string (unique),
  password: string (hashed),
  isDeleted: boolean,
  role: "jury"
}
```

### Team
```
{
  id: string (uuid),
  contestId: string,
  teamCode: string,
  teamName: string,
  assignedDay: number,
  hallId: number,
  isDeleted: boolean
}
```

### HallAssignment
```
{
  id: string (format: "{contestId}-D{day}-H{hallId}"),
  contestId: string,
  day: number,
  hallId: number,
  juryIds: array<string> (exactly two distinct jury ids)
}
```

### Evaluations
```
{
  [teamId]: {
    [juryId]: {
      scores: object { criterion: number (0-10) },
      total: number (sum of criteria, max 80),
      submittedAt: ISO8601,
      submittedBy: string (jury id)
    }
  }
}
```

### Scoring Criteria (8 criteria, max 10 each)
1. Problem Definition
2. Root Cause Analysis
3. Innovation
4. Implementation Quality
5. Measured Impact
6. Sustainability
7. Presentation Clarity
8. Q&A Handling

#### Calculation Rules
- **Per Jury Total**: Sum of all 8 criteria (max 80)
- **Team Final Average**: Average of two jury totals
- **Team Complete**: Only when both juries submit

#### Category Awards (computed from scores)
- **Overall Excellence**: Team's final average
- **Best Problem Analysis**: Problem Definition + Root Cause Analysis
- **Best Innovation**: Innovation score
- **Best Implementation**: Implementation Quality score
- **Best Impact**: Measured Impact score
- **Best Sustainability**: Sustainability score
- **Best Presentation**: Presentation Clarity + Q&A Handling
- **Best Team Execution**: Implementation Quality + Presentation Clarity + Q&A Handling

---

## BACKEND API CONTRACT

### Authentication Endpoints

**POST /api/auth/login**
- Request: `{ username, password, role }`
- Response: `{ token, user: { id, username, role } }`
- Behavior: Verify credentials, return JWT

**POST /api/auth/verify**
- Request: `{ token }`
- Response: `{ valid: boolean, user?: { id, username, role } }`
- Behavior: Validate token from localStorage

### CRUD Endpoints (Auth required; Admin-only writes where indicated)

**GET/POST/PUT/DELETE /api/contests**
- POST/PUT/DELETE: Admin-only
- Behavior: Full CRUD for contests

**GET/POST/PUT/DELETE /api/juries**
- POST/PUT/DELETE: Admin-only
- Behavior: Full CRUD for jury members

**GET/POST/PUT/DELETE /api/teams**
- POST/PUT/DELETE: Admin-only
- Behavior: Full CRUD for teams

**GET/POST/PUT/DELETE /api/hall-assignments**
- POST/PUT/DELETE: Admin-only
- Behavior: Assign/update/delete hall-jury assignments

### Evaluation Endpoints

**GET /api/evaluations**
- Request: Optional filters (contestId, teamId, juryId)
- Response: Evaluations object
- Behavior: Retrieve all evaluations

**POST /api/evaluations/submit**
- Request: `{ contestId, teamId, juryId, scores: { criterion: number } }`
- Response: `{ success, evaluation }`
- Behavior: Submit jury scores for a team

### State Management Endpoints

**POST /api/state**
- Request: Complete app state snapshot
- Response: `{ success, version }`
- Behavior: Persist state to disk (debounced ~500ms from frontend)

**GET /api/snapshot**
- Response: Complete app state snapshot
- Behavior: Hydrate on startup if token valid

### Infrastructure Endpoints

**GET /api/health**
- Response: `{ status: "ok", timestamp }`
- Behavior: Health check endpoint

**Block /data**
- Behavior: Direct access to `/data` folder returns 403

**Unknown Routes**
- Behavior: Return 404 with JSON response

---

## BACKEND STORAGE & PERSISTENCE

### File Organization
- Store each table in separate JSON files under `data/` folder
- Files: `data/contests.json`, `data/juries.json`, `data/teams.json`, `data/hall_assignments.json`, `data/evaluations.json`, `data/state.json`

### Startup Behavior
- Ensure `data/` folder exists at startup
- Ensure all table files exist (create with empty arrays/objects if missing)

### Atomic Writes
- Use temp file + rename pattern to ensure atomic writes
- Implement mutation queue/lock to prevent concurrent write corruption

### Database Layer API
Must provide these functions:
- `getTable(tableName)` → complete table data
- `setTable(tableName, data)` → persist table data
- `create(tableName, record)` → add new record
- `update(tableName, id, updates)` → update record by id
- `delete(tableName, id)` → soft or hard delete
- `getAllData()` → all tables at once
- `setAllData(snapshot)` → persist entire snapshot

---

## FRONTEND APP BEHAVIOR

### Single Large App Page Architecture
- One main page with conditional login/role-specific views
- No screen removal or simplification

### Startup Sequence
1. Check if JWT token exists in localStorage
2. If token exists: POST /api/auth/verify
3. If valid: GET /api/snapshot → hydrate all state
4. If invalid or fails: Clear token, load default seed state, show login

### Autosave & State Synchronization
- Debounced save to POST /api/state (≈500ms debounce)
- Retry failed saves up to 3 attempts
- Show sync error notification after repeated failures
- Maintain `activeContestId` in saved state snapshot

### Token Restoration
- On page refresh, frontend automatically restores session from localStorage token
- If token still valid, fetch updated snapshot

---

## ADMIN VIEWS & WORKFLOWS

### Top Navigation (Admin Only)
1. **Setup**
   - Contest creation form: Name, Code, Start Date, Number of Days, Number of Halls
   - Hall management: Add, Soft Delete, Restore, Hard Delete

2. **Juries**
   - Jury CRUD: Create, Soft Delete, Restore, Hard Delete
   - Unique username validation
   - Jury hard delete cascades: remove from juries list, remove from all assignments, remove scores from evaluations, force logout if current user

3. **Teams**
   - Team CRUD: Create with day/hall, Soft Delete, Restore, Hard Delete
   - Inline edit day/hall in table
   - Hard delete removes team and its evaluations

4. **Assignments**
   - Assign exactly two distinct jury members per hall/day
   - Upsert by contest/day/hall key

5. **Dashboard**
   - Overall completion percentage
   - Per-hall completion cards showing completed/pending status and progress bar

6. **Results**
   - Table columns: Day, Hall, Team, Jury1, Score1, Jury2, Score2, Average, Status
   - Filters: Hall, Day
   - Status shows completion state

7. **Rankings**
   - Top overall ranking list (by final average)
   - Category-wise ranking lists with winner/runner-up/rank labels for each award category

8. **Exports**
   - Export buttons for: Team-wise, Hall-wise, Category-wise, Final consolidated
   - Generate real .xlsx files in browser (not server-side)
   - Use safe XLSX library (fflate + minimal XML packaging, avoid vulnerable libs)
   - Filename format: `{contestCode}_{type}_results.xlsx`
   - Build workbook with sheets as needed by export type

---

## JURY VIEW & WORKFLOWS

### Jury Dashboard
- Queue of teams assigned to their halls/day
- Score form for selected team
- Once submitted, team disappears from pending list
- Re-submission by same jury disabled

### Scoring Form
- Displays all 8 criteria
- Input fields: Score (0-max for each criterion)
- Validation: All criteria required before submit
- Score inputs: Clamped between 0 and max criterion value
- Submit button: POST /api/evaluations/submit

---

## ADMIN-ONLY FEATURES & CASCADING BEHAVIORS

### Hall Management

**Soft Delete Hall**
- Mark hall as deleted in `deletedHalls` array
- Soft-delete all teams in that hall
- Remove assignments for that hall

**Hard Delete Hall**
- Permanently remove hall
- Delete all teams in that hall and their evaluations
- Remove all assignments for that hall
- Shift higher hall numbers down by 1 for teams, assignments, deletedHalls
- Decrease hallCount by 1

### Jury Management

**Soft Delete Jury**
- Mark `isDeleted: true`
- Remove from active assignments

**Hard Delete Jury**
- Remove from juries list completely
- Remove from all hall assignments
- Remove jury's scores from all evaluations
- If current logged-in user is this jury: force logout, clear token

### Team Management

**Soft Delete Team**
- Mark `isDeleted: true`

**Hard Delete Team**
- Remove team entirely
- Remove all evaluations for this team

### Validation & Cascading

**Initial Seed Contest** (Kaizen Competition 2026)
- Name: "Kaizen Competition 2026"
- Code: "KC2026"
- Days: 2
- Halls: 10
- Auto-generate 2 juries per hall (20 total)
- Auto-generate 20 teams per hall: 10 on day 1, 10 on day 2
- Auto-generate hall assignments (each day/hall gets its 2 juries)

---

## VALIDATION RULES & UX MESSAGES

### Form Validation
- All required fields must be marked with clear alerts
- Unique field validation: username (juries), code (contests)
- Score inputs: Show range constraints (0-10)

### User Confirmations
- Soft delete (team/jury): Confirmation dialog
- Hall soft delete: Also soft-deletes teams in that hall and removes assignments
- Hard delete operations: Explicit irreversible warning modal with "I understand the consequences" checkbox

### Jury Scoring
- All 8 criteria must be filled before submit
- Show validation errors inline
- Disable submit button until all criteria present

### Error Handling
- Show sync error messages after 3 failed save attempts
- Handle invalid/expired tokens cleanly: logout, clear state, redirect to login
- Port-in-use errors on backend startup: graceful error message

---

## UI/UX STYLING DIRECTION

### Design Language
- Clean modern admin dashboard aesthetic
- Professional, organized, minimal

### Typography
- **Headings**: Space Grotesk (bold, geometric)
- **UI Text**: DM Sans (clean, readable)
- **Monospace**: JetBrains Mono (code, scores)

### Color Palette
- **Primary Accent**: Teal/Sea-green (brand color)
- **Background**: Light, layered
- **Cards**: Soft with subtle shadows
- **Use CSS variables** for colors, radius, shadows

### Components & Patterns
- Hero login panel (centered, clean)
- Card-based layout for data sections
- Responsive grids (desktop & mobile)
- Sticky/floating action buttons for primary CTAs
- Confirmation modal dialogs for destructive actions
- Subtle page-entry animations (fade, slide)
- Desktop and mobile full support

---

## SECURITY & RELIABILITY

### Authentication & Authorization
- Protect all non-public endpoints with auth middleware (verify JWT)
- Admin-only middleware for privileged writes (POST/PUT/DELETE non-auth)
- Never expose jury passwords in API responses where not needed
- Handle invalid/expired tokens cleanly: logout, redirect

### Data Integrity
- Atomic writes via temp + rename
- Mutation queue/lock prevents corruption from concurrent writes
- Validate all inputs on backend
- Clamp score values to valid ranges

### Graceful Error Handling
- Backend startup: Graceful handling for port-in-use, missing data folder
- Missing endpoints: Return 404 JSON
- Direct /data access: Block with 403 JSON

---

## DELIVERABLES FORMAT

### Project Structure
- Return complete project files with full folder structure
- Include all source code, configs, and seed data files

### Installation & Run Commands
```bash
# Install dependencies
npm install

# Development (both frontend and backend in parallel)
npm run dev

# Build
npm run build

# Lint
npm run lint

# Preview
npm run preview
```

### Smoke Test Steps
1. **Login**: Use hardcoded admin credentials (admin/admin123)
2. **Create Entities**: Create a test contest with multiple halls
3. **Assign Juries**: Assign juries to hall/day combinations
4. **Team Setup**: Create sample teams
5. **Jury Evaluation**: Login as jury, submit evaluation scores
6. **Dashboard Check**: Verify completion % and hall cards update
7. **Rankings View**: Check overall and category rankings calculate correctly
8. **Export Files**: Generate and download .xlsx exports
9. **Auth Restore**: Refresh browser, verify session restores automatically
10. **Role Toggle**: Login as admin, toggle to jury role, verify view changes

---

## SUCCESS CRITERIA

The generated application should:
- ✅ Behave like a production-ready replica of the Kaizen competition system
- ✅ Replicate all business rules exactly without simplification
- ✅ Support complete role-based workflows (admin and jury)
- ✅ Manage full hall/jury/team entity lifecycle with soft/hard deletes
- ✅ Calculate and display scoring with all 8 criteria and category awards
- ✅ Maintain data integrity with atomic writes and mutation queues
- ✅ Restore session automatically on page refresh
- ✅ Export results in real .xlsx format
- ✅ Provide clean, modern admin dashboard UI
- ✅ Support both desktop and mobile viewports
- ✅ Include autosave with retry logic and error notifications
- ✅ Pass all smoke test steps
