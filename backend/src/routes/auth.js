const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const repo = require('../config/repository');
const { JWT_SECRET } = require('../middleware/authMiddleware');

/**
 * POST /api/auth/login
 * Role-based JWT login for Admin, Vendor, or Viewer
 */
router.post('/login', async (req, res) => {
  const { email, password, requestedRole } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    let user = await repo.findUserByEmail(email);

    if (!user) {
      // Create user on-the-fly for seamless testing / demo role switching
      const role = requestedRole || 'Vendor';
      const passwordHash = await bcrypt.hash(password || 'password123', 10);
      user = await repo.createUser({
        userId: 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        name: email.split('@')[0].toUpperCase() + ' Vendor',
        email,
        passwordHash,
        role: role,
        businessName: role === 'Vendor' ? 'Malpe Sea Foods Co.' : ''
      });
    }

    const token = jwt.sign(
      {
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
        businessName: user.businessName
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    return res.json({
      token,
      user: {
        userId: user.userId,
        name: user.name,
        email: user.email,
        role: user.role,
        businessName: user.businessName
      }
    });
  } catch (err) {
    console.error('[Auth Error]', err);
    return res.status(500).json({ error: 'Authentication failed' });
  }
});

module.exports = router;
