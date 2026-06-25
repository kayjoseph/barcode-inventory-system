// ── STATE ─────────────────────────────────────────────────────────────────
let allItems    = [];
let currentView = 'items';

// ── DOM REFS ──────────────────────────────────────────────────────────────
const itemsTableBody   = document.getElementById('itemsTableBody');
const searchInput      = document.getElementById('searchInput');
const itemCount        = document.getElementById('itemCount');
const btnAddItem       = document.getElementById('btnAddItem');

const modalOverlay     = document.getElementById('modalOverlay');
const modalTitle       = document.getElementById('modalTitle');
const editItemId       = document.getElementById('editItemId');
const fieldName        = document.getElementById('fieldName');
const fieldSku         = document.getElementById('fieldSku');
const fieldPrice       = document.getElementById('fieldPrice');
const formError        = document.getElementById('formError');
const btnSaveItem      = document.getElementById('btnSaveItem');
const btnCloseModal    = document.getElementById('btnCloseModal');
const btnCancelModal   = document.getElementById('btnCancelModal');

const printModalOverlay = document.getElementById('printModalOverlay');
const labelName         = document.getElementById('labelName');
const labelPrice        = document.getElementById('labelPrice');
const labelBarcodeImg   = document.getElementById('labelBarcodeImg');
const labelSku          = document.getElementById('labelSku');
const printCopies       = document.getElementById('printCopies');
const btnPrint          = document.getElementById('btnPrint');
const btnClosePrintModal= document.getElementById('btnClosePrintModal');
const btnCancelPrint    = document.getElementById('btnCancelPrint');

const scanInput        = document.getElementById('scanInput');
const btnScan          = document.getElementById('btnScan');
const scanResult       = document.getElementById('scanResult');

// ── NAVIGATION ────────────────────────────────────────────────────────────
document.querySelectorAll('.nav-item').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const view = link.dataset.view;
    switchView(view);
  });
});

function switchView(view) {
  currentView = view;
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('view' + capitalize(view)).classList.add('active');
  document.querySelector(`[data-view="${view}"]`).classList.add('active');

  const titles = { items: ['Items', 'Manage your inventory and barcode labels'], scan: ['Scanner', 'Look up items by barcode or SKU'] };
  document.getElementById('pageTitle').textContent = titles[view][0];
  document.getElementById('pageSub').textContent   = titles[view][1];

  // Show/hide Add Item button
  btnAddItem.style.display = view === 'items' ? '' : 'none';

  if (view === 'scan') {
    scanInput.focus();
    scanResult.className = 'scan-result hidden';
    scanInput.value = '';
  }
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

// ── FETCH & RENDER ITEMS ──────────────────────────────────────────────────
async function fetchItems() {
  try {
    const res   = await fetch('/api/items');
    allItems    = await res.json();
    renderItems(allItems);
  } catch (err) {
    itemsTableBody.innerHTML = `<tr><td colspan="6" class="empty-row" style="color:#dc2626;">⚠ Could not load items. Is the server running?</td></tr>`;
  }
}

function renderItems(items) {
  itemCount.textContent = `${items.length} item${items.length !== 1 ? 's' : ''}`;

  if (items.length === 0) {
    itemsTableBody.innerHTML = `<tr><td colspan="6" class="empty-row">No items yet — click <strong>+ Add Item</strong> to get started.</td></tr>`;
    return;
  }

  itemsTableBody.innerHTML = items.map((item, idx) => `
    <tr>
      <td style="color:#94a3b8; font-size:12px;">${idx + 1}</td>
      <td><strong>${escHtml(item.name)}</strong></td>
      <td><span class="sku-badge">${escHtml(item.sku)}</span></td>
      <td>KES ${parseFloat(item.price).toFixed(2)}</td>
      <td style="color:#94a3b8; font-size:12px;">${formatDate(item.created_at)}</td>
      <td>
        <div class="action-btns">
          <button class="btn btn-sm btn-edit"   onclick="openEditModal(${item.id})">✏ Edit</button>
          <button class="btn btn-sm btn-print"  onclick="openPrintModal(${item.id})">🖨 Print</button>
          <button class="btn btn-sm btn-delete" onclick="deleteItem(${item.id}, '${escHtml(item.name)}')">🗑 Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// ── SEARCH ────────────────────────────────────────────────────────────────
searchInput.addEventListener('input', () => {
  const q = searchInput.value.toLowerCase().trim();
  if (!q) { renderItems(allItems); return; }
  renderItems(allItems.filter(i =>
    i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q)
  ));
});

// ── ADD / EDIT MODAL ──────────────────────────────────────────────────────
btnAddItem.addEventListener('click', () => openAddModal());

function openAddModal() {
  modalTitle.textContent = 'Add Item';
  editItemId.value = '';
  fieldName.value  = '';
  fieldSku.value   = '';
  fieldPrice.value = '';
  hideFormError();
  openModal(modalOverlay);
  fieldName.focus();
}

async function openEditModal(id) {
  const item = allItems.find(i => i.id === id);
  if (!item) return;

  modalTitle.textContent = 'Edit Item';
  editItemId.value = item.id;
  fieldName.value  = item.name;
  fieldSku.value   = item.sku;
  fieldPrice.value = item.price;
  hideFormError();
  openModal(modalOverlay);
  fieldName.focus();
}

btnSaveItem.addEventListener('click', saveItem);

async function saveItem() {
  hideFormError();
  const name  = fieldName.value.trim();
  const sku   = fieldSku.value.trim();
  const price = fieldPrice.value.trim();
  const id    = editItemId.value;

  if (!name) { showFormError('Item name is required.'); fieldName.focus(); return; }

  btnSaveItem.disabled = true;
  btnSaveItem.textContent = 'Saving…';

  try {
    const method = id ? 'PUT' : 'POST';
    const url    = id ? `/api/items/${id}` : '/api/items';

    const res  = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, sku, price: parseFloat(price) || 0 }),
    });
    const data = await res.json();

    if (!res.ok) { showFormError(data.error || 'Something went wrong.'); return; }

    closeModal(modalOverlay);
    await fetchItems();
  } catch (err) {
    showFormError('Network error — is the server running?');
  } finally {
    btnSaveItem.disabled = false;
    btnSaveItem.textContent = 'Save Item';
  }
}

// Enter key support inside modal
[fieldName, fieldSku, fieldPrice].forEach(input => {
  input.addEventListener('keydown', e => { if (e.key === 'Enter') saveItem(); });
});

// ── DELETE ────────────────────────────────────────────────────────────────
async function deleteItem(id, name) {
  if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
  try {
    await fetch(`/api/items/${id}`, { method: 'DELETE' });
    await fetchItems();
  } catch (err) {
    alert('Could not delete item.');
  }
}

// ── PRINT MODAL ───────────────────────────────────────────────────────────
async function openPrintModal(id) {
  const item = allItems.find(i => i.id === id);
  if (!item) return;

  labelName.textContent  = item.name;
  labelPrice.textContent = `KES ${parseFloat(item.price).toFixed(2)}`;
  labelSku.textContent   = item.sku;
  labelBarcodeImg.src    = '';
  printCopies.value      = 1;
  openModal(printModalOverlay);

  try {
    const res  = await fetch(`/api/barcode/${encodeURIComponent(item.sku)}`);
    const data = await res.json();
    labelBarcodeImg.src = data.image;
  } catch (err) {
    labelBarcodeImg.alt = 'Could not load barcode image';
  }
}

btnPrint.addEventListener('click', () => {
  const copies  = parseInt(printCopies.value) || 1;
  const name    = labelName.textContent;
  const price   = labelPrice.textContent;
  const sku     = labelSku.textContent;
  const imgSrc  = labelBarcodeImg.src;

  // Build a hidden print-ready page and trigger browser print
  const labels  = Array.from({ length: copies }, () => `
    <div class="label">
      <div class="l-name">${escHtml(name)}</div>
      <div class="l-price">${escHtml(price)}</div>
      <img src="${imgSrc}" alt="barcode" />
      <div class="l-sku">${escHtml(sku)}</div>
    </div>
  `).join('');

  const win = window.open('', '_blank', 'width=600,height=500');
  win.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Print Labels — ${escHtml(name)}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; background: white; }
        .labels-wrap { display: flex; flex-wrap: wrap; gap: 10px; padding: 12px; }
        .label {
          border: 1.5px dashed #aaa;
          border-radius: 6px;
          padding: 12px 16px;
          width: 220px;
          text-align: center;
        }
        .l-name  { font-size: 13px; font-weight: 700; margin-bottom: 3px; }
        .l-price { font-size: 12px; color: #444; margin-bottom: 8px; }
        img      { max-width: 180px; display: block; margin: 0 auto; }
        .l-sku   { font-size: 9px; color: #666; margin-top: 5px; letter-spacing: 1px; font-family: monospace; }
        @media print {
          body { margin: 0; }
          .labels-wrap { gap: 6px; padding: 6px; }
        }
      </style>
    </head>
    <body>
      <div class="labels-wrap">${labels}</div>
      <script>
        window.onload = function() { setTimeout(function() { window.print(); }, 400); };
      <\/script>
    </body>
    </html>
  `);
  win.document.close();
});

