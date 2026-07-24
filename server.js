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
    if (!sku || sku.trim() === '') {
      sku = generateEAN13();
    }
    const item = await db.createItem({ name: name.trim(), sku: sku.trim(), price: parseFloat(price) || 0 });
    res.status(201).json(item);
  } catch (err) {
    if (err.code === '23505') {
      res.status(400).json({ error: 'That SKU/barcode already exists.' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// PUT update item
app.put('/api/items/:id', async (req, res) => {
  try {
    let { name, sku, price } = req.body;
    if (!name || name.trim() === '') return res.status(400).json({ error: 'Item name is required' });
    if (!sku  || sku.trim()  === '') return res.status(400).json({ error: 'SKU is required' });
    const item = await db.updateItem(req.params.id, { name: name.trim(), sku: sku.trim(), price: parseFloat(price) || 0 });
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json(item);
  } catch (err) {
    if (err.code === '23505') {
      res.status(400).json({ error: 'That SKU already exists on another item.' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});