const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'food_ordering.db');

let db;

function getDatabase() {
    if (!db) {
        db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                console.error('Error opening database:', err.message);
            } else {
                console.log('Connected to SQLite database');
            }
        });
    }
    return db;
}

async function initDatabase() {
    return new Promise((resolve, reject) => {
        const database = getDatabase();
        
        // Check if tables exist first
        database.get("SELECT name FROM sqlite_master WHERE type='table' AND name='category'", (err, row) => {
            if (err) {
                reject(err);
                return;
            }
            
            if (row) {
                // Tables already exist
                console.log('Database tables already exist, skipping initialization');
                resolve();
                return;
            }
            
            // Tables don't exist, create them
            const sqlFile = path.join(__dirname, '../models/food_ordering.sql');
            
            fs.readFile(sqlFile, 'utf8', (err, sql) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                database.exec(sql, (err) => {
                    if (err) {
                        console.error('Error initializing database:', err.message);
                        reject(err);
                    } else {
                        console.log('Database initialized successfully with sample data');
                        resolve();
                    }
                });
            });
        });
    });
}

function closeDatabase() {
    if (db) {
        db.close((err) => {
            if (err) {
                console.error('Error closing database:', err.message);
            } else {
                console.log('Database connection closed');
            }
        });
    }
}

module.exports = {
    getDatabase,
    initDatabase,
    closeDatabase
};