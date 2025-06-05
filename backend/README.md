# ASU Facilities Hours Backend API

A Node.js/Express backend API that serves facility hours data with automated web scraping capabilities.

## 🏗️ Architecture

- **Framework**: Express.js
- **Database**: SQLite (with better-sqlite3)
- **Scraping**: Puppeteer + Cheerio
- **Scheduling**: node-cron
- **Deployment**: Render/Railway (recommended)

## 📦 Installation

```bash
# Install dependencies
npm install

# Initialize the database
npm run init-db

# Start development server
npm run dev

# Or start production server
npm start
```

## 🚀 API Endpoints

### Health Check
- `GET /api/health` - Server health status
- `GET /` - API documentation

### Facilities
- `GET /api/facilities` - Get all facilities
- `GET /api/facilities/library` - Get library hours
- `GET /api/facilities/recreation` - Get recreation center hours
- `GET /api/facilities/dining` - Get dining hours
- `GET /api/facilities/:type` - Get hours for any facility type

### Admin/Scraper Endpoints
- `POST /api/facilities/:type/hours` - Update hours (for scraper)
- `GET /api/facilities/logs/recent` - Get scraping logs

## 🔧 Scripts

```bash
# Initialize database
npm run init-db

# Run scraper manually
npm run scrape                 # All facilities
npm run scrape library         # Library only
npm run scrape recreation      # Recreation only
npm run scrape dining          # Dining only

# Development
npm run dev                    # Start with nodemon

# Production
npm start                      # Start server
```

## 📊 Database Schema

### Facilities Table
```sql
CREATE TABLE facilities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  description TEXT,
  website_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Facility Hours Table
```sql
CREATE TABLE facility_hours (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  facility_id INTEGER NOT NULL,
  section_name TEXT NOT NULL,
  day_of_week TEXT NOT NULL,
  open_time TEXT,
  close_time TEXT,
  is_closed BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (facility_id) REFERENCES facilities (id),
  UNIQUE(facility_id, section_name, day_of_week)
);
```

### Scrape Log Table
```sql
CREATE TABLE scrape_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  facility_type TEXT NOT NULL,
  status TEXT NOT NULL,
  message TEXT,
  scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 🔄 Automated Scraping

The scraper runs automatically:
- **Local**: Daily at 00:01 AM via node-cron
- **Production**: Daily via GitHub Actions

### GitHub Actions Workflow
- Triggers: Daily schedule + manual dispatch
- Updates the production database via API calls
- Includes error handling and notifications

## 🚀 Deployment

### Option 1: Render (Recommended)
1. Connect your GitHub repository
2. Set service type to "Web Service"
3. Set build command: `cd backend && npm install`
4. Set start command: `cd backend && npm start`
5. Add environment variables if needed

### Option 2: Railway
1. Connect GitHub repository
2. Railway auto-detects Node.js
3. Set root directory to `backend`
4. Deploy automatically on push

### Environment Variables
```bash
# Required for production
PORT=3001                    # Auto-provided by hosting
NODE_ENV=production

# Optional
DATABASE_PATH=./data/facilities.db
SCRAPER_TIMEOUT=30000
ALLOWED_ORIGINS=https://your-frontend.vercel.app
```

## 🧪 Testing

```bash
# Start the server
npm run dev

# Test endpoints
curl http://localhost:3001/api/health
curl http://localhost:3001/api/facilities/library
curl http://localhost:3001/api/facilities/recreation
curl http://localhost:3001/api/facilities/dining

# Test scraper
npm run scrape library
```

## 📁 Project Structure

```
backend/
├── src/
│   ├── database.js          # SQLite database operations
│   ├── scraper.js           # Web scraping logic
│   └── routes/
│       └── facilities.js    # API route handlers
├── scripts/
│   ├── init-db.js          # Database initialization
│   └── scraper.js          # Standalone scraper
├── data/
│   └── facilities.db       # SQLite database file
├── package.json
├── server.js               # Main Express server
└── README.md
```

## 🔧 Customization

### Adding New Facilities
1. Update `insertDefaultFacilities()` in `src/database.js`
2. Add scraping logic in `src/scraper.js`
3. Update API routes if needed

### Modifying Scrape Schedule
- **Local**: Edit cron expression in `server.js`
- **GitHub Actions**: Edit schedule in `.github/workflows/scrape-hours.yml`

## 🛠️ Development Notes

### Mock Data
The scraper currently uses mock data. Replace the mock data in `src/scraper.js` with actual scraping logic from your Electron app.

### Database Location
- **Development**: `./data/facilities.db`
- **Production**: Persistent storage provided by hosting service

### CORS Configuration
Configured to allow requests from:
- `http://localhost:3000` (React dev server)
- Your production frontend URL

## 📈 Monitoring

- Health check endpoint: `/api/health`
- Recent scrape logs: `/api/facilities/logs/recent`
- Server logs include detailed scraping information

## 🔐 Security

- Input validation on all endpoints
- CORS properly configured
- Environment variables for sensitive data
- Error handling without exposing internal details 