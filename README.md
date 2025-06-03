# 🏫 ASU Facilities Hours of Operation Widget

A dynamic web application that displays real-time hours for ASU facilities including the library, recreation center, and dining locations. Features automated web scraping with a React frontend and Node.js backend.

## 🏗️ Architecture Overview

### **Option 1: Dynamic API** (Current Implementation)
- **Frontend**: React (Vercel/Netlify)
- **Backend**: Node.js/Express + SQLite (Render/Railway) 
- **Scraper**: GitHub Actions (scheduled daily)
- **Database**: SQLite with persistent storage
- **Cost**: $0 (using free hosting tiers)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Git

### 1. Clone Repository
```bash
git clone <your-repo-url>
cd ASU-Facilities-Hours-of-Operation-Widget
```

### 2. Backend Setup
```bash
cd backend
npm install
npm run init-db
npm run dev
```

Backend will run on `http://localhost:3001`

### 3. Frontend Setup
```bash
cd frontend
npm install
npm start
```

Frontend will run on `http://localhost:3000`

## 📁 Project Structure

```
ASU-Facilities-Hours-of-Operation-Widget/
├── frontend/                 # React application
│   ├── public/
│   │   ├── components/       # React components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API service layer
│   │   └── styles/          # CSS styles
│   └── package.json
├── backend/                 # Node.js API server
│   ├── src/
│   │   ├── database.js      # SQLite operations
│   │   ├── scraper.js       # Web scraping logic
│   │   └── routes/          # API endpoints
│   ├── scripts/
│   │   ├── init-db.js      # Database initialization
│   │   └── scraper.js      # Standalone scraper
│   ├── data/               # SQLite database
│   └── server.js           # Express server
├── .github/workflows/      # GitHub Actions
└── README.md
```

## 🖥️ Features

### Frontend
- **Modern React UI** with ASU branding (royal blue & gold)
- **Light/Dark Theme** toggle with localStorage persistence
- **Responsive Design** with mobile-optimized dropdowns
- **Four Main Sections**: Library, Recreation, Dining, About
- **Real-time Data** from backend API with fallback to mock data

### Backend
- **RESTful API** endpoints for facility hours
- **SQLite Database** with automated scraping logs
- **Scheduled Scraping** via node-cron (local) and GitHub Actions (production)
- **Error Handling** with detailed logging
- **Health Monitoring** endpoints

### Automation
- **Daily Scraping** at 00:01 AM CST via GitHub Actions
- **Auto-deployment** on git push for both frontend and backend
- **Zero-cost Operation** using free hosting tiers

## 🔧 API Endpoints

### Core Endpoints
- `GET /api/health` - Health check
- `GET /api/facilities/library` - Library hours
- `GET /api/facilities/recreation` - Recreation center hours  
- `GET /api/facilities/dining` - Dining hours

### Admin Endpoints
- `POST /api/facilities/:type/hours` - Update hours (scraper)
- `GET /api/facilities/logs/recent` - Scraping logs

## 🚀 Deployment

### Frontend (Vercel - Recommended)
1. Connect GitHub repository to Vercel
2. Set build directory to `frontend`
3. Add environment variable: `REACT_APP_API_URL=https://your-backend-url.render.com`
4. Deploy automatically on push

### Backend (Render - Recommended)
1. Connect GitHub repository to Render
2. Set service type to "Web Service"
3. Set build command: `cd backend && npm install`
4. Set start command: `cd backend && npm start`
5. Add persistent disk for SQLite database

### GitHub Actions Setup
1. Add repository secret: `API_BASE_URL` (your backend URL)
2. Workflow runs automatically daily at 00:01 AM CST
3. Manual trigger available via Actions tab

## 🛠️ Development

### Running Locally
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend  
cd frontend
npm start
```

### Testing API
```bash
# Health check
curl http://localhost:3001/api/health

# Get library hours
curl http://localhost:3001/api/facilities/library

# Manual scraping
cd backend
npm run scrape
```

### Adding New Facilities
1. Update `insertDefaultFacilities()` in `backend/src/database.js`
2. Add scraping logic in `backend/src/scraper.js`
3. Update frontend components if needed

## 📊 Database Schema

### Facilities Table
Stores facility information (name, type, description, website)

### Facility Hours Table  
Stores operating hours by facility, section, and day of week

### Scrape Log Table
Tracks scraping activities with timestamps and status

## 🔄 Data Flow

1. **GitHub Actions** runs daily scraper
2. **Scraper** extracts hours from ASU websites
3. **Backend API** stores data in SQLite database
4. **Frontend** fetches data via API calls
5. **Users** see real-time facility hours

## 🎨 UI Features

### Theme System
- Light/dark mode toggle in header
- ASU brand colors (royal blue #003f7f, gold #ffc425)
- Smooth transitions and modern design

### Mobile Optimization
- Responsive layout for all screen sizes
- Dropdown navigation on mobile devices
- Touch-friendly interface elements

### Components
- `Library` - 3 sections (Main Library, IT Desk, West Texas Collection)
- `Recreation` - 5+ facilities (Fitness Center, Pool, etc.)
- `Dining` - 11+ locations (CAF, TEA Co, etc.)
- `About` - Service information and contact details

## 🔐 Configuration

### Environment Variables

**Frontend** (`.env`):
```bash
REACT_APP_API_URL=http://localhost:3001    # Development
REACT_APP_API_URL=https://your-backend-url  # Production
```

**Backend** (environment):
```bash
PORT=3001                    # Auto-provided by hosting
NODE_ENV=production          # For production builds
ALLOWED_ORIGINS=https://your-frontend-url  # CORS setting
```

## 📈 Monitoring

- **Health Endpoint**: `/api/health` for uptime monitoring
- **Scrape Logs**: `/api/facilities/logs/recent` for debugging
- **Console Logs**: Detailed scraping and API request logging

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make changes and test locally
4. Commit changes: `git commit -m "Description"`
5. Push to branch: `git push origin feature-name`
6. Create a Pull Request

## 📞 Contact

For facility additions or technical issues:
- **Email**: spark43@angelo.edu
- **Required Info**: Facility name and location

## 📄 License

MIT License - see LICENSE file for details

---

## 🎯 Next Steps

1. **Replace Mock Data**: Update scraper with actual ASU website scraping logic
2. **Add More Facilities**: Expand to include additional campus locations
3. **Enhanced Features**: Add facility search, favorites, notifications
4. **Performance**: Implement caching and optimization strategies

Built with ❤️ for the ASU community
