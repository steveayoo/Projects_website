const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

// Create database connection
const db = new sqlite3.Database('portfolio.db');

// Initialize database tables
db.serialize(() => {
    // Users table
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Projects table
    db.run(`
        CREATE TABLE IF NOT EXISTS projects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT NOT NULL,
            file_path TEXT,
            project_link TEXT,
            file_type TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Create default admin user
    const defaultPassword = bcrypt.hashSync('admin123', 10);
    db.run(
        `INSERT OR IGNORE INTO users (username, password) VALUES (?, ?)`,
        ['admin', defaultPassword],
        function(err) {
            if (err) {
                console.log('Admin user already exists');
            } else if (this.changes > 0) {
                console.log('Default admin user created');
            }
        }
    );
});

module.exports = db;