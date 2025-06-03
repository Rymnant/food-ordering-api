const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { initDatabase } = require('./database/db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 6900;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Import routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const routes = require('./routes/routes');

// Use routes dengan urutan yang benar
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/', routes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        error: 'Something went wrong!'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found'
    });
});

// Initialize database and start server
initDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`Food Ordering API server is running on port ${PORT}`);
        console.log(`Visit: http://localhost:${PORT}/health`);
        console.log(`Admin login: POST http://localhost:${PORT}/auth/admin/login`);
        console.log(`Customer register: POST http://localhost:${PORT}/auth/customer/register`);
    });
}).catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
});

module.exports = app;