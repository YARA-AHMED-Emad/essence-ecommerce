const express = require('express');
const jwt     = require('jsonwebtoken');
const User    = require('../models/user.model');
const { protect, adminOnly } = require('../middleware/auth.middleware');

const router = express.Router();

// Helper: generate JWT token
const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });

// Helper: user response object
const userResponse = (user, token) => ({
  _id:   user._id,
  name:  user.name,
  email: user.email,
  role:  user.role,
  token,
});

// ── POST /api/users/register ──────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please fill all fields' });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const user  = await User.create({ name, email, password });
    const token = generateToken(user._id);

    res.status(201).json(userResponse(user, token));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/users/login ─────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please fill all fields' });
    }

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = generateToken(user._id);
    res.json(userResponse(user, token));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/users/me ─────────────────────────────────────
router.get('/me', protect, async (req, res) => {
  res.json(userResponse(req.user, null));
});

// ── PUT /api/users/me ─────────────────────────────────────
router.put('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (req.body.name)     user.name = req.body.name;
    if (req.body.email)    user.email = req.body.email;
    if (req.body.password) user.password = req.body.password;

    const updated = await user.save();
    const token   = generateToken(updated._id);
    res.json(userResponse(updated, token));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/users — Admin only ───────────────────────────
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort('-createdAt');
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── DELETE /api/users/:id — Admin only ───────────────────
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    await user.deleteOne();
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
