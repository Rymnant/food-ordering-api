const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// Initialize express app
const app = express();
const PORT = process.env.PORT || 6900;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Database setup
const dbPath = path.resolve(__dirname, 'food_ordering.db');
const dbExists = fs.existsSync(dbPath);

// Create database connection
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
  } else {
    console.log('Connected to the food_ordering database.');
    
    // If database doesn't exist, initialize it with schema
    if (!dbExists) {
      console.log('Initializing database with schema...');
      const schema = fs.readFileSync(path.resolve(__dirname, 'models/food_ordering.sql'), 'utf8');
      
      // Execute each statement separately
      const statements = schema.split(';').filter(stmt => stmt.trim());
      
      db.serialize(() => {
        statements.forEach((statement) => {
          if (statement.trim()) {
            db.run(`${statement};`, (err) => {
              if (err) {
                console.error('Error executing statement:', err.message);
                console.error('Statement:', statement);
              }
            });
          }
        });
        console.log('Database initialized successfully');
      });
    }
  }
});

// Import routes
const routes = require('./routes/routes')(db);

// Use routes
app.use('/', routes);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`API Endpoint: http://localhost:${PORT}`);
});