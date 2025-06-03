const express = require('express');
const { getDatabase } = require('../database/db');
const { cacheMiddleware, clearCache } = require('../middleware/cache');
const { authenticateCustomer, authenticateAny, authorizeCustomerOwner } = require('../middleware/auth');

const router = express.Router();

// Helper function to generate HATEOAS links
function generateLinks(baseUrl, id, resourceType, additionalLinks = {}) {
    const links = {
        self: id ? `${baseUrl}/${resourceType}/${id}` : `${baseUrl}/${resourceType}`
    };
    
    // Add resource-specific links
    switch (resourceType) {
        case 'menus':
            if (id) {
                links.category = `${baseUrl}/categories`;
                links.orders = `${baseUrl}/order_details`;
            } else {
                links.categories = `${baseUrl}/categories`;
            }
            break;
            
        case 'customers':
            if (id) {
                links.orders = `${baseUrl}/orders?customer_id=${id}`;
                links['create-order'] = `${baseUrl}/orders`;
            }
            break;
            
        case 'orders':
            if (id) {
                links.customer = additionalLinks.customer_id ? `${baseUrl}/customers/${additionalLinks.customer_id}` : null;
                links.items = `${baseUrl}/orders/${id}`;
                links['add-item'] = `${baseUrl}/order_details`;
                if (additionalLinks.status === 'pending') {
                    links.payment = `${baseUrl}/payments`;
                } else if (additionalLinks.status === 'completed') {
                    links['view-payment'] = `${baseUrl}/payments/${id}`;
                }
            }
            break;
            
        case 'payments':
            if (id) {
                links.order = `${baseUrl}/orders/${id}`;
            }
            break;
            
        case 'categories':
            if (id) {
                links.menus = `${baseUrl}/menus?category_id=${id}`;
            }
            break;
    }
    
    // Remove null links
    Object.keys(links).forEach(key => links[key] === null && delete links[key]);
    
    return links;
}

// Health check endpoint (put this first to avoid conflicts)
router.get('/health', (req, res) => {
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    res.json({
        success: true,
        message: 'Food Ordering API is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        _links: {
            menus: `${baseUrl}/menus`,
            categories: `${baseUrl}/categories`,
            'customer-auth': `${baseUrl}/auth/customer/login`,
            'admin-auth': `${baseUrl}/auth/admin/login`,
            documentation: `${baseUrl}/health`
        }
    });
});

// 1. Get all categories (public access)
router.get('/categories', cacheMiddleware(600), (req, res) => {
    const db = getDatabase();
    
    const sql = 'SELECT * FROM category ORDER BY name';
    
    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ 
                success: false,
                error: err.message 
            });
        }
        
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const categoriesWithLinks = rows.map(category => ({
            ...category,
            _links: {
                self: `${baseUrl}/categories`,
                menus: `${baseUrl}/menus?category_id=${category.category_id}`
            }
        }));
        
        res.json({
            success: true,
            data: categoriesWithLinks,
            count: rows.length,
            _links: {
                self: `${baseUrl}/categories`,
                menus: `${baseUrl}/menus`
            }
        });
    });
});

// 2. Get all menus (public access)
router.get('/menus', cacheMiddleware(300), (req, res) => {
    const db = getDatabase();
    const { category_id } = req.query;
    
    let sql = `
        SELECT m.*, c.name as category_name, c.description as category_description
        FROM menu m
        JOIN category c ON m.category_id = c.category_id
    `;
    let params = [];
    
    if (category_id) {
        sql += ' WHERE m.category_id = ?';
        params.push(category_id);
    }
    
    sql += ' ORDER BY m.category_id, m.name';
    
    db.all(sql, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ 
                success: false,
                error: err.message 
            });
        }
        
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const menusWithLinks = rows.map(menu => ({
            ...menu,
            _links: {
                self: `${baseUrl}/menus/${menu.menu_id}`,
                category: `${baseUrl}/categories`,
                'add-to-order': `${baseUrl}/order_details`
            }
        }));
        
        res.json({
            success: true,
            data: menusWithLinks,
            count: rows.length,
            _links: generateLinks(baseUrl, null, 'menus')
        });
    });
});

