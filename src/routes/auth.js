const express = require('express');
const bcrypt = require('bcryptjs');
const { getDatabase } = require('../database/db');
const { generateToken, authenticateCustomer, authenticateAdmin, authenticateAny } = require('../middleware/auth');

const router = express.Router();

// Customer register
router.post('/customer/register', async (req, res) => {
    try {
        const db = getDatabase();
        const { name, email, phone, address, password } = req.body;
        
        if (!name || !email || !password) {
            return res.status(400).json({ 
                success: false,
                error: 'Name, email, and password are required' 
            });
        }

        if (password.length < 6) {
            return res.status(400).json({ 
                success: false,
                error: 'Password must be at least 6 characters long' 
            });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        
        const sql = `INSERT INTO customer (name, email, phone, address, password) VALUES (?, ?, ?, ?, ?)`;
        
        db.run(sql, [name, email, phone, address, hashedPassword], function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ 
                        success: false,
                        error: 'Email already exists' 
                    });
                }
                return res.status(500).json({ 
                    success: false,
                    error: err.message 
                });
            }
            
            db.get('SELECT customer_id, name, email, phone, address FROM customer WHERE customer_id = ?', [this.lastID], (err, row) => {
                if (err) {
                    return res.status(500).json({ 
                        success: false,
                        error: err.message 
                    });
                }
                
                const token = generateToken(row, 'customer');
                
                res.status(201).json({
                    success: true,
                    message: 'Customer registered successfully',
                    data: {
                        user: row,
                        token,
                        user_type: 'customer'
                    }
                });
            });
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error processing registration' 
        });
    }
});

// Customer login  
router.post('/customer/login', async (req, res) => {
    try {
        const db = getDatabase();
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ 
                success: false,
                error: 'Email and password are required' 
            });
        }
        
        const sql = 'SELECT * FROM customer WHERE email = ? AND is_active = 1';
        
        db.get(sql, [email], async (err, user) => {
            if (err) {
                return res.status(500).json({ 
                    success: false,
                    error: err.message 
                });
            }
            
            if (!user || !user.password) {
                return res.status(401).json({ 
                    success: false,
                    error: 'Invalid credentials' 
                });
            }
            
            const isValidPassword = await bcrypt.compare(password, user.password);
            
            if (!isValidPassword) {
                return res.status(401).json({ 
                    success: false,
                    error: 'Invalid credentials' 
                });
            }
            
            const { password: _, ...userWithoutPassword } = user;
            const token = generateToken(userWithoutPassword, 'customer');
            
            res.json({
                success: true,
                message: 'Login successful',
                data: {
                    user: userWithoutPassword,
                    token,
                    user_type: 'customer'
                }
            });
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error processing login' 
        });
    }
});

// Admin login
router.post('/admin/login', async (req, res) => {
    try {
        const db = getDatabase();
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ 
                success: false,
                error: 'Username and password are required' 
            });
        }
        
        const sql = 'SELECT * FROM admin WHERE (username = ? OR email = ?) AND is_active = 1';
        
        db.get(sql, [username, username], async (err, user) => {
            if (err) {
                return res.status(500).json({ 
                    success: false,
                    error: err.message 
                });
            }
            
            if (!user || !user.password) {
                return res.status(401).json({ 
                    success: false,
                    error: 'Invalid credentials' 
                });
            }
            
            const isValidPassword = await bcrypt.compare(password, user.password);
            
            if (!isValidPassword) {
                return res.status(401).json({ 
                    success: false,
                    error: 'Invalid credentials' 
                });
            }
            
            const { password: _, ...userWithoutPassword } = user;
            const token = generateToken(userWithoutPassword, 'admin');
            
            res.json({
                success: true,
                message: 'Admin login successful',
                data: {
                    user: userWithoutPassword,
                    token,
                    user_type: 'admin'
                }
            });
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Error processing login' 
        });
    }
});

// Get customer profile
router.get('/customer/profile', authenticateCustomer, (req, res) => {
    const db = getDatabase();
    const userId = req.user.user_id;
    
    const sql = 'SELECT customer_id, name, email, phone, address, last_update FROM customer WHERE customer_id = ? AND is_active = 1';
    
    db.get(sql, [userId], (err, user) => {
        if (err) {
            return res.status(500).json({ 
                success: false,
                error: err.message 
            });
        }
        
        if (!user) {
            return res.status(404).json({ 
                success: false,
                error: 'User not found' 
            });
        }
        
        res.json({
            success: true,
            data: {
                ...user,
                user_type: 'customer'
            }
        });
    });
});

// Get admin profile
router.get('/admin/profile', authenticateAdmin, (req, res) => {
    const db = getDatabase();
    const userId = req.user.user_id;
    
    const sql = 'SELECT admin_id, username, email, name, role, created_at, last_update FROM admin WHERE admin_id = ? AND is_active = 1';
    
    db.get(sql, [userId], (err, user) => {
        if (err) {
            return res.status(500).json({ 
                success: false,
                error: err.message 
            });
        }
        
        if (!user) {
            return res.status(404).json({ 
                success: false,
                error: 'Admin not found' 
            });
        }
        
        res.json({
            success: true,
            data: {
                ...user,
                user_type: 'admin'
            }
        });
    });
});

// Logout
router.post('/logout', authenticateAny, (req, res) => {
    res.json({
        success: true,
        message: 'Logged out successfully. Please remove the token from client storage.',
        user_type: req.user.user_type
    });
});

// Verify token
router.get('/verify', authenticateAny, (req, res) => {
    res.json({
        success: true,
        message: 'Token is valid',
        data: {
            user_id: req.user.user_id,
            email: req.user.email,
            name: req.user.name,
            user_type: req.user.user_type,
            role: req.user.role
        }
    });
});

module.exports = router;