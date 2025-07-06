# ASU Facilities Hours of Operation

A high-performance web application providing real-time operating hours for ASU facilities including library, recreation center, and dining locations. Features automated web scraping, intelligent caching, and support for multiple time ranges per day.

**🌐 Live Application**: [https://shinpark43.github.io/ASU-Facilities-Hours-of-Operation-Webpage/](https://shinpark43.github.io/ASU-Facilities-Hours-of-Operation-Webpage/)

## 🏗️ Architecture

- **Frontend**: React with responsive design (GitHub Pages)
- **Backend**: Node.js/Express with performance optimizations (Railway)
- **Database**: SQLite with batch operations and prepared statements
- **Scraping**: Puppeteer-based automated data collection
- **Caching**: 5-minute API response caching for optimal performance
- **Hosting**: GitHub Pages + Railway with CI/CD automation

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
npm run init-db      # Initialize SQLite database
npm run scrape       # Run initial data scraping
npm start           # Production server on http://localhost:3001
# OR
npm run dev         # Development server with nodemon

# Frontend setup (in new terminal)
cd frontend
npm install
npm start           # Runs on http://localhost:3000
```

### Available Scripts
```bash
# Backend
npm run scrape [facility]  # Scrape all facilities or specific one (library|recreation|dining)
npm run init-db            # Initialize database schema
npm start                  # Production server
npm run dev                # Development server with auto-reload

# Frontend  
npm start                  # Development server
npm run build              # Production build
npm test                   # Run test suite
```

## 📁 Project Structure

```
├── frontend/                    # React application
│   ├── src/
│   │   ├── components/          # Layout, Sidebar, FacilityTabs
│   │   ├── pages/              # Library, Gym, Dining, About
│   │   ├── services/           # API integration with fallback support
│   │   └── styles/             # CSS with responsive design
│   └── package.json
├── backend/                    # Node.js API server with optimizations
│   ├── src/
│   │   ├── database.js         # SQLite with batch operations & prepared statements
│   │   ├── scraper.js          # Legacy scraper interface
│   │   ├── ScraperManager.js   # Optimized browser management & parallel scraping
│   │   └── routes/             # API endpoints with caching & rate limiting
│   ├── scripts/
│   │   ├── scraper.js          # Standalone scraper with CLI support
│   │   └── init-db.js          # Database initialization
│   ├── data/                   # SQLite database storage
│   └── server.js              # Express server with graceful shutdown
├── test-multiple-ranges.js     # Test suite for multiple time ranges
├── test-optimizations.js       # Performance optimization test suite
├── backend-improvements.md     # Performance optimization documentation
└── .github/workflows/          # CI/CD automation
```

## 🖥️ Features

### Frontend
- **ASU Branding**: Royal blue & gold color scheme with official styling
- **Responsive Design**: Mobile-first approach with container queries
- **Tab Navigation**: Facility-specific tabs with dropdown fallback
- **Real-time Data**: Live facility hours with automatic updates
- **Fallback Support**: Mock data when API is unavailable
- **Four Sections**: Library, Recreation Center, Dining, About

### Backend Performance Optimizations
- **70-80% Faster Database**: Batch operations with prepared statements
- **60% Faster Scraping**: Parallel execution with browser reuse
- **50% Faster API**: Intelligent 5-minute response caching
- **40% Less Memory**: Optimized resource management and cleanup
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Graceful Shutdown**: Clean resource cleanup on server stop

### Data Collection & Processing
- **Automated Scraping**: Daily scheduled data collection at 12:01 AM CST
- **Multiple Time Ranges**: Support for complex dining schedules (e.g., "7:00a-9:00a 11:30a-1:30p 5:00p-7:00p")
- **Error Handling**: Robust scraping with fallback mechanisms
- **Data Validation**: Comprehensive testing and validation suites
- **Real-time Updates**: Live data from official ASU facility websites

### API Features
- **REST Endpoints**: RESTful API with standardized responses
- **Health Monitoring**: Enhanced health checks with memory monitoring
- **Response Caching**: Intelligent caching with cache indicators
- **Error Handling**: Comprehensive error responses and logging
- **CORS Support**: Cross-origin requests enabled for frontend integration

## 🔧 API Endpoints

```bash
GET /api/health                     # Enhanced health check with memory stats
GET /api/facilities                 # Get all facilities metadata
GET /api/facilities/library         # Library hours with caching
GET /api/facilities/recreation      # Recreation center hours with caching
GET /api/facilities/dining          # Dining hours with multiple time ranges
GET /api/facilities/:type           # Generic facility endpoint
POST /api/facilities/:type/hours    # Update facility hours (scraper only)
GET /api/facilities/logs/recent     # Recent scrape activity logs
```

**Base URL**: `https://asu-facilities-hours-of-operation-webpage-production.up.railway.app`

### Response Format
```json
{
  "success": true,
  "data": {
    "name": "Dining Services",
    "sections": {
      "The CAF": {
        "Monday": "7:00 AM - 9:00 AM\n11:30 AM - 1:30 PM\n5:00 PM - 7:00 PM"
      }
    },
    "last_updated": "2024-01-01T00:00:00.000Z"
  },
  "cached": true
}
```

### Health Check Response
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "database": "connected",
  "version": "1.0.0",
  "uptime": 3600.5,
  "memory": {
    "rss": "87.41 MB",
    "heapUsed": "15.54 MB",
    "heapTotal": "19.17 MB"
  }
}
```

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

### Frontend
- **React**: Modern functional components with hooks
- **CSS**: Custom properties, container queries, responsive design
- **Build**: Create React App with GitHub Pages deployment
- **API Integration**: Axios with fallback support

### Backend
- **Express.js**: RESTful API with middleware stack
- **Database**: SQLite with better-sqlite3 (batch operations, prepared statements)
- **Scraping**: Puppeteer with browser reuse and parallel execution
- **Performance**: express-rate-limit, response caching, O(n) algorithms
- **Scheduling**: node-cron for automated daily scraping
- **Process Management**: Graceful shutdown, error handling

### Development & Deployment
- **GitHub Actions**: CI/CD pipeline for automated deployment
- **GitHub Pages**: Frontend hosting with custom domain support
- **Railway**: Backend hosting with persistent SQLite storage
- **Version Control**: Git with conventional commits

### Performance Features
- **70-80% faster database operations** through batch processing
- **60% faster scraping** with parallel execution and browser reuse
- **50% faster API responses** with intelligent caching
- **40% memory reduction** through optimized resource management
- **Rate limiting** (100 requests per 15 minutes per IP)

## 🧪 Testing

### Test Suites
- **test-multiple-ranges.js**: Tests multiple time ranges functionality
- **test-optimizations.js**: Comprehensive performance testing
- **Manual testing**: API endpoints and frontend integration

### Running Tests
```bash
# Backend performance tests
cd backend
node ../test-optimizations.js

# Multiple time ranges tests
node ../test-multiple-ranges.js

# Frontend tests
cd frontend
npm test
```

## 🔧 Development Tools

### Backend Scripts
```bash
npm run scrape           # Run scraper for all facilities
npm run scrape library   # Scrape specific facility
npm run init-db          # Initialize database schema
npm run dev              # Development server with nodemon
npm start                # Production server
```

### Environment Setup
```bash
# Backend .env (optional)
PORT=3001
NODE_ENV=development

# Frontend .env.local
REACT_APP_API_URL=http://localhost:3001
```

---

**Made for ASU students, faculty, and staff** 🔱
