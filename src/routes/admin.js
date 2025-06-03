const express = require('express');
const { getDatabase } = require('../database/db');
const { authenticateAdmin } = require('../middleware/auth');
const { clearCache, clearAllCache } = require('../middleware/cache');

const router = express.Router();

// Admin dashboard
router.get('/dashboard', authenticateAdmin, (req, res) => {
    const db = getDatabase();
    
    // Simple dashboard with basic stats
    const queries = [
        { name: 'totalCustomers', sql: 'SELECT COUNT(*) as count FROM customer WHERE is_active = 1' },
        { name: 'totalOrders', sql: 'SELECT COUNT(*) as count FROM orders' },
        { name: 'totalRevenue', sql: 'SELECT SUM(total_amount) as total FROM orders WHERE status = "completed"' },
        { name: 'pendingOrders', sql: 'SELECT COUNT(*) as count FROM orders WHERE status = "pending"' }
    ];
    
    const results = {};
    let completed = 0;
    
    queries.forEach(query => {
        db.get(query.sql, (err, row) => {
            if (err) {
                results[query.name] = { error: err.message };
            } else {
                results[query.name] = row;
            }
            
            completed++;
            if (completed === queries.length) {
                res.json({
                    success: true,
                    data: {
                        statistics: results
                    }
                });
            }
        });
    });
});

// Get all customers
router.get('/customers', authenticateAdmin, (req, res) => {
    const db = getDatabase();
    
    const sql = 'SELECT customer_id, name, email, phone, address, is_active, last_update FROM customer ORDER BY name';
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ 
                success: false,
                error: err.message 
            });
        }
        
        res.json({
            success: true,
            data: rows,
            count: rows.length
        });
    });
});

// Get all orders
router.get('/orders', authenticateAdmin, (req, res) => {
    const db = getDatabase();
    const { status, limit = 50, offset = 0 } = req.query;
    
    let sql = `
        SELECT o.*, c.name as customer_name, c.email as customer_email
        FROM orders o
        JOIN customer c ON o.customer_id = c.customer_id
    `;
    let params = [];
    
    if (status) {
        sql += ' WHERE o.status = ?';
        params.push(status);
    }
    
    sql += ' ORDER BY o.order_date DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    db.all(sql, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ 
                success: false,
                error: err.message 
            });
        }
        
        res.json({
            success: true,
            data: rows,
            count: rows.length
        });
    });
});

// Update order status
router.patch('/orders/:order_id/status', authenticateAdmin, (req, res) => {
    const db = getDatabase();
    const { order_id } = req.params;
    const { status } = req.body;
    
    const validStatuses = ['pending', 'processing', 'completed', 'cancelled'];
    
    if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({
            success: false,
            error: `Status must be one of: ${validStatuses.join(', ')}`
        });
    }
    
    const sql = 'UPDATE orders SET status = ?, last_update = CURRENT_TIMESTAMP WHERE order_id = ?';
    
    db.run(sql, [status, order_id], function(err) {
        if (err) {
            return res.status(500).json({
                success: false,
                error: err.message
            });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }
        
        clearCache('orders');
        
        res.json({
            success: true,
            message: `Order status updated to ${status}`,
            data: {
                order_id: parseInt(order_id),
                new_status: status
            }
        });
    });
});

// Clear cache
router.delete('/cache', authenticateAdmin, (req, res) => {
    const { pattern } = req.query;
    
    if (pattern) {
        clearCache(pattern);
        res.json({
            success: true,
            message: `Cache cleared for pattern: ${pattern}`
        });
    } else {
        clearAllCache();
        res.json({
            success: true,
            message: 'All cache cleared'
        });
    }
});

module.exports = router;