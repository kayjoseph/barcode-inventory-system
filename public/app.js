// ── STATE ─────────────────────────────────────────────────────────────────
let allItems       = [];
let lpSelectedItem = null;
let lpBarcodeImg   = null;

// ── DOM REFS ──────────────────────────────────────────────────────────────
const itemsTableBody = document.getElementById('itemsTableBody');
const searchInput    = document.getElementById('searchInput');
const itemCount      = document.getElementById('itemCount');
const btnAddItem     = document.getElementById('btnAddItem');

const modalOverlay  = document.getElementById('modalOverlay');
const modalTitle    = document.getElementById('modalTitle');
const editItemId    = document.getElementById('editItemId');
const fieldName     = document.getElementById('fieldName');
const fieldSku      = document.getElementById('fieldSku');
const fieldPrice    = document.getElementById('fieldPrice');
const formError     = document.getElementById('formError');
const btnSaveItem   = document.getElementById('btnSaveItem');
const btnCloseModal = document.getElementById('btnCloseModal');
const btnCancelModal= document.getElementById('btnCancelModal');

const lpSearch       = document.getElementById('lpSearch');
const lpItemList     = document.getElementById('lpItemList');
const lpCopies       = document.getElementById('lpCopies');
const lpLabelSize    = document.getElementById('lpLabelSize');
const lpPerRow       = document.getElementById('lpPerRow');
const lpShowName     = document.getElementById('lpShowName');
const lpShowPrice    = document.getElementById('lpShowPrice');
const lpShowSku      = document.getElementById('lpShowSku');
const btnPrintLabels = document.getElementById('btnPrintLabels');
const lpNote         = document.getElementById('lpNote');
const lpPreviewArea  = document.getElementById('lpPreviewArea');
const lpCopiesDisplay= document.getElementById('lpCopiesDisplay');

const scanInput  = document.getElementById('scanInput');
const btnScan    = document.getElementById('btnScan');
const scanResult = document.getElementById('scanResult');

// ── NAVIGATION ────────────────────────────────────────────────────────────
document.querySelectorAll('.nav-item').forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    switchView(link.dataset.view);
  });
});

function switchView(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('view' + cap(view)).classList.add('active');
  document.querySelector(`[data-view="${view}"]`).classList.add('active');

  const meta = {
    items:  ['Items',       'Manage your inventory and barcode labels'],
    labels: ['Label Print', 'Select an item, set copies, and print sticker labels'],
    scan:   ['Scanner',     'Look up items by scanning or entering a barcode'],
  };
  document.getElementById('pageTitle').textContent = meta[view][0];
  document.getElementById('pageSub').textContent   = meta[view][1];
  btnAddItem.style.display = view === 'items' ? '' : 'none';

  if (view === 'labels') renderLpItemList(allItems);
  if (view === 'scan')   { scanInput.focus(); scanResult.className = 'scan-result hidden'; scanInput.value = ''; }
}

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

// Show Add Item button on items view
btnAddItem.style.display = '';

// ── FETCH & RENDER ITEMS ──────────────────────────────────────────────────
async function fetchItems() {
  try {
    const res = await fetch('/api/items');
    allItems  = await res.json();
    renderItems(allItems);
  } catch {
    itemsTableBody.innerHTML = `<tr><td colspan="6" class="empty-row" style="color:#dc2626;">⚠ Could not reach server.</td></tr>`;
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
      <td style="color:#94a3b8;font-size:12px;">${idx + 1}</td>
      <td><strong>${esc(item.name)}</strong></td>
      <td><span class="sku-badge">${esc(item.sku)}</span></td>
      <td>KES ${parseFloat(item.price).toFixed(2)}</td>
      <td style="color:#94a3b8;font-size:12px;">${fmtDate(item.created_at)}</td>
      <td>
        <div class="action-btns">
          <button class="btn btn-sm btn-edit"   onclick="openEditModal(${item.id})">✏ Edit</button>
          <button class="btn btn-sm btn-print"  onclick="quickPrint(${item.id})">🖨 Print</button>
          <button class="btn btn-sm btn-delete" onclick="deleteItem(${item.id},'${esc(item.name)}')">🗑</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// ── SEARCH ────────────────────────────────────────────────────────────────
searchInput.addEventListener('input', () => {
  const q = searchInput.value.toLowerCase().trim();
  renderItems(q ? allItems.filter(i => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q)) : allItems);
});

// ── ADD / EDIT MODAL ──────────────────────────────────────────────────────
btnAddItem.addEventListener('click', openAddModal);

function openAddModal() {
  modalTitle.textContent = 'Add Item';
  editItemId.value = '';
  fieldName.value  = '';
  fieldSku.value   = '';
  fieldPrice.value = '';
  hideErr();
  modalOverlay.classList.remove('hidden');
  fieldName.focus();
}

function openEditModal(id) {
  const item = allItems.find(i => i.id === id);
  if (!item) return;
  modalTitle.textContent = 'Edit Item';
  editItemId.value = item.id;
  fieldName.value  = item.name;
  fieldSku.value   = item.sku;
  fieldPrice.value = item.price;
  hideErr();
  modalOverlay.classList.remove('hidden');
  fieldName.focus();
}

btnSaveItem.addEventListener('click', saveItem);
[fieldName, fieldSku, fieldPrice].forEach(inp => inp.addEventListener('keydown', e => { if (e.key === 'Enter') saveItem(); }));

async function saveItem() {
  hideErr();
  const name  = fieldName.value.trim();
  const sku   = fieldSku.value.trim();
  const price = fieldPrice.value.trim();
  const id    = editItemId.value;

  if (!name) { showErr('Item name is required.'); fieldName.focus(); return; }

  btnSaveItem.disabled = true;
  btnSaveItem.textContent = 'Saving…';
  try {
    const res  = await fetch(id ? `/api/items/${id}` : '/api/items', {
      method:  id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name, sku, price: parseFloat(price) || 0 }),
    });
    const data = await res.json();
    if (!res.ok) { showErr(data.error || 'Something went wrong.'); return; }
    modalOverlay.classList.add('hidden');
    await fetchItems();
  } catch { showErr('Network error — is the server running?'); }
  finally  { btnSaveItem.disabled = false; btnSaveItem.textContent = 'Save Item'; }
}

