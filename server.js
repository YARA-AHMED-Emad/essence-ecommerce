const express    = require('express');
const cors       = require('cors');
const path       = require('path');
require('dotenv').config();

const connectDB      = require('./db');
const userRoutes     = require('./routes/user.routes');
const productRoutes  = require('./routes/product.routes');
const orderRoutes    = require('./routes/order.routes');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Connect to MongoDB ────────────────────────────────────
connectDB();

// ── Middleware ────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── API Routes ────────────────────────────────────────────
app.use('/api/users',    userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders',   orderRoutes);

// ── Serve Frontend (same server) ─────────────────────────
app.use(express.static(path.join(__dirname, '../client')));

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// ── Start Server ──────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
