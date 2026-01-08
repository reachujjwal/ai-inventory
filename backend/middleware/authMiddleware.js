const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    const token = req.header('Authorization')?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Access Denied' });

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET || 'default_secret');
        req.user = verified;
        next();
    } catch (err) {
        console.error('JWT Verification Error:', err.message);
        res.status(401).json({ message: 'Token is invalid or expired' });
    }
};
