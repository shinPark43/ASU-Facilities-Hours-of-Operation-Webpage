const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Separate database file for tutoring data
const dbPath = path.join(__dirname, '..', 'data', 'tutoring.db');

let db;

// Initialize tutoring database connection and create tables
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
          console.error('❌ Tutoring database connection failed:', err);
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
            console.log('✅ Tutoring database initialized successfully');
            console.log(`📍 Tutoring database location: ${dbPath}`);
            resolve();
          })
          .catch(reject);
      });
    } catch (error) {
      console.error('❌ Tutoring database initialization failed:', error);
      reject(error);
    }
  });
}

// Create database tables
function createTables() {
  return new Promise((resolve, reject) => {
    const queries = [
      // Subjects table - stores subject categories (Biology, Chemistry, etc.)
      `CREATE TABLE IF NOT EXISTS subjects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        display_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,
      
      // Courses table - stores individual courses within subjects
      `CREATE TABLE IF NOT EXISTS courses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subject_id INTEGER NOT NULL,
        code TEXT,
        full_name TEXT NOT NULL,
        has_online BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (subject_id) REFERENCES subjects (id)
      )`,
      
      // Tutoring sessions table - stores hours for each course
      `CREATE TABLE IF NOT EXISTS tutoring_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        course_id INTEGER NOT NULL,
        day_of_week TEXT NOT NULL,
        time_range TEXT,
        location TEXT,
        is_online BOOLEAN DEFAULT FALSE,
        is_tba BOOLEAN DEFAULT FALSE,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (course_id) REFERENCES courses (id)
      )`,
      
      // Scrape log table - tracks scraping activities
      `CREATE TABLE IF NOT EXISTS tutoring_scrape_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        status TEXT NOT NULL,
        message TEXT,
        subjects_count INTEGER,
        courses_count INTEGER,
        sessions_count INTEGER,
        scraped_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    let completed = 0;
    const total = queries.length;

    queries.forEach((query) => {
      db.run(query, (err) => {
        if (err) {
          reject(err);
          return;
        }
        
        completed++;
        if (completed === total) {
          resolve();
        }
      });
    });
  });
}

