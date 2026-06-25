const express = require('express');
const path    = require('path');
const db      = require('./db');
const { generateEAN13, generateBarcodeImage } = require('./barcode');

const app  = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── ITEMS API ────────────────────────────────────────────────────────────────

// GET all items
app.get('/api/items', async (req, res) => {
  try {
    const items = await db.getAllItems();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single item by ID
app.get('/api/items/:id', async (req, res) => {
  try {
    const item = await db.getItemById(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET item by SKU — for scanner lookup
app.get('/api/scan/:sku', async (req, res) => {
  try {
    const item = await db.getItemBySku(req.params.sku);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create new item
app.post('/api/items', async (req, res) => {
  try {
    let { name, sku, price } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Item name is required' });
    }

    // Auto-generate SKU/barcode if not provided
    if (!sku || sku.trim() === '') {
      sku = generateEAN13();
    }

    const item = await db.createItem({ name: name.trim(), sku: sku.trim(), price: price || 0 });
    res.status(201).json(item);
  } catch (err) {
    if (err.code === '23505') {
      res.status(400).json({ error: 'That SKU/barcode already exists. Please use a different one.' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// PUT update item
app.put('/api/items/:id', async (req, res) => {
  try {
    let { name, sku, price } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Item name is required' });
    }
    if (!sku || sku.trim() === '') {
      return res.status(400).json({ error: 'SKU is required' });
    }

    const item = await db.updateItem(req.params.id, { name: name.trim(), sku: sku.trim(), price: price || 0 });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json(item);
  } catch (err) {
    if (err.code === '23505') {
      res.status(400).json({ error: 'That SKU/barcode already exists on another item.' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// DELETE item
app.delete('/api/items/:id', async (req, res) => {
  try {
    await db.deleteItem(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── BARCODE IMAGE API ─────────────────────────────────────────────────────────

// GET barcode image for a given SKU
app.get('/api/barcode/:sku', async (req, res) => {
  try {
    const image = await generateBarcodeImage(req.params.sku);
    res.json({ image });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── START SERVER ─────────────────────────────────────────────────────────────

db.initDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Barcode app running at http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ Failed to connect to database:', err.message);
    console.error('   Check your credentials in db.js');
    process.exit(1);
  });