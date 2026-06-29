const { Pool } = require('pg');

// ── Update these with your PostgreSQL credentials ──────────────────────────
const pool = new Pool({
  connectionString: 'postgresql://postgres:(WINQUORS4017)@db.ogweqevpjdygsatbftyj.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false }
});
// ───────────────────────────────────────────────────────────────────────────

// Create the items table if it doesn't exist
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS items (
      id         SERIAL PRIMARY KEY,
      name       VARCHAR(255) NOT NULL,
      sku        VARCHAR(100) UNIQUE NOT NULL,
      price      NUMERIC(10, 2) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);
  console.log('✅ Database ready — items table OK');
}

// Get all items
async function getAllItems() {
  const result = await pool.query(
    'SELECT * FROM items ORDER BY created_at DESC'
  );
  return result.rows;
}

// Get single item by ID
async function getItemById(id) {
  const result = await pool.query('SELECT * FROM items WHERE id = $1', [id]);
  return result.rows[0];
}

// Get item by SKU/barcode (for scanner lookup)
async function getItemBySku(sku) {
  const result = await pool.query('SELECT * FROM items WHERE sku = $1', [sku]);
  return result.rows[0];
}

// Create a new item
async function createItem({ name, sku, price }) {
  const result = await pool.query(
    `INSERT INTO items (name, sku, price)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [name, sku, price]
  );
  return result.rows[0];
}

// Update an existing item
async function updateItem(id, { name, sku, price }) {
  const result = await pool.query(
    `UPDATE items
     SET name = $1, sku = $2, price = $3, updated_at = NOW()
     WHERE id = $4
     RETURNING *`,
    [name, sku, price, id]
  );
  return result.rows[0];
}

// Delete an item
async function deleteItem(id) {
  await pool.query('DELETE FROM items WHERE id = $1', [id]);
}

module.exports = {
  initDB,
  getAllItems,
  getItemById,
  getItemBySku,
  createItem,
  updateItem,
  deleteItem,
};