// 3. Get menu by ID (public access)
router.get('/menus/:menu_id', cacheMiddleware(300), (req, res) => {
    const db = getDatabase();
    const { menu_id } = req.params;

    if (!/^\d+$/.test(menu_id)) {
        return res.status(400).json({ 
            success: false,
            error: 'Invalid menu ID format' 
        });
    }
    
    const sql = `
        SELECT m.*, c.name as category_name, c.description as category_description
        FROM menu m
        JOIN category c ON m.category_id = c.category_id
        WHERE m.menu_id = ?
    `;
    
    db.get(sql, [menu_id], (err, row) => {
        if (err) {
            return res.status(500).json({ 
                success: false,
                error: err.message 
            });
        }
        if (!row) {
            return res.status(404).json({ 
                success: false,
                error: 'Menu not found' 
            });
        }
        
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        res.json({
            success: true,
            data: {
                ...row,
                _links: {
                    self: `${baseUrl}/menus/${row.menu_id}`,
                    category: `${baseUrl}/categories`,
                    'category-menus': `${baseUrl}/menus?category_id=${row.category_id}`,
                    'add-to-order': `${baseUrl}/order_details`,
                    'all-menus': `${baseUrl}/menus`
                }
            }
        });
    });
});

// 4. Get customer by ID (protected - customer own data or admin)
router.get('/customers/:customer_id', authenticateAny, authorizeCustomerOwner, (req, res) => {
    const db = getDatabase();
    const { customer_id } = req.params;

    if (!/^\d+$/.test(customer_id)) {
        return res.status(400).json({ 
            success: false,
            error: 'Invalid customer ID format' 
        });
    }
    
    const sql = 'SELECT customer_id, name, email, phone, address, is_active, last_update FROM customer WHERE customer_id = ?';
    
    db.get(sql, [customer_id], (err, row) => {
        if (err) {
            return res.status(500).json({ 
                success: false,
                error: err.message 
            });
        }
        if (!row) {
            return res.status(404).json({ 
                success: false,
                error: 'Customer not found' 
            });
        }
        
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        res.json({
            success: true,
            data: {
                ...row,
                _links: generateLinks(baseUrl, customer_id, 'customers')
            }
        });
    });
});

// 5. Get customer orders (protected)
router.get('/orders', authenticateAny, (req, res) => {
    const db = getDatabase();
    let { customer_id } = req.query;
    
    // If user is customer, force customer_id to their own ID
    if (req.user.user_type === 'customer') {
        customer_id = req.user.user_id;
    }
    
    if (!customer_id) {
        return res.status(400).json({ 
            success: false,
            error: 'Customer ID is required' 
        });
    }
    
    // Check if customer can access the requested data
    if (req.user.user_type === 'customer' && parseInt(customer_id) !== req.user.user_id) {
        return res.status(403).json({ 
            success: false,
            error: 'Access denied' 
        });
    }
    
    const sql = `
        SELECT o.*, c.name as customer_name, c.email as customer_email
        FROM orders o
        JOIN customer c ON o.customer_id = c.customer_id
        WHERE o.customer_id = ?
        ORDER BY o.order_date DESC
    `;
    
    db.all(sql, [customer_id], (err, rows) => {
        if (err) {
            return res.status(500).json({ 
                success: false,
                error: err.message 
            });
        }
        
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const ordersWithLinks = rows.map(order => ({
            ...order,
            _links: generateLinks(baseUrl, order.order_id, 'orders', { 
                customer_id: order.customer_id, 
                status: order.status 
            })
        }));
        
        res.json({
            success: true,
            data: ordersWithLinks,
            count: rows.length,
            _links: {
                customer: `${baseUrl}/customers/${customer_id}`,
                'create-order': `${baseUrl}/orders`,
                menus: `${baseUrl}/menus`
            }
        });
    });
});

// 6. Create new order (customer only)
router.post('/orders', authenticateCustomer, (req, res) => {
    const db = getDatabase();
    const customer_id = req.user.user_id; // Get from JWT token
    
    const sql = `
        INSERT INTO orders (customer_id, status)
        VALUES (?, 'pending')
    `;
    
    db.run(sql, [customer_id], function(err) {
        if (err) {
            return res.status(500).json({ 
                success: false,
                error: err.message 
            });
        }
        
        // Get the created order
        db.get('SELECT * FROM orders WHERE order_id = ?', [this.lastID], (err, row) => {
            if (err) {
                return res.status(500).json({ 
                    success: false,
                    error: err.message 
                });
            }
            
            const baseUrl = `${req.protocol}://${req.get('host')}`;
            res.status(201).json({
                success: true,
                message: 'Order created successfully',
                data: {
                    ...row,
                    _links: {
                        self: `${baseUrl}/orders/${row.order_id}`,
                        customer: `${baseUrl}/customers/${row.customer_id}`,
                        'add-item': `${baseUrl}/order_details`,
                        menus: `${baseUrl}/menus`,
                        'customer-orders': `${baseUrl}/orders?customer_id=${row.customer_id}`
                    }
                }
            });
        });
    });
});

// 7. Get order details by order ID (protected - check ownership)
router.get('/orders/:order_id', authenticateAny, (req, res) => {
    const db = getDatabase();
    const { order_id } = req.params;

    if (!/^\d+$/.test(order_id)) {
        return res.status(400).json({ 
            success: false,
            error: 'Invalid order ID format' 
        });
    }
    
    const orderSql = `
        SELECT o.*, c.name as customer_name, c.email as customer_email, c.phone as customer_phone, c.address as customer_address
        FROM orders o
        JOIN customer c ON o.customer_id = c.customer_id
        WHERE o.order_id = ?
    `;
    
    db.get(orderSql, [order_id], (err, order) => {
        if (err) {
            return res.status(500).json({ 
                success: false,
                error: err.message 
            });
        }
        if (!order) {
            return res.status(404).json({ 
                success: false,
                error: 'Order not found' 
            });
        }
        
        // Check ownership for customers
        if (req.user.user_type === 'customer' && order.customer_id !== req.user.user_id) {
            return res.status(403).json({ 
                success: false,
                error: 'Access denied' 
            });
        }
        
        const detailsSql = `
            SELECT od.*, m.name as menu_name, m.description as menu_description, m.image_url
            FROM order_detail od
            JOIN menu m ON od.menu_id = m.menu_id
            WHERE od.order_id = ?
        `;
        
        db.all(detailsSql, [order_id], (err, details) => {
            if (err) {
                return res.status(500).json({ 
                    success: false,
                    error: err.message 
                });
            }
            
            const baseUrl = `${req.protocol}://${req.get('host')}`;
            const itemsWithLinks = details.map(item => ({
                ...item,
                _links: {
                    menu: `${baseUrl}/menus/${item.menu_id}`,
                    order: `${baseUrl}/orders/${item.order_id}`
                }
            }));
            
            res.json({
                success: true,
                data: {
                    ...order,
                    items: itemsWithLinks,
                    _links: generateLinks(baseUrl, order_id, 'orders', { 
                        customer_id: order.customer_id, 
                        status: order.status 
                    })
                }
            });
        });
    });
});

// 8. Add item to order (customer only)
router.post('/order_details', authenticateCustomer, (req, res) => {
    const db = getDatabase();
    const { order_id, menu_id, quantity } = req.body;
    
    if (!order_id || !menu_id || !quantity) {
        return res.status(400).json({ 
            success: false,
            error: 'Order ID, Menu ID, and Quantity are required' 
        });
    }
    
    // First check if order belongs to the authenticated customer
    const checkOrderSql = 'SELECT customer_id, status FROM orders WHERE order_id = ?';
    
    db.get(checkOrderSql, [order_id], (err, orderInfo) => {
        if (err) {
            return res.status(500).json({ 
                success: false,
                error: err.message 
            });
        }
        if (!orderInfo) {
            return res.status(404).json({ 
                success: false,
                error: 'Order not found' 
            });
        }
        if (orderInfo.customer_id !== req.user.user_id) {
            return res.status(403).json({ 
                success: false,
                error: 'Access denied. You can only modify your own orders.' 
            });
        }
        if (orderInfo.status !== 'pending') {
            return res.status(400).json({ 
                success: false,
                error: 'Cannot modify completed orders' 
            });
        }
        
        // Get menu price
        const menuSql = 'SELECT price, name FROM menu WHERE menu_id = ?';
        
        db.get(menuSql, [menu_id], (err, menu) => {
            if (err) {
                return res.status(500).json({ 
                    success: false,
                    error: err.message 
                });
            }
            if (!menu) {
                return res.status(404).json({ 
                    success: false,
                    error: 'Menu not found' 
                });
            }
            
            const price = menu.price;
            const subtotal = price * quantity;
            
            const insertSql = `
                INSERT INTO order_detail (order_id, menu_id, quantity, price, subtotal)
                VALUES (?, ?, ?, ?, ?)
            `;
            
            db.run(insertSql, [order_id, menu_id, quantity, price, subtotal], function(err) {
                if (err) {
                    return res.status(500).json({ 
                        success: false,
                        error: err.message 
                    });
                }
                
                // Update order total
                const updateOrderSql = `
                    UPDATE orders 
                    SET total_amount = (
                        SELECT SUM(subtotal) FROM order_detail WHERE order_id = ?
                    )
                    WHERE order_id = ?
                `;
                
                db.run(updateOrderSql, [order_id, order_id], (err) => {
                    if (err) {
                        return res.status(500).json({ 
                            success: false,
                            error: err.message 
                        });
                    }
                    
                    // Clear cache for orders
                    clearCache('orders');
                    
                    const baseUrl = `${req.protocol}://${req.get('host')}`;
                    res.status(201).json({
                        success: true,
                        message: 'Item added to order successfully',
                        data: {
                            order_detail_id: this.lastID,
                            order_id,
                            menu_id,
                            menu_name: menu.name,
                            quantity,
                            price,
                            subtotal,
                            _links: {
                                order: `${baseUrl}/orders/${order_id}`,
                                menu: `${baseUrl}/menus/${menu_id}`,
                                'add-more-items': `${baseUrl}/order_details`,
                                'create-payment': `${baseUrl}/payments`,
                                menus: `${baseUrl}/menus`
                            }
                        }
                    });
                });
            });
        });
    });
});

// 9. Create payment for order (customer only)
router.post('/payments', authenticateCustomer, (req, res) => {
    const db = getDatabase();
    const { order_id, payment_method } = req.body;
    
    if (!order_id || !payment_method) {
        return res.status(400).json({ 
            success: false,
            error: 'Order ID and Payment Method are required' 
        });
    }
    
    // Check if order exists and belongs to the customer
    db.get('SELECT * FROM orders WHERE order_id = ?', [order_id], (err, order) => {
        if (err) {
            return res.status(500).json({ 
                success: false,
                error: err.message 
            });
        }
        if (!order) {
            return res.status(404).json({ 
                success: false,
                error: 'Order not found' 
            });
        }
        if (order.customer_id !== req.user.user_id) {
            return res.status(403).json({ 
                success: false,
                error: 'Access denied. You can only pay for your own orders.' 
            });
        }
        
        const amount = order.total_amount;
        
        const sql = `
            INSERT INTO payment (order_id, amount, payment_method, status)
            VALUES (?, ?, ?, 'completed')
        `;
        
        db.run(sql, [order_id, amount, payment_method], function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ 
                        success: false,
                        error: 'Payment already exists for this order' 
                    });
                }
                return res.status(500).json({ 
                    success: false,
                    error: err.message 
                });
            }
            
            // Update order status to completed
            db.run('UPDATE orders SET status = ? WHERE order_id = ?', ['completed', order_id], (err) => {
                if (err) {
                    return res.status(500).json({ 
                        success: false,
                        error: err.message 
                    });
                }
                
                // Clear cache for orders
                clearCache('orders');
                
                // Get the created payment
                db.get('SELECT * FROM payment WHERE payment_id = ?', [this.lastID], (err, row) => {
                    if (err) {
                        return res.status(500).json({ 
                            success: false,
                            error: err.message 
                        });
                    }
                    
                    const baseUrl = `${req.protocol}://${req.get('host')}`;
                    res.status(201).json({
                        success: true,
                        message: 'Payment created successfully',
                        data: {
                            ...row,
                            _links: {
                                self: `${baseUrl}/payments/${order_id}`,
                                order: `${baseUrl}/orders/${order_id}`,
                                customer: `${baseUrl}/customers/${order.customer_id}`,
                                'customer-orders': `${baseUrl}/orders?customer_id=${order.customer_id}`
                            }
                        }
                    });
                });
            });
        });
    });
});

// 10. Get payment by order ID (protected)
router.get('/payments/:order_id', authenticateAny, (req, res) => {
    const db = getDatabase();
    const { order_id } = req.params;

    if (!/^\d+$/.test(order_id)) {
        return res.status(400).json({ 
            success: false,
            error: 'Invalid order ID format' 
        });
    }
    
    const sql = `
        SELECT p.*, o.total_amount as order_total, o.status as order_status, o.customer_id
        FROM payment p
        JOIN orders o ON p.order_id = o.order_id
        WHERE p.order_id = ?
    `;
    
    db.get(sql, [order_id], (err, row) => {
        if (err) {
            return res.status(500).json({ 
                success: false,
                error: err.message 
            });
        }
        if (!row) {
            return res.status(404).json({ 
                success: false,
                error: 'Payment not found for this order' 
            });
        }
        
        // Check ownership for customers
        if (req.user.user_type === 'customer' && row.customer_id !== req.user.user_id) {
            return res.status(403).json({ 
                success: false,
                error: 'Access denied' 
            });
        }
        
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        res.json({
            success: true,
            data: {
                ...row,
                _links: generateLinks(baseUrl, order_id, 'payments')
            }
        });
    });
});

module.exports = router;