// ── SCANNER ───────────────────────────────────────────────────────────────
btnScan.addEventListener('click', doScan);
scanInput.addEventListener('keydown', e => { if (e.key === 'Enter') doScan(); });

async function doScan() {
  const val = scanInput.value.trim();
  if (!val) return;

  scanResult.className = 'scan-result';
  scanResult.innerHTML = 'Looking up…';

  try {
    const res  = await fetch(`/api/scan/${encodeURIComponent(val)}`);
    const data = await res.json();

    if (!res.ok) {
      scanResult.className = 'scan-result error';
      scanResult.innerHTML = `⚠ No item found for barcode <strong>${escHtml(val)}</strong>`;
    } else {
      scanResult.className = 'scan-result success';
      scanResult.innerHTML = `
        <div class="scan-item-name">✓ ${escHtml(data.name)}</div>
        <div class="scan-item-price">KES ${parseFloat(data.price).toFixed(2)}</div>
        <div class="scan-item-sku">${escHtml(data.sku)}</div>
      `;
    }
  } catch (err) {
    scanResult.className = 'scan-result error';
    scanResult.innerHTML = 'Network error — is the server running?';
  }
}

// ── MODAL HELPERS ─────────────────────────────────────────────────────────
function openModal(overlay)  { overlay.classList.remove('hidden'); }
function closeModal(overlay) { overlay.classList.add('hidden'); }

btnCloseModal.addEventListener('click',  () => closeModal(modalOverlay));
btnCancelModal.addEventListener('click', () => closeModal(modalOverlay));
btnClosePrintModal.addEventListener('click', () => closeModal(printModalOverlay));
btnCancelPrint.addEventListener('click',     () => closeModal(printModalOverlay));

// Close modal on overlay click
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(modalOverlay); });
printModalOverlay.addEventListener('click', e => { if (e.target === printModalOverlay) closeModal(printModalOverlay); });

// ── UTILITIES ─────────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-KE', { day:'2-digit', month:'short', year:'numeric' });
}

function showFormError(msg) {
  formError.textContent = msg;
  formError.classList.remove('hidden');
}

function hideFormError() {
  formError.classList.add('hidden');
  formError.textContent = '';
}

// ── INIT ──────────────────────────────────────────────────────────────────
fetchItems();