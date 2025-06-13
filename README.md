# ASU Facilities Hours of Operation

A modern web application displaying real-time operating hours for ASU facilities including library, recreation center, and dining locations.

**🌐 Live Application**: [https://shinpark43.github.io/ASU-Facilities-Hours-of-Operation-Webpage/](https://shinpark43.github.io/ASU-Facilities-Hours-of-Operation-Webpage/)

## 🏗️ Architecture

- **Frontend**: React (GitHub Pages)
- **Backend**: Node.js/Express + SQLite (Railway)
- **Database**: SQLite with persistent storage
- **Hosting**: Free tier (GitHub Pages + Railway)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm

### Local Development
```bash
# Clone repository
git clone https://github.com/shinpark43/ASU-Facilities-Hours-of-Operation-Webpage.git
cd ASU-Facilities-Hours-of-Operation-Webpage

# Backend setup
cd backend
npm install
npm run init-db
npm run dev  # Runs on http://localhost:3001

# Frontend setup (in new terminal)
cd frontend
npm install
npm start    # Runs on http://localhost:3000
```

## 📁 Project Structure

```
├── frontend/                # React application
│   ├── src/
│   │   ├── components/      # Layout, Sidebar
│   │   ├── pages/          # Library, Gym, Dining, About
│   │   ├── services/       # API integration
│   │   └── styles/         # CSS with responsive design
│   └── package.json
├── backend/                # Node.js API server
│   ├── src/
│   │   ├── database.js     # SQLite operations
│   │   └── routes/         # API endpoints
│   ├── scripts/
│   │   └── init-db.js     # Database setup
│   ├── data/              # SQLite database
│   └── server.js
└── .github/workflows/     # CI/CD automation
```

## 🖥️ Features

### Frontend
- **ASU Branding**: Royal blue & gold color scheme
- **Dark/Light Theme**: Toggle with localStorage persistence
- **Responsive Design**: Mobile-optimized navigation
- **Four Sections**: Library, Recreation Center, Dining, About

### Backend
- **REST API**: Facility hours endpoints
- **SQLite Database**: Persistent data storage
- **Health Monitoring**: API status endpoints

## 🔧 API Endpoints

```
GET /api/health                    # Health check
GET /api/facilities/library        # Library hours
GET /api/facilities/recreation     # Recreation center hours  
GET /api/facilities/dining         # Dining hours
```

**Base URL**: `https://asu-facilities-hours-of-operation-webpage-production.up.railway.app`

## 🚀 Deployment

### Frontend (GitHub Pages)
- **Repository**: `shinpark43/ASU-Facilities-Hours-of-Operation-Webpage`
- **Deployment**: Automatic on push to main branch
- **URL**: [https://shinpark43.github.io/ASU-Facilities-Hours-of-Operation-Webpage/](https://shinpark43.github.io/ASU-Facilities-Hours-of-Operation-Webpage/)

### Backend (Railway)
- **Service**: Node.js with persistent SQLite storage
- **URL**: `https://asu-facilities-hours-of-operation-webpage-production.up.railway.app`
- **Deployment**: Automatic on push to main branch

## 🎨 UI Components

- **Library**: 3 sections (Main Library, IT Desk, West Texas Collection)
- **Recreation**: 5+ facilities (Fitness Center, Pool, Courts, etc.)
- **Dining**: 11+ locations (CAF, Marketplace, Coffee shops, etc.)
- **About**: Information about the service and how to contribute

## 🔧 Configuration

### Environment Variables

**Frontend**:
```bash
REACT_APP_API_URL=https://asu-facilities-hours-of-operation-webpage-production.up.railway.app
```

**Backend**:
```bash
PORT=3001
NODE_ENV=production
```

## 📱 Responsive Design

- **Desktop**: Sidebar navigation with full layout
- **Tablet**: Condensed sidebar with optimized spacing
- **Mobile**: Dropdown navigation with stacked layout

## 🔄 Technology Stack

- **Frontend**: React, CSS Custom Properties, Container Queries
- **Backend**: Express.js, better-sqlite3, CORS
- **Deployment**: GitHub Actions, GitHub Pages, Railway
- **Database**: SQLite with automated initialization

---

**Made for ASU students, faculty, and staff** 🔱