btnCloseModal.addEventListener('click',  () => modalOverlay.classList.add('hidden'));
btnCancelModal.addEventListener('click', () => modalOverlay.classList.add('hidden'));
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) modalOverlay.classList.add('hidden'); });

// ── DELETE ────────────────────────────────────────────────────────────────
async function deleteItem(id, name) {
  if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
  await fetch(`/api/items/${id}`, { method: 'DELETE' });
  await fetchItems();
}

// ── QUICK PRINT (from Items table) ───────────────────────────────────────
function quickPrint(id) {
  // Switch to Label Print view with this item pre-selected
  switchView('labels');
  setTimeout(() => selectLpItem(id), 100);
}

// ── LABEL PRINT ───────────────────────────────────────────────────────────

// Render item list in left panel
function renderLpItemList(items) {
  if (items.length === 0) {
    lpItemList.innerHTML = '<p class="lp-empty">No items yet.</p>';
    return;
  }
  lpItemList.innerHTML = items.map(item => `
    <div class="lp-item-row ${lpSelectedItem && lpSelectedItem.id === item.id ? 'selected' : ''}"
         onclick="selectLpItem(${item.id})">
      <div class="lp-item-row-name">${esc(item.name)}</div>
      <div class="lp-item-row-meta">${esc(item.sku)} · KES ${parseFloat(item.price).toFixed(2)}</div>
    </div>
  `).join('');
}

// Search filter in label panel
lpSearch.addEventListener('input', () => {
  const q = lpSearch.value.toLowerCase().trim();
  renderLpItemList(q ? allItems.filter(i => i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q)) : allItems);
});

// Select an item
async function selectLpItem(id) {
  lpSelectedItem = allItems.find(i => i.id === id);
  if (!lpSelectedItem) return;

  // Highlight selected row
  document.querySelectorAll('.lp-item-row').forEach(r => r.classList.remove('selected'));
  const rows = document.querySelectorAll('.lp-item-row');
  rows.forEach(r => {
    if (r.querySelector('.lp-item-row-meta').textContent.includes(lpSelectedItem.sku)) {
      r.classList.add('selected');
    }
  });

  btnPrintLabels.disabled = true;
  lpNote.textContent = 'Loading barcode…';
  lpBarcodeImg = null;

  try {
    const res  = await fetch(`/api/barcode/${encodeURIComponent(lpSelectedItem.sku)}`);
    const data = await res.json();
    lpBarcodeImg = data.image;
    btnPrintLabels.disabled = false;
    lpNote.textContent = '';
    updatePreview();
  } catch {
    lpNote.textContent = 'Could not load barcode image.';
  }
}

// Update the live preview whenever any setting changes
function updatePreview() {
  if (!lpSelectedItem || !lpBarcodeImg) return;

  const copies   = parseInt(lpCopies.value)  || 1;
  const size     = lpLabelSize.value;
  const perRow   = parseInt(lpPerRow.value)  || 2;
  const showName = lpShowName.checked;
  const showPrice= lpShowPrice.checked;
  const showSku  = lpShowSku.checked;

  lpCopiesDisplay.textContent = `${copies} label${copies !== 1 ? 's' : ''}`;

  // Show max 12 in preview, then a "+N more" badge
  const previewCount = Math.min(copies, 12);
  const remaining    = copies - previewCount;

  const labelHTML = () => `
    <div class="label-card size-${size}">
      ${showName  ? `<div class="lc-name">${esc(lpSelectedItem.name)}</div>` : ''}
      ${showPrice ? `<div class="lc-price">KES ${parseFloat(lpSelectedItem.price).toFixed(2)}</div>` : ''}
      <img class="lc-img" src="${lpBarcodeImg}" alt="barcode" />
      ${showSku   ? `<div class="lc-sku">${esc(lpSelectedItem.sku)}</div>` : ''}
    </div>
  `;

  let html = Array.from({ length: previewCount }, () => labelHTML()).join('');
  if (remaining > 0) {
    html += `<div class="lp-more-badge">+${remaining} more label${remaining !== 1 ? 's' : ''}</div>`;
  }

  lpPreviewArea.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:12px;align-content:flex-start;">${html}</div>`;
}

