const NodeCache = require('node-cache');

// Cache for 5 minutes by default
const cache = new NodeCache({ stdTTL: 300 });

function cacheMiddleware(duration = 300) {
    return (req, res, next) => {
        const key = req.originalUrl || req.url;
        const cachedResponse = cache.get(key);
        
        if (cachedResponse) {
            // Add HTTP cache headers
            res.setHeader('Cache-Control', `public, max-age=${duration}`);
            res.setHeader('X-Cache', 'HIT');
            return res.json(cachedResponse);
        }
        
        res.sendResponse = res.json;
        res.json = (body) => {
            cache.set(key, body, duration);
            // Add cache headers for fresh responses
            res.setHeader('Cache-Control', `public, max-age=${duration}`);
            res.setHeader('X-Cache', 'MISS');
            res.sendResponse(body);
        };
        
        next();
    };
}

function clearCache(pattern) {
    const keys = cache.keys();
    keys.forEach(key => {
        if (pattern && key.includes(pattern)) {
            cache.del(key);
        }
    });
}

function clearAllCache() {
    cache.flushAll();
}

module.exports = {
    cacheMiddleware,
    clearCache,
    clearAllCache
};