// Get all subjects with their courses
function getAllSubjects() {
  return new Promise((resolve, reject) => {
    const query = 'SELECT * FROM subjects ORDER BY display_order, name';
    db.all(query, [], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

// Get all courses for a subject
function getCoursesBySubject(subjectId) {
  return new Promise((resolve, reject) => {
    const query = 'SELECT * FROM courses WHERE subject_id = ? ORDER BY code';
    db.all(query, [subjectId], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

// Get tutoring sessions for a course
function getSessionsByCourse(courseId) {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT * FROM tutoring_sessions 
      WHERE course_id = ? 
      ORDER BY 
        CASE day_of_week
          WHEN 'Sunday' THEN 0
          WHEN 'Monday' THEN 1
          WHEN 'Tuesday' THEN 2
          WHEN 'Wednesday' THEN 3
          WHEN 'Thursday' THEN 4
          WHEN 'Friday' THEN 5
          WHEN 'Saturday' THEN 6
        END
    `;
    db.all(query, [courseId], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

// Get all tutoring data (subjects, courses, and sessions) in a structured format
function getAllTutoringData() {
  return new Promise((resolve, reject) => {
    const query = `
      SELECT 
        s.id as subject_id,
        s.name as subject_name,
        s.display_order,
        c.id as course_id,
        c.code as course_code,
        c.full_name as course_name,
        c.has_online,
        ts.id as session_id,
        ts.day_of_week,
        ts.time_range,
        ts.location,
        ts.is_online,
        ts.is_tba,
        ts.updated_at
      FROM subjects s
      LEFT JOIN courses c ON s.id = c.subject_id
      LEFT JOIN tutoring_sessions ts ON c.id = ts.course_id
      ORDER BY 
        s.display_order, 
        s.name, 
        c.code,
        CASE ts.day_of_week
          WHEN 'Sunday' THEN 0
          WHEN 'Monday' THEN 1
          WHEN 'Tuesday' THEN 2
          WHEN 'Wednesday' THEN 3
          WHEN 'Thursday' THEN 4
          WHEN 'Friday' THEN 5
          WHEN 'Saturday' THEN 6
        END
    `;
    
    db.all(query, [], (err, rows) => {
      if (err) {
        reject(err);
      } else {
        // Transform flat rows into nested structure
        const data = formatTutoringData(rows);
        resolve(data);
      }
    });
  });
}

// Helper function to format flat query results into nested structure
function formatTutoringData(rows) {
  const subjects = {};
  let lastUpdated = null;

  rows.forEach(row => {
    if (!row.subject_name) return;

    // Track last updated timestamp
    if (row.updated_at && (!lastUpdated || row.updated_at > lastUpdated)) {
      lastUpdated = row.updated_at;
    }

    // Initialize subject if not exists
    if (!subjects[row.subject_name]) {
      subjects[row.subject_name] = {
        id: row.subject_id,
        name: row.subject_name,
        courses: {}
      };
    }

    // Skip if no course data
    if (!row.course_name) return;

    // Initialize course if not exists
    const courseName = row.course_name;
    if (!subjects[row.subject_name].courses[courseName]) {
      subjects[row.subject_name].courses[courseName] = {
        id: row.course_id,
        code: row.course_code,
        name: courseName,
        has_online: row.has_online,
        sessions: []
      };
    }

    // Add session if exists
    if (row.session_id) {
      subjects[row.subject_name].courses[courseName].sessions.push({
        id: row.session_id,
        day: row.day_of_week,
        time: row.time_range,
        location: row.location,
        is_online: row.is_online,
        is_tba: row.is_tba
      });
    }
  });

  return {
    subjects,
    last_updated: lastUpdated
  };
}

// Update all tutoring data - clears existing and inserts new
async function updateTutoringData(tutoringData) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION', (err) => {
        if (err) {
          reject(err);
          return;
        }

        // Clear existing data
        db.run('DELETE FROM tutoring_sessions');
        db.run('DELETE FROM courses');
        db.run('DELETE FROM subjects', async (err) => {
          if (err) {
            db.run('ROLLBACK');
            reject(err);
            return;
          }

          try {
            let subjectOrder = 0;
            let totalCourses = 0;
            let totalSessions = 0;

            // Insert subjects, courses, and sessions
            for (const [subjectName, courses] of Object.entries(tutoringData)) {
              // Insert subject
              const subjectId = await insertSubject(subjectName, subjectOrder++);
              
              for (const [courseName, sessions] of Object.entries(courses)) {
                // Extract course code from course name
                const codeMatch = courseName.match(/^([A-Z]{2,4}\s*\d{4})/);
                const courseCode = codeMatch ? codeMatch[1] : null;
                const hasOnline = sessions.some(s => 
                  s.location?.toLowerCase().includes('upswing') || 
                  s.location?.toLowerCase().includes('online')
                );
                
                // Insert course
                const courseId = await insertCourse(subjectId, courseCode, courseName, hasOnline);
                totalCourses++;
                
                // Insert sessions
                for (const session of sessions) {
                  const isTba = session.day === 'TBA' || session.time === 'TBA';
                  const isOnline = session.location?.toLowerCase().includes('upswing') || 
                                   session.location?.toLowerCase().includes('online');
                  
                  await insertSession(courseId, session.day, session.time, session.location, isOnline, isTba);
                  totalSessions++;
                }
              }
            }

            db.run('COMMIT', (err) => {
              if (err) {
                reject(err);
              } else {
                resolve({
                  subjects_count: subjectOrder,
                  courses_count: totalCourses,
                  sessions_count: totalSessions
                });
              }
            });
          } catch (error) {
            db.run('ROLLBACK');
            reject(error);
          }
        });
      });
    });
  });
}

// Helper function to insert a subject
function insertSubject(name, displayOrder) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO subjects (name, display_order) VALUES (?, ?)',
      [name, displayOrder],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

// Helper function to insert a course
function insertCourse(subjectId, code, fullName, hasOnline) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO courses (subject_id, code, full_name, has_online) VALUES (?, ?, ?, ?)',
      [subjectId, code, fullName, hasOnline ? 1 : 0],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

// Helper function to insert a session
function insertSession(courseId, dayOfWeek, timeRange, location, isOnline, isTba) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO tutoring_sessions 
       (course_id, day_of_week, time_range, location, is_online, is_tba, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [courseId, dayOfWeek, timeRange, location, isOnline ? 1 : 0, isTba ? 1 : 0],
      function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      }
    );
  });
}

// Log scraping activity
function logScrapeActivity(status, message, counts = {}) {
  return new Promise((resolve, reject) => {
    const query = `
      INSERT INTO tutoring_scrape_log 
      (status, message, subjects_count, courses_count, sessions_count) 
      VALUES (?, ?, ?, ?, ?)
    `;
    
    db.run(query, [
      status, 
      message, 
      counts.subjects_count || 0,
      counts.courses_count || 0,
      counts.sessions_count || 0
    ], (err) => {
      if (err) {
        console.warn('⚠️ Could not log tutoring scrape activity:', err.message);
        resolve();
      } else {
        resolve();
      }
    });
  });
}

// Get recent scrape logs
function getRecentScrapeLogs(limit = 10) {
  return new Promise((resolve, reject) => {
    const query = `SELECT * FROM tutoring_scrape_log ORDER BY scraped_at DESC LIMIT ?`;
    
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
          console.error('❌ Error closing tutoring database:', err);
        } else {
          console.log('✅ Tutoring database connection closed');
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
  getAllSubjects,
  getCoursesBySubject,
  getSessionsByCourse,
  getAllTutoringData,
  updateTutoringData,
  logScrapeActivity,
  getRecentScrapeLogs,
  close
};
