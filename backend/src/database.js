const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Database file path
const dbPath = path.join(__dirname, '..', 'data', 'facilities.db');

let db;

// Initialize database connection and create tables
function init() {
  return new Promise((resolve, reject) => {
    try {
      // Create data directory if it doesn't exist
      const dataDir = path.dirname(dbPath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }

      // Open database connection
      db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('❌ Database connection failed:', err);
          reject(err);
          return;
        }

        // Enable WAL mode for better performance
        db.run('PRAGMA journal_mode = WAL', (err) => {
          if (err) {
            console.warn('⚠️ Could not enable WAL mode:', err.message);
          }
        });

        // Create tables
        createTables()
          .then(() => {
            console.log('✅ Database initialized successfully');
            console.log(`📍 Database location: ${dbPath}`);
            resolve();
          })
          .catch(reject);
      });
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      reject(error);
    }
  });
}

// Create database tables
function createTables() {
  return new Promise((resolve, reject) => {
    const queries = [
      // Facilities table - stores general facility information
      `CREATE TABLE IF NOT EXISTS facilities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL,
        description TEXT,
        website_url TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Hours table - stores operating hours for each facility section
      `CREATE TABLE IF NOT EXISTS facility_hours (
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
        FOREIGN KEY (facility_id) REFERENCES facilities (id)
      )`,
      
      // Scrape log table - tracks scraping activities
      `CREATE TABLE IF NOT EXISTS scrape_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        facility_type TEXT NOT NULL,
        status TEXT NOT NULL,
        message TEXT,
        scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    let completed = 0;
    const total = queries.length;

    queries.forEach((query, index) => {
      db.run(query, (err) => {
        if (err) {
          reject(err);
          return;
        }
        
        completed++;
        if (completed === total) {
          // Insert default facilities after tables are created
          insertDefaultFacilities()
            .then(resolve)
            .catch(reject);
        }
      });
    });
  });
}

// Insert default facility records
function insertDefaultFacilities() {
  return new Promise((resolve, reject) => {
    const facilities = [
      {
        name: 'Porter Henderson Library',
        type: 'library',
        description: 'Academic resources, research support, and study spaces',
        website_url: 'https://www.angelo.edu/library/hours.php'
      },
      {
        name: 'Recreation Center',
        type: 'recreation',
        description: 'Fitness facilities, swimming, climbing, and recreational activities',
        website_url: 'https://www.angelo.edu/life-on-campus/play/university-recreation/urec-hours-of-operation.php'
      },
      {
        name: 'Dining Services',
        type: 'dining',
        description: 'Campus dining options, coffee shops, and food courts',
        website_url: 'https://dineoncampus.com/Angelo/hours-of-operation'
      },
      {
        name: 'Ram tram',
        type: 'ram_tram',
        description: 'Campus transportation system',
        website_url: 'https://www.angelo.edu/life-on-campus/live/parking-and-transportation/ram-tram.php'
      }
    ];

    const query = `INSERT OR IGNORE INTO facilities (name, type, description, website_url) VALUES (?, ?, ?, ?)`;
    
    let completed = 0;
    const total = facilities.length;

    if (total === 0) {
      resolve();
      return;
    }

    facilities.forEach(facility => {
      db.run(query, [facility.name, facility.type, facility.description, facility.website_url], (err) => {
        if (err) {
          console.warn(`⚠️ Could not insert facility ${facility.name}:`, err.message);
        }
        
        completed++;
        if (completed === total) {
          resolve();
        }
      });
    });
  });
}

// Get all facilities
function getAllFacilities() {
  return new Promise((resolve, reject) => {
    const query = 'SELECT * FROM facilities ORDER BY name';
    db.all(query, [], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

// Get facility by type
function getFacilityByType(type) {
  return new Promise((resolve, reject) => {
    const query = 'SELECT * FROM facilities WHERE type = ?';
    db.get(query, [type], (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

// Get hours for a specific facility
function getFacilityHours(facilityType) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        f.name as facility_name,
        f.type as facility_type,
        f.description,
        f.website_url,
        fh.section_name,
        fh.day_of_week,
        fh.open_time,
        fh.close_time,
        fh.is_closed,
        fh.notes,
        fh.updated_at
      FROM facilities f
      LEFT JOIN facility_hours fh ON f.id = fh.facility_id
      WHERE f.type = ?
      ORDER BY fh.section_name, 
        CASE fh.day_of_week
          WHEN 'Sunday' THEN 0
          WHEN 'Monday' THEN 1
          WHEN 'Tuesday' THEN 2
          WHEN 'Wednesday' THEN 3
          WHEN 'Thursday' THEN 4
          WHEN 'Friday' THEN 5
          WHEN 'Saturday' THEN 6
        END
    `;
    
    db.all(query, [facilityType], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

// Update facility hours - optimized with batch operations and prepared statements
async function updateFacilityHours(facilityType, hoursData) {
  const facility = await getFacilityByType(facilityType);
  if (!facility) {
    throw new Error(`Facility type '${facilityType}' not found`);
  }

  return new Promise((resolve, reject) => {
    db.serialize(() => {
      let stmt;
      
      db.run('BEGIN TRANSACTION', (err) => {
        if (err) {
          reject(err);
          return;
        }

        // Delete existing hours for this facility
        db.run('DELETE FROM facility_hours WHERE facility_id = ?', [facility.id], (err) => {
          if (err) {
            db.run('ROLLBACK');
            reject(err);
            return;
          }

          if (hoursData.length === 0) {
            db.run('COMMIT', (err) => {
              if (err) reject(err);
              else resolve();
            });
            return;
          }

          // Prepare statement once for all inserts
          stmt = db.prepare(`
            INSERT INTO facility_hours 
            (facility_id, section_name, day_of_week, open_time, close_time, is_closed, notes, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          `);

          // Batch insert all hours data
          try {
            hoursData.forEach(hours => {
              stmt.run([
                facility.id,
                hours.section_name,
                hours.day_of_week,
                hours.open_time,
                hours.close_time,
                hours.is_closed || false,
                hours.notes || null
              ]);
            });

            stmt.finalize((err) => {
              if (err) {
                db.run('ROLLBACK');
                reject(err);
                return;
              }

              db.run('COMMIT', (err) => {
                if (err) reject(err);
                else resolve();
              });
            });
          } catch (error) {
            stmt.finalize();
            db.run('ROLLBACK');
            reject(error);
          }
        });
      });
    });
  });
}

// Log scraping activity
function logScrapeActivity(facilityType, status, message = null) {
  return new Promise((resolve, reject) => {
    const query = `INSERT INTO scrape_log (facility_type, status, message) VALUES (?, ?, ?)`;
    
    db.run(query, [facilityType, status, message], (err) => {
      if (err) {
        console.warn(`⚠️ Could not log scrape activity:`, err.message);
        resolve(); // Don't fail the whole operation for logging issues
      } else {
        resolve();
      }
    });
  });
}

// Get recent scrape logs
function getRecentScrapeLogs(limit = 10) {
  return new Promise((resolve, reject) => {
    const query = `SELECT * FROM scrape_log ORDER BY scraped_at DESC LIMIT ?`;
    
    db.all(query, [limit], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

// Close database connection
function close() {
  return new Promise((resolve) => {
    if (db) {
      db.close((err) => {
        if (err) {
          console.error('❌ Error closing database:', err);
        } else {
          console.log('✅ Database connection closed');
        }
        resolve();
      });
    } else {
      resolve();
    }
  });
}

module.exports = {
  init,
  getAllFacilities,
  getFacilityByType,
  getFacilityHours,
  updateFacilityHours,
  logScrapeActivity,
  getRecentScrapeLogs,
  close
}; 