const express = require('express');
const Product = require('../models/product.model');
const { protect, adminOnly } = require('../middleware/auth.middleware');

const router = express.Router();

// Sample products for seeding
const SEED_PRODUCTS = [
  { title: 'Midnight Rose',  price: 120, image: 'coco.jpeg',   rating: 5, badge: 'Bestseller',     description: 'An intoxicating blend of Bulgarian rose, dark oud, and warm amber.',         category: 'Eau de Parfum', stock: 50 },
  { title: 'Golden Oud',     price: 180, image: 'gcoco.jpeg',  rating: 5, badge: 'Bestseller',     description: 'A majestic composition built around precious oud, gilded with saffron.',      category: 'Eau de Parfum', stock: 40 },
  { title: 'Velvet Musk',    price: 150, image: 'v.jpeg',      rating: 4, badge: '',               description: 'Silky white musk layered over velvet-soft iris and a whisper of cashmere.',  category: 'Eau de Parfum', stock: 60 },
  { title: 'Silver Sage',    price: 95,  image: 's.jpeg',      rating: 5, badge: 'New Arrival',    description: 'Crisp silver sage and cool juniper dancing over a base of white cedar.',       category: 'Eau de Parfum', stock: 80 },
  { title: 'Ocean Breeze',   price: 110, image: 'o.jpeg',      rating: 4, badge: '',               description: 'A breath of the open sea captured in a bottle.',                             category: 'Eau de Parfum', stock: 70 },
  { title: 'Amber Night',    price: 210, image: 'a.jpeg',      rating: 5, badge: 'Limited Edition',description: 'Warm amber resin, dark honey, and benzoin wrapped in tuberose.',             category: 'Eau de Parfum', stock: 20 },
  { title: 'Floral Bloom',   price: 135, image: 'fl.jpeg',     rating: 3, badge: '',               description: 'An exuberant garden captured at peak bloom.',                                category: 'Eau de Parfum', stock: 90 },
  { title: 'Desert Sand',    price: 165, image: 'desert.jpeg', rating: 5, badge: 'Bestseller',     description: 'Sun-baked sand, warm spices, and camel leather accord.',                     category: 'Eau de Parfum', stock: 45 },
  { title: 'Mystic Wood',    price: 190, image: 'my.jpeg',     rating: 4, badge: '',               description: 'Ancient cedarwood, dark vetiver, and a trace of smoky incense.',             category: 'Eau de Parfum', stock: 55 },
];

// ── GET /api/products ─────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { search, sort, minPrice, maxPrice } = req.query;
    let query = {};

    if (search) query.title = { $regex: search, $options: 'i' };
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    let sortOption = {};
    if (sort === 'price-asc')   sortOption = { price: 1 };
    if (sort === 'price-desc')  sortOption = { price: -1 };
    if (sort === 'rating-desc') sortOption = { rating: -1 };
    if (sort === 'name-asc')    sortOption = { title: 1 };

    const products = await Product.find(query).sort(sortOption);
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/products/:id ─────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/products — Admin ────────────────────────────
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/products/seed — Admin ──────────────────────
router.post('/seed', protect, adminOnly, async (req, res) => {
  try {
    await Product.deleteMany({});
    const products = await Product.insertMany(SEED_PRODUCTS);
    res.status(201).json({ message: `✅ ${products.length} products seeded`, products });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── PUT /api/products/:id — Admin ─────────────────────────
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── DELETE /api/products/:id — Admin ──────────────────────
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
