# 🚀 Backend Deployment Guide

## Recommended Platform: Render

Render is the best choice for this backend because it:
- ✅ Supports Puppeteer out of the box
- ✅ Provides persistent disk storage for SQLite
- ✅ Has a generous free tier
- ✅ Easy environment variable management
- ✅ Automatic HTTPS and custom domains

---

## 🔧 Deploy to Render (Recommended)

### Step 1: Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up with your GitHub account
3. Connect your repository

### Step 2: Create Web Service
1. **Click "New +"** → **"Web Service"**
2. **Connect your repository**: `ASU-Facilities-Hours-of-Operation-Webpage`
3. **Configure service:**
   - **Name**: `asu-facilities-backend`
   - **Region**: Oregon (free tier)
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

### Step 3: Configure Environment Variables
Add these environment variables in Render dashboard:

```env
NODE_ENV=production
ALLOWED_ORIGINS=https://shinpark43.github.io
PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
```

### Step 4: Enable Persistent Disk (Important!)
1. In your service settings, go to **"Disks"**
2. **Add Disk**:
   - **Name**: `asu-facilities-data`
   - **Mount Path**: `/opt/render/project/src/data`
   - **Size**: 1GB (free tier)

### Step 5: Deploy
1. Click **"Create Web Service"**
2. Render will automatically deploy from your GitHub repo
3. Monitor the build logs for any issues

Your API will be available at: `https://your-service-name.onrender.com`

---

## 🔄 Alternative: Railway

### Step 1: Railway Setup
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. **Deploy from GitHub repo**

### Step 2: Configuration
Railway auto-detects Node.js, but you may need to:
1. Set **Root Directory**: `backend`
2. Set **Start Command**: `npm start`
3. Add environment variables

### Step 3: Environment Variables
```env
NODE_ENV=production
PORT=3001
ALLOWED_ORIGINS=https://shinpark43.github.io
```

---

## 🔗 Update Frontend API URL

After deployment, update your frontend to use the backend URL:

1. **In GitHub repository secrets:**
   - Go to Settings → Secrets and Variables → Actions
   - Update `REACT_APP_API_URL` to your deployed backend URL

2. **Example URLs:**
   - Render: `https://asu-facilities-backend.onrender.com`
   - Railway: `https://asu-facilities-backend.up.railway.app`

---

## 🧪 Testing Deployment

Test these endpoints after deployment:

```bash
# Health check
curl https://your-backend-url.onrender.com/api/health

# Facilities data
curl https://your-backend-url.onrender.com/api/facilities/library

# API documentation
curl https://your-backend-url.onrender.com/
```

---

## 🛠️ Environment Variables Reference

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NODE_ENV` | Environment mode | Yes | `production` |
| `PORT` | Server port | No | `3001` |
| `ALLOWED_ORIGINS` | CORS origins | Yes | Your frontend URL |
| `PUPPETEER_EXECUTABLE_PATH` | Chrome executable | No | Auto-detected |
| `DATABASE_PATH` | SQLite path | No | `./data/facilities.db` |

---

## 🔄 Continuous Deployment

Both Render and Railway support automatic deployment:
- **Trigger**: Push to `main` branch
- **Build**: Automatic on backend file changes
- **Zero downtime**: Rolling deployments

---

## 🚨 Common Issues & Solutions

### Issue 1: Puppeteer Fails
**Solution**: Ensure Chrome dependencies are installed
- Render handles this automatically
- For custom Docker, see included Dockerfile

### Issue 2: Database Not Persisting
**Solution**: Add persistent disk storage
- Render: Configure disk in dashboard
- Railway: Data persists automatically

### Issue 3: CORS Errors
**Solution**: Update `ALLOWED_ORIGINS` environment variable
- Include your frontend URL
- Multiple origins: comma-separated

### Issue 4: Cold Starts
**Solution**: Keep service warm
- Render free tier sleeps after 15 minutes
- Use external monitoring or upgrade to paid tier

---

## 📊 Cost Comparison

| Platform | Free Tier | Paid Tier | Best For |
|----------|-----------|-----------|----------|
| **Render** | 512MB RAM, sleeps | $7/month | This project ⭐ |
| **Railway** | $5 credit | $5/month | Simple deployments |
| **Heroku** | No free tier | $7/month | Enterprise features |

---

## 🎯 Next Steps

1. Deploy backend to Render
2. Update frontend `REACT_APP_API_URL`
3. Test API endpoints
4. Monitor application logs
5. Set up monitoring/alerts (optional)

Your backend will be production-ready with:
- ✅ Automatic SSL/HTTPS
- ✅ Environment isolation
- ✅ Persistent database
- ✅ Web scraping capabilities
- ✅ Scheduled cron jobs 