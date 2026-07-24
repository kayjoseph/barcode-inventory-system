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