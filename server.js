const express = require('express');
const path    = require('path');
const { generateEAN13, generateBarcodeImage } = require('./barcode');

const app  = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── IN-MEMORY STORE ──────────────────────────────────────────────────────────
let items  = [];
let nextId = 1;

// ── ITEMS API ────────────────────────────────────────────────────────────────

// GET all items
app.get('/api/items', (req, res) => {
  res.json([...items].reverse());
});

// GET item by SKU — for scanner lookup
app.get('/api/scan/:sku', (req, res) => {
  const item = items.find(i => i.sku === req.params.sku);
  if (!item) return res.status(404).json({ error: 'Item not found' });
  res.json(item);
});

// POST create new item
app.post('/api/items', (req, res) => {
  let { name, sku, price } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Item name is required' });
  }

  // Auto-generate SKU if not provided
  if (!sku || sku.trim() === '') {
    sku = generateEAN13();
  }

  // Check duplicate SKU
  if (items.find(i => i.sku === sku.trim())) {
    return res.status(400).json({ error: 'That SKU/barcode already exists.' });
  }

  const item = {
    id:         nextId++,
    name:       name.trim(),
    sku:        sku.trim(),
    price:      parseFloat(price) || 0,
    created_at: new Date().toISOString(),
  };

  items.push(item);
  res.status(201).json(item);
});

// PUT update item
app.put('/api/items/:id', (req, res) => {
  const id   = parseInt(req.params.id);
  const idx  = items.findIndex(i => i.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Item not found' });

  let { name, sku, price } = req.body;
  if (!name || name.trim() === '') return res.status(400).json({ error: 'Item name is required' });
  if (!sku  || sku.trim()  === '') return res.status(400).json({ error: 'SKU is required' });

  // Check duplicate SKU on another item
  if (items.find(i => i.sku === sku.trim() && i.id !== id)) {
    return res.status(400).json({ error: 'That SKU already exists on another item.' });
  }

  items[idx] = { ...items[idx], name: name.trim(), sku: sku.trim(), price: parseFloat(price) || 0 };
  res.json(items[idx]);
});

// DELETE item
app.delete('/api/items/:id', (req, res) => {
  const id = parseInt(req.params.id);
  items    = items.filter(i => i.id !== id);
  res.json({ success: true });
});

// ── BARCODE IMAGE ────────────────────────────────────────────────────────────
app.get('/api/barcode/:sku', async (req, res) => {
  try {
    const image = await generateBarcodeImage(req.params.sku);
    res.json({ image });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── START ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Barcode app running at http://localhost:${PORT}`);
  console.log(`   Note: data is stored in memory and will reset when the server stops.`);
});