// Wire up all settings to update preview
[lpCopies, lpLabelSize, lpPerRow, lpShowName, lpShowPrice, lpShowSku].forEach(el => {
  el.addEventListener('change', updatePreview);
  el.addEventListener('input',  updatePreview);
});

// Qty +/- buttons
document.getElementById('qtyMinus').addEventListener('click', () => {
  lpCopies.value = Math.max(1, parseInt(lpCopies.value) - 1);
  updatePreview();
});
document.getElementById('qtyPlus').addEventListener('click', () => {
  lpCopies.value = Math.min(500, parseInt(lpCopies.value) + 1);
  updatePreview();
});

// ── PRINT ─────────────────────────────────────────────────────────────────
btnPrintLabels.addEventListener('click', printLabels);

function printLabels() {
  if (!lpSelectedItem || !lpBarcodeImg) return;

  const copies   = parseInt(lpCopies.value) || 1;
  const size     = lpLabelSize.value;
  const perRow   = parseInt(lpPerRow.value) || 2;
  const showName = lpShowName.checked;
  const showPrice= lpShowPrice.checked;
  const showSku  = lpShowSku.checked;

  const sizes = {
  small:  { w: '50.8mm', h: '38mm',   namePx: 10, pricePx: 9,  skuPx: 8  },
  medium: { w: '50.8mm', h: '57mm',   namePx: 12, pricePx: 11, skuPx: 9  },
  large:  { w: '50.8mm', h: '76.2mm', namePx: 14, pricePx: 12, skuPx: 10 },
};
  const s = sizes[size];

  const oneLabel = `
    <div class="label">
      ${showName  ? `<div class="l-name">${esc(lpSelectedItem.name)}</div>` : ''}
      ${showPrice ? `<div class="l-price">KES ${parseFloat(lpSelectedItem.price).toFixed(2)}</div>` : ''}
      <img src="${lpBarcodeImg}" alt="barcode" />
      ${showSku   ? `<div class="l-sku">${esc(lpSelectedItem.sku)}</div>` : ''}
    </div>
  `;

  const allLabels = Array.from({ length: copies }, () => oneLabel).join('');

  const win = window.open('', '_blank', 'width=800,height=600');
  win.document.write(`
    <!DOCTYPE html><html>
    <head>
      <title>Print — ${esc(lpSelectedItem.name)} × ${copies}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }

        @page {
          size: 50.8mm 76.2mm;
          margin: 0;
        }

        body {
          font-family: Arial, sans-serif;
          background: white;
          margin: 0;
          padding: 0;
          width: 50.8mm;
        }

        .label {
          width: 50.8mm;
          height: 76.2mm;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 3mm 2mm;
          gap: 2mm;
          overflow: hidden;
          page-break-after: always;
        }

        .label:last-child { page-break-after: avoid; }

        .l-name  { font-size: ${s.namePx}px; font-weight: 700; line-height: 1.3; }
        .l-price { font-size: ${s.pricePx}px; color: #333; }
        .l-sku   { font-size: ${s.skuPx}px; color: #555; font-family: monospace; letter-spacing: .5px; }
        img      { max-width: 88%; max-height: 35mm; object-fit: contain; }
      </style>
    </head>
    <body>
      <div>${allLabels}</div>
      <script>
        window.onload = () => {
          setTimeout(() => window.print(), 400);
        };
      <\/script>
    </body></html>
  `);
  win.document.close();
}

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
      scanResult.innerHTML = `⚠ No item found for <strong>${esc(val)}</strong>`;
    } else {
      scanResult.className = 'scan-result success';
      scanResult.innerHTML = `
        <div class="scan-item-name">✓ ${esc(data.name)}</div>
        <div class="scan-item-price">KES ${parseFloat(data.price).toFixed(2)}</div>
        <div class="scan-item-sku">${esc(data.sku)}</div>
      `;
    }
  } catch {
    scanResult.className = 'scan-result error';
    scanResult.innerHTML = 'Network error — is the server running?';
  }
}

// ── UTILS ─────────────────────────────────────────────────────────────────
function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-KE', { day:'2-digit', month:'short', year:'numeric' });
}
function showErr(msg) { formError.textContent = msg; formError.classList.remove('hidden'); }
function hideErr()    { formError.classList.add('hidden'); formError.textContent = ''; }

// ── INIT ──────────────────────────────────────────────────────────────────
switchView('items');
fetchItems();