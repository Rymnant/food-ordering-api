const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-2025';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

// Generate JWT token
function generateToken(user, userType = 'customer') {
    const payload = {
        user_id: userType === 'admin' ? user.admin_id : user.customer_id,
        email: user.email,
        name: user.name,
        user_type: userType,
        role: user.role || null
    };
    
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Middleware to verify JWT token
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ 
            success: false,
            error: 'Access token is required' 
        });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ 
                success: false,
                error: 'Invalid or expired token' 
            });
        }
        
        req.user = user;
        next();
    });
}

// Middleware to check if user is customer
function authenticateCustomer(req, res, next) {
    authenticateToken(req, res, (err) => {
        if (err) return;
        
        if (req.user.user_type !== 'customer') {
            return res.status(403).json({ 
                success: false,
                error: 'Customer access required' 
            });
        }
        
        next();
    });
}

// Middleware to check if user is admin
function authenticateAdmin(req, res, next) {
    authenticateToken(req, res, (err) => {
        if (err) return;
        
        if (req.user.user_type !== 'admin') {
            return res.status(403).json({ 
                success: false,
                error: 'Admin access required' 
            });
        }
        
        next();
    });
}

// Middleware to check if user owns the resource (for customer data)
function authorizeCustomerOwner(req, res, next) {
    const requestedCustomerId = req.params.customer_id || req.query.customer_id || req.body.customer_id;
    
    // Admin can access all customer data
    if (req.user.user_type === 'admin') {
        return next();
    }
    
    // Customer can only access their own data
    if (req.user.user_type === 'customer' && requestedCustomerId && parseInt(requestedCustomerId) !== req.user.user_id) {
        return res.status(403).json({ 
            success: false,
            error: 'Access denied. You can only access your own data.' 
        });
    }
    
    next();
}

// Middleware to check super admin role
function authenticateSuperAdmin(req, res, next) {
    authenticateAdmin(req, res, (err) => {
        if (err) return;
        
        if (req.user.role !== 'super_admin') {
            return res.status(403).json({ 
                success: false,
                error: 'Super admin access required' 
            });
        }
        
        next();
    });
}

// Middleware that allows both customer and admin access
function authenticateAny(req, res, next) {
    authenticateToken(req, res, next);
}

module.exports = {
    generateToken,
    authenticateToken,
    authenticateCustomer,
    authenticateAdmin,
    authenticateSuperAdmin,
    authenticateAny,
    authorizeCustomerOwner,
    JWT_SECRET,
    JWT_EXPIRES_IN
};