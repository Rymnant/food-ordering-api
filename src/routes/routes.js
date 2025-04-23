const express = require('express');
const router = express.Router();

module.exports = (db) => {
  // Helper function to run SQL queries with promises
  const runQuery = (query, params = []) => {
    return new Promise((resolve, reject) => {
      db.all(query, params, (err, rows) => {
        if (err) {
          console.error('Query error:', err);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  };

  // Helper function to run SQL inserts/updates with promises
  const runStatement = (statement, params = []) => {
    return new Promise((resolve, reject) => {
      db.run(statement, params, function(err) {
        if (err) {
          console.error('Statement error:', err);
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  };

  // Routes
  // 1. Get all menus
  router.get('/menus', async (req, res) => {
    try {
      const category_id = req.query.category_id;
      let query = 'SELECT m.*, c.name as category_name FROM menu m JOIN category c ON m.category_id = c.category_id';
      let params = [];
      
      if (category_id) {
        query += ' WHERE m.category_id = ?';
        params.push(category_id);
      }
      
      const menus = await runQuery(query, params);
      res.json(menus);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 2. Get menu by ID
  router.get('/menus/:id', async (req, res) => {
    try {
      const menu_id = req.params.id;
      const query = `
        SELECT m.*, c.name as category_name 
        FROM menu m 
        JOIN category c ON m.category_id = c.category_id 
        WHERE m.menu_id = ?
      `;
      
      const menu = await runQuery(query, [menu_id]);
      
      if (menu.length === 0) {
        return res.status(404).json({ error: 'Menu not found' });
      }
      
      res.json(menu[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Register new customer
  router.post('/customers', async (req, res) => {
    try {
      const { name, email, phone, address } = req.body;
      
      if (!name || !email) {
        return res.status(400).json({ error: 'Name and email are required' });
      }
      
      const stmt = `
        INSERT INTO customer (name, email, phone, address)
        VALUES (?, ?, ?, ?)
      `;
      
      const result = await runStatement(stmt, [name, email, phone, address]);
      
      res.status(201).json({
        customer_id: result.id,
        name,
        email,
        phone,
        address
      });
    } catch (err) {
      if (err.message.includes('UNIQUE constraint failed: customer.email')) {
        return res.status(400).json({ error: 'Email already registered' });
      }
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Get customer by ID
  router.get('/customers/:id', async (req, res) => {
    try {
      const customer_id = req.params.id;
      const query = 'SELECT * FROM customer WHERE customer_id = ?';
      
      const customer = await runQuery(query, [customer_id]);
      
      if (customer.length === 0) {
        return res.status(404).json({ error: 'Customer not found' });
      }
      
      res.json(customer[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5. Create new order
  router.post('/orders', async (req, res) => {
    try {
      const { customer_id } = req.body;
      
      if (!customer_id) {
        return res.status(400).json({ error: 'Customer ID is required' });
      }
      
      // Verify customer exists
      const customerCheck = await runQuery('SELECT * FROM customer WHERE customer_id = ?', [customer_id]);
      if (customerCheck.length === 0) {
        return res.status(400).json({ error: 'Customer does not exist' });
      }
      
      const stmt = `
        INSERT INTO orders (customer_id, status) 
        VALUES (?, 'pending')
      `;
      
      const result = await runStatement(stmt, [customer_id]);
      
      res.status(201).json({
        order_id: result.id,
        customer_id: parseInt(customer_id),
        order_date: new Date().toISOString(),
        total_amount: 0,
        status: 'pending'
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 6. Get orders by customer ID
  router.get('/orders', async (req, res) => {
    try {
      const customer_id = req.query.customer_id;
      
      if (!customer_id) {
        return res.status(400).json({ error: 'Customer ID is required' });
      }
      
      const query = `
        SELECT o.*, c.name as customer_name 
        FROM orders o 
        JOIN customer c ON o.customer_id = c.customer_id 
        WHERE o.customer_id = ?
      `;
      
      const orders = await runQuery(query, [customer_id]);
      res.json(orders);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 7. Get order details by order ID
  router.get('/orders/:order_id', async (req, res) => {
    try {
      const order_id = req.params.order_id;
      
      // Get order info
      const orderQuery = `
        SELECT o.*, c.name as customer_name, c.email, c.phone, c.address 
        FROM orders o 
        JOIN customer c ON o.customer_id = c.customer_id 
        WHERE o.order_id = ?
      `;
      
      const orders = await runQuery(orderQuery, [order_id]);
      
      if (orders.length === 0) {
        return res.status(404).json({ error: 'Order not found' });
      }
      
      // Get order details
      const detailsQuery = `
        SELECT od.*, m.name as menu_name, m.description, m.image_url
        FROM order_detail od
        JOIN menu m ON od.menu_id = m.menu_id
        WHERE od.order_id = ?
      `;
      
      const details = await runQuery(detailsQuery, [order_id]);
      
      // Get payment info if exists
      const paymentQuery = `
        SELECT * FROM payment WHERE order_id = ?
      `;
      
      const payments = await runQuery(paymentQuery, [order_id]);
      
      const orderData = {
        ...orders[0],
        items: details,
        payment: payments.length > 0 ? payments[0] : null
      };
      
      res.json(orderData);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 8. Add item to order
  router.post('/order_details', async (req, res) => {
    try {
      const { order_id, menu_id, quantity } = req.body;
      
      if (!order_id || !menu_id || !quantity) {
        return res.status(400).json({ error: 'Order ID, Menu ID, and Quantity are required' });
      }
      
      // Check if order exists
      const orderCheck = await runQuery('SELECT * FROM orders WHERE order_id = ?', [order_id]);
      if (orderCheck.length === 0) {
        return res.status(400).json({ error: 'Order does not exist' });
      }
      
      // Get menu price
      const menuCheck = await runQuery('SELECT * FROM menu WHERE menu_id = ?', [menu_id]);
      if (menuCheck.length === 0) {
        return res.status(400).json({ error: 'Menu does not exist' });
      }
      
      const price = menuCheck[0].price;
      const subtotal = price * quantity;
      
      // Add item to order
      const stmt = `
        INSERT INTO order_detail (order_id, menu_id, quantity, price, subtotal)
        VALUES (?, ?, ?, ?, ?)
      `;
      
      const result = await runStatement(stmt, [order_id, menu_id, quantity, price, subtotal]);
      
      // Update order total
      await runStatement(`
        UPDATE orders
        SET total_amount = (SELECT SUM(subtotal) FROM order_detail WHERE order_id = ?),
            last_update = CURRENT_TIMESTAMP
        WHERE order_id = ?
      `, [order_id, order_id]);
      
      res.status(201).json({
        order_detail_id: result.id,
        order_id: parseInt(order_id),
        menu_id: parseInt(menu_id),
        menu_name: menuCheck[0].name,
        quantity: parseInt(quantity),
        price,
        subtotal
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 9. Create payment for order
  router.post('/payments', async (req, res) => {
    try {
      const { order_id, amount, payment_method } = req.body;
      
      if (!order_id || !amount || !payment_method) {
        return res.status(400).json({ error: 'Order ID, Amount, and Payment Method are required' });
      }
      
      // Check if order exists
      const orderCheck = await runQuery('SELECT * FROM orders WHERE order_id = ?', [order_id]);
      if (orderCheck.length === 0) {
        return res.status(400).json({ error: 'Order does not exist' });
      }
      
      // Check if payment already exists
      const paymentCheck = await runQuery('SELECT * FROM payment WHERE order_id = ?', [order_id]);
      if (paymentCheck.length > 0) {
        return res.status(400).json({ error: 'Payment for this order already exists' });
      }
      
      // Create payment
      const stmt = `
        INSERT INTO payment (order_id, amount, payment_method, status)
        VALUES (?, ?, ?, 'completed')
      `;
      
      const result = await runStatement(stmt, [order_id, amount, payment_method]);
      
      // Update order status
      await runStatement(`
        UPDATE orders
        SET status = 'completed',
            last_update = CURRENT_TIMESTAMP
        WHERE order_id = ?
      `, [order_id]);
      
      res.status(201).json({
        payment_id: result.id,
        order_id: parseInt(order_id),
        payment_date: new Date().toISOString(),
        amount: parseFloat(amount),
        payment_method,
        status: 'completed'
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // 10. Get payment by order ID
  router.get('/payments/:order_id', async (req, res) => {
    try {
      const order_id = req.params.order_id;
      const query = 'SELECT * FROM payment WHERE order_id = ?';
      
      const payment = await runQuery(query, [order_id]);
      
      if (payment.length === 0) {
        return res.status(404).json({ error: 'Payment not found for this order' });
      }
      
      res.json(payment[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Additional endpoint: Get all categories
  router.get('/categories', async (req, res) => {
    try {
      const categories = await runQuery('SELECT * FROM category');
      res.json(categories);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};