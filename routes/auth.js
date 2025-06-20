const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../config/database');
const router = express.Router();

// Login route
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    db.get(
        'SELECT * FROM users WHERE username = ?',
        [username],
        (err, user) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }

            if (!user) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            bcrypt.compare(password, user.password, (err, result) => {
                if (err) {
                    return res.status(500).json({ error: 'Authentication error' });
                }

                if (result) {
                    req.session.isAdmin = true;
                    req.session.userId = user.id;
                    res.json({ success: true, message: 'Login successful' });
                } else {
                    res.status(401).json({ error: 'Invalid credentials' });
                }
            });
        }
    );
});

// Logout route
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Could not log out' });
        }
        res.json({ success: true, message: 'Logged out successfully' });
    });
});

// Check auth status
router.get('/status', (req, res) => {
    res.json({ isAdmin: !!req.session.isAdmin });
});

module.exports = router;