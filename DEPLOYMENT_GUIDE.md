# Deployment Guide - Going Live

## V1 Deployment Context

This project is currently treated as V1: the stable foundation release of the Kaizen competition system.

The deployment setup below reflects the current stage of development and is intended to support local use, staging, and future production deployment planning for V2 enhancements.

## Overview
- Frontend: Deploy to **Vercel** (free tier)
- Backend: Deploy to **Railway** or **Render** (free tier)
- Database: MongoDB Atlas (already configured)
- Domain: Free subdomain included or register your own

---

## Step 1: Prepare Your Code for Production

### 1.1 Update Backend Environment Variables
Create a `.env.production` file in `backend/`:
```
MONGODB_URI=your_mongodb_atlas_connection_string
MONGODB_DB_NAME=kaizen
PORT=3000
NODE_ENV=production
CORS_ORIGIN=https://your-domain.vercel.app
```

### 1.2 Update Frontend API Base URL
Edit `frontend/src/utils/api.js`:
```javascript
const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:4000/api';
```

Create `frontend/.env.production`:
```
VITE_API_URL=https://your-backend-domain.com/api
```

### 1.3 Test Locally with Production Build
```bash
# Backend
cd backend
npm run build  # if you have a build script

# Frontend
cd frontend
npm run build
npm run preview
```

---

## Step 2: Deploy Backend (Choose One)

### Option A: Deploy to Railway (Recommended - Easiest)

1. **Sign up**: https://railway.app (free tier)
2. **Create new project**
3. **Connect your GitHub repository**
   - Fork/push your code to GitHub first
4. **Add services**:
   - Click "Add Service" → "GitHub Repo"
   - Select your kaizen repo
5. **Configure environment**:
   - Go to Project Settings → Variables
   - Add all from `.env.production`:
     - `MONGODB_URI`
     - `MONGODB_DB_NAME`
     - `NODE_ENV=production`
     - `CORS_ORIGIN=https://your-frontend-domain`
6. **Set start command** (if not auto-detected):
   - Project Settings → Deploy
   - Start Command: `cd backend && node src/index.js`
7. **Deploy**:
   - Push to GitHub → Railway auto-deploys
   - Your backend gets a URL like: `https://kaizen-prod-xyz.up.railway.app`

### Option B: Deploy to Render

1. **Sign up**: https://render.com (free tier)
2. **Create new Web Service**
3. **Connect GitHub repository**
4. **Fill in settings**:
   - Name: kaizen-backend
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `node src/index.js`
5. **Add environment variables**:
   - Same as Railway (see above)
6. **Deploy** → Get your URL

---

## Step 3: Deploy Frontend to Vercel

1. **Sign up**: https://vercel.com (free tier)
2. **Import Project**:
   - Click "New Project" → Import your GitHub repo
3. **Configure settings**:
   - Framework: Vite
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`
4. **Add environment variables**:
   - `VITE_API_URL`: https://your-backend-url.com/api
5. **Deploy** → Get your frontend URL

---

## Step 4: Update CORS Configuration

### Backend (src/index.js)
Update the CORS allowlist:
```javascript
const corsOptions = {
  origin: [
    'http://localhost:5174',
    'http://localhost:3000',
    'https://your-domain.vercel.app'  // Add your Vercel frontend URL
  ],
  credentials: true
};
```

---

## Step 5: Verify Production Deployment

1. **Test Backend Health**:
   ```bash
   curl https://your-backend-url.com/api/contests
   ```

2. **Test Login**:
   - Go to https://your-frontend-domain
   - Login with your credentials
   - Check browser console for errors

3. **Check Network Requests**:
   - Open DevTools (F12) → Network tab
   - Create a contest → Should see POST request to backend
   - Check MongoDB Atlas to confirm data saves

4. **Monitor Logs**:
   - Railway: Project → Deployments → View logs
   - Render: Dashboard → Logs
   - Fix any errors and redeploy

---

## Step 6: Get a Custom Domain (Optional)

### Using Free Subdomain:
- **Railway**: Add domain in Project Settings → add a custom domain → get free railway.app subdomain
- **Vercel**: Get free vercel.app subdomain automatically
- **Render**: Get free render.com subdomain

### Using Your Own Domain:
1. Buy a domain (Namecheap, GoDaddy, etc.) - ~$5-10/year
2. Update DNS records:
   - Frontend: Point to Vercel DNS (provided by Vercel)
   - Backend: Point to Railway/Render DNS (provided)
3. Enable SSL (usually automatic)

---

## Step 7: CI/CD Setup (Auto-Deploy on GitHub Push)

### Railway/Render Auto-Deploy:
- Both auto-deploy when you push to GitHub
- No additional setup needed
- Check "Autodeploy" in settings

### Vercel Auto-Deploy:
- Enabled by default when connected to GitHub
- Any push to `main` branch triggers deploy

---

## Troubleshooting

### Frontend won't connect to backend:
- Check `VITE_API_URL` in frontend `.env`
- Verify backend URL is correct in browser console
- Check CORS configuration in backend

### Backend crashes after deploy:
- Check logs: Railway/Render dashboard
- Verify `MONGODB_URI` is correct
- Ensure `PORT` is set or defaults to 3000

### Database connection fails:
- Verify MongoDB Atlas IP whitelist includes backend server IP
- In MongoDB Atlas: Security → Network Access → Add IP (usually auto-added if using cloud deploy)

### 502 Bad Gateway:
- Backend is crashing
- Check environment variables
- Check start command
- View deployment logs

---

## Production Checklist

- [ ] Backend deployed (Railway/Render)
- [ ] Frontend deployed (Vercel)
- [ ] Environment variables configured
- [ ] CORS updated for production domain
- [ ] MongoDB Atlas connection working
- [ ] Tested login flow
- [ ] Tested contest creation
- [ ] Tested team/jury management
- [ ] Activity logging verified
- [ ] Custom domain (optional)
- [ ] Version summary updated for V1 completion
- [ ] V2 backlog reviewed before next release cycle

---

## Project Documentation Map

Use these files to maintain a strong record of progression and future planning:

- [README.md](./README.md) - Project overview
- [docs/DEVELOPMENT_JOURNAL.md](./docs/DEVELOPMENT_JOURNAL.md) - Development and deployment narrative
- [docs/VERSION_ROADMAP.md](./docs/VERSION_ROADMAP.md) - Version planning and release strategy
- [docs/VERSION_BACKLOG.md](./docs/VERSION_BACKLOG.md) - Active feature backlog
- [docs/CHANGELOG.md](./docs/CHANGELOG.md) - Release history and milestones

These documents are meant to support a clean progression from V1 into V2 and future releases without losing the context of what was built and why.

---

## Next Steps After Going Live

1. **Monitoring**:
   - Set up error tracking (optional: Sentry)
   - Monitor performance metrics

2. **Backups**:
   - MongoDB Atlas handles backups (free tier)
   - Export data regularly

3. **Updates**:
   - Push code to GitHub → Auto-deploys to Vercel/Railway
   - No manual deployment needed

4. **Scaling** (if needed later):
   - Upgrade from free tier
   - Average cost: $5-20/month for small app

---

## Quick Command Reference

```bash
# Build frontend
cd frontend && npm run build

# Build backend
cd backend && npm install

# Test production build locally
npm run preview

# Push to GitHub (triggers auto-deploy)
git add .
git commit -m "Deploy update"
git push origin main
```

---

**Need help?** Each platform has excellent documentation:
- Railway Docs: https://docs.railway.app
- Render Docs: https://render.com/docs
- Vercel Docs: https://vercel.com/docs
