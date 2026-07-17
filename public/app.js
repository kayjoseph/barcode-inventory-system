// ── STATE ─────────────────────────────────────────────────────────────────
let allItems       = [];
let lpSelectedItem = null;
let lpBarcodeImg   = null;

// ── INIT (runs after DOM is ready) ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  initItemsView();
  initModal();
  initLabelPrint();
  initScanner();
  switchView('items');
  fetchItems();
});

// ── NAVIGATION ────────────────────────────────────────────────────────────
function initNavigation() {
  document.querySelectorAll('.nav-item').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      switchView(link.dataset.view);
    });
  });
}

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
  document.getElementById('btnAddItem').style.display = view === 'items' ? '' : 'none';

  if (view === 'labels') renderLpItemList(allItems);
  if (view === 'scan') {
    document.getElementById('scanInput').focus();
    document.getElementById('scanResult').className = 'scan-result hidden';
    document.getElementById('scanInput').value = '';
  }
}

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

// ── ITEMS VIEW ────────────────────────────────────────────────────────────
function initItemsView() {
  document.getElementById('btnAddItem').addEventListener('click', openAddModal);
  document.getElementById('searchInput').addEventListener('input', () => {
    const q = document.getElementById('searchInput').value.toLowerCase().trim();
    renderItems(q ? allItems.filter(i =>
      i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q)
    ) : allItems);
  });
}

async function fetchItems() {
  try {
    const res = await fetch('/api/items');
    allItems  = await res.json();
    renderItems(allItems);
  } catch {
    document.getElementById('itemsTableBody').innerHTML =
      `<tr><td colspan="6" class="empty-row" style="color:#dc2626;">Could not reach server.</td></tr>`;
  }
}

function renderItems(items) {
  document.getElementById('itemCount').textContent = `${items.length} item${items.length !== 1 ? 's' : ''}`;
  if (items.length === 0) {
    document.getElementById('itemsTableBody').innerHTML =
      `<tr><td colspan="6" class="empty-row">No items yet — click <strong>+ Add Item</strong> to get started.</td></tr>`;
    return;
  }
  document.getElementById('itemsTableBody').innerHTML = items.map((item, idx) => `
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

async function deleteItem(id, name) {
  if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
  await fetch(`/api/items/${id}`, { method: 'DELETE' });
  await fetchItems();
}

function quickPrint(id) {
  switchView('labels');
  setTimeout(() => selectLpItem(id), 150);
}

// ── MODAL ─────────────────────────────────────────────────────────────────
function initModal() {
  document.getElementById('btnCloseModal').addEventListener('click',  closeModal);
  document.getElementById('btnCancelModal').addEventListener('click', closeModal);
  document.getElementById('btnSaveItem').addEventListener('click', saveItem);
  document.getElementById('modalOverlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modalOverlay')) closeModal();
  });
  ['fieldName','fieldSku','fieldPrice'].forEach(id => {
    document.getElementById(id).addEventListener('keydown', e => { if (e.key === 'Enter') saveItem(); });
  });
}

function openAddModal() {
  document.getElementById('modalTitle').textContent = 'Add Item';
  document.getElementById('editItemId').value = '';
  document.getElementById('fieldName').value  = '';
  document.getElementById('fieldSku').value   = '';
  document.getElementById('fieldPrice').value = '';
  hideErr();
  document.getElementById('modalOverlay').classList.remove('hidden');
  document.getElementById('fieldName').focus();
}

function openEditModal(id) {
  const item = allItems.find(i => i.id === id);
  if (!item) return;
  document.getElementById('modalTitle').textContent = 'Edit Item';
  document.getElementById('editItemId').value = item.id;
  document.getElementById('fieldName').value  = item.name;
  document.getElementById('fieldSku').value   = item.sku;
  document.getElementById('fieldPrice').value = item.price;
  hideErr();
  document.getElementById('modalOverlay').classList.remove('hidden');
  document.getElementById('fieldName').focus();
}

function closeModal() {
  document.getElementById('modalOverlay').classList.add('hidden');
}

async function saveItem() {
  hideErr();
  const name  = document.getElementById('fieldName').value.trim();
  const sku   = document.getElementById('fieldSku').value.trim();
  const price = document.getElementById('fieldPrice').value.trim();
  const id    = document.getElementById('editItemId').value;

  if (!name) { showErr('Item name is required.'); document.getElementById('fieldName').focus(); return; }

  const btn = document.getElementById('btnSaveItem');
  btn.disabled = true;
  btn.textContent = 'Saving…';
  try {
    const res  = await fetch(id ? `/api/items/${id}` : '/api/items', {
      method:  id ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ name, sku, price: parseFloat(price) || 0 }),
    });
    const data = await res.json();
    if (!res.ok) { showErr(data.error || 'Something went wrong.'); return; }
    closeModal();
    await fetchItems();
  } catch { showErr('Network error — is the server running?'); }
  finally  { btn.disabled = false; btn.textContent = 'Save Item'; }
}

// ── LABEL PRINT ───────────────────────────────────────────────────────────
function initLabelPrint() {
  document.getElementById('lpSearch').addEventListener('input', () => {
    const q = document.getElementById('lpSearch').value.toLowerCase().trim();
    renderLpItemList(q ? allItems.filter(i =>
      i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q)
    ) : allItems);
  });

  document.getElementById('qtyMinus').addEventListener('click', () => {
    const el = document.getElementById('lpCopies');
    el.value = Math.max(1, parseInt(el.value) - 1);
    updatePreview();
  });

  document.getElementById('qtyPlus').addEventListener('click', () => {
    const el = document.getElementById('lpCopies');
    el.value = Math.min(500, parseInt(el.value) + 1);
    updatePreview();
  });

  ['lpCopies','lpLabelSize','lpPerRow','lpShowName','lpShowPrice','lpShowSku'].forEach(id => {
    document.getElementById(id).addEventListener('change', updatePreview);
    document.getElementById(id).addEventListener('input',  updatePreview);
  });

  document.getElementById('btnPrintLabels').addEventListener('click', printLabels);
}

function renderLpItemList(items) {
  const list = document.getElementById('lpItemList');
  if (items.length === 0) {
    list.innerHTML = '<p class="lp-empty">No items yet.</p>';
    return;
  }
  list.innerHTML = items.map(item => `
    <div class="lp-item-row ${lpSelectedItem && lpSelectedItem.id === item.id ? 'selected' : ''}"
         onclick="selectLpItem(${item.id})">
      <div class="lp-item-row-name">${esc(item.name)}</div>
      <div class="lp-item-row-meta">${esc(item.sku)} · KES ${parseFloat(item.price).toFixed(2)}</div>
    </div>
  `).join('');
}

async function selectLpItem(id) {
  lpSelectedItem = allItems.find(i => i.id === id);
  if (!lpSelectedItem) return;

  document.querySelectorAll('.lp-item-row').forEach(r => r.classList.remove('selected'));
  document.querySelectorAll('.lp-item-row').forEach(r => {
    if (r.querySelector('.lp-item-row-meta').textContent.includes(lpSelectedItem.sku)) {
      r.classList.add('selected');
    }
  });

  const btn = document.getElementById('btnPrintLabels');
  btn.disabled = true;
  document.getElementById('lpNote').textContent = 'Loading barcode…';
  lpBarcodeImg = null;

  try {
    const res  = await fetch(`/api/barcode/${encodeURIComponent(lpSelectedItem.sku)}`);
    const data = await res.json();
    lpBarcodeImg = data.image;
    btn.disabled = false;
    document.getElementById('lpNote').textContent = '';
    updatePreview();
  } catch {
    document.getElementById('lpNote').textContent = 'Could not load barcode image.';
  }
}

function updatePreview() {
  if (!lpSelectedItem || !lpBarcodeImg) return;

  const copies   = parseInt(document.getElementById('lpCopies').value) || 1;
  const size     = document.getElementById('lpLabelSize').value;
  const showName = document.getElementById('lpShowName').checked;
  const showPrice= document.getElementById('lpShowPrice').checked;
  const showSku  = document.getElementById('lpShowSku').checked;

  document.getElementById('lpCopiesDisplay').textContent = `${copies} label${copies !== 1 ? 's' : ''}`;

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
  if (remaining > 0) html += `<div class="lp-more-badge">+${remaining} more label${remaining !== 1 ? 's' : ''}</div>`;

  document.getElementById('lpPreviewArea').innerHTML =
    `<div style="display:flex;flex-wrap:wrap;gap:12px;align-content:flex-start;">${html}</div>`;
}

function printLabels() {
  if (!lpSelectedItem || !lpBarcodeImg) {
    alert('Please select an item first.');
    return;
  }

  const copies    = parseInt(document.getElementById('lpCopies').value) || 1;
  const size      = document.getElementById('lpLabelSize').value;
  const showName  = document.getElementById('lpShowName').checked;
  const showPrice = document.getElementById('lpShowPrice').checked;
  const showSku   = document.getElementById('lpShowSku').checked;

  const sizes = {
    small:  { namePx: 10, pricePx: 9,  skuPx: 8  },
    medium: { namePx: 12, pricePx: 11, skuPx: 9  },
    large:  { namePx: 14, pricePx: 12, skuPx: 10 },
  };
  const s = sizes[size];

  const oneLabel = `
    <div class="label">
      ${showName  ? `<div class="l-name">${esc(lpSelectedItem.name)}</div>`  : ''}
      ${showPrice ? `<div class="l-price">KES ${parseFloat(lpSelectedItem.price).toFixed(2)}</div>` : ''}
      <img src="${lpBarcodeImg}" alt="barcode" />
      ${showSku   ? `<div class="l-sku">${esc(lpSelectedItem.sku)}</div>` : ''}
    </div>
  `;

  const allLabels = Array.from({ length: copies }, () => oneLabel).join('');

  const old = document.getElementById('printContainer');
  if (old) old.remove();
  const oldStyle = document.getElementById('printStyle');
  if (oldStyle) oldStyle.remove();

  const container = document.createElement('div');
  container.id = 'printContainer';
  container.innerHTML = allLabels;
  document.body.appendChild(container);

  const style = document.createElement('style');
  style.id = 'printStyle';
  style.textContent = `
    @media print {
      @page { size: 50.8mm 76.2mm; margin: 0; }
      body > *:not(#printContainer) { display: none !important; }
      #printContainer { display: block !important; width: 50.8mm; margin: 0; padding: 0; }
      #printContainer .label {
        width: 50.8mm; height: 76.2mm;
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
        text-align: center; padding: 3mm 2mm; gap: 2mm;
        overflow: hidden; page-break-after: always; box-sizing: border-box;
      }
      #printContainer .label:last-child { page-break-after: avoid; }
      #printContainer .l-name  { font-size: ${s.namePx}px; font-weight: 700; line-height: 1.3; font-family: Arial, sans-serif; }
      #printContainer .l-price { font-size: ${s.pricePx}px; color: #333; font-family: Arial, sans-serif; }
      #printContainer .l-sku   { font-size: ${s.skuPx}px; color: #555; font-family: monospace; letter-spacing: .5px; }
      #printContainer img      { max-width: 88%; max-height: 35mm; object-fit: contain; display: block; margin: 0 auto; }
    }
    #printContainer { display: none; }
  `;
  document.head.appendChild(style);

  setTimeout(() => window.print(), 300);
}

// ── SCANNER ───────────────────────────────────────────────────────────────
function initScanner() {
  document.getElementById('btnScan').addEventListener('click', doScan);
  document.getElementById('scanInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') doScan();
  });
}

async function doScan() {
  const val    = document.getElementById('scanInput').value.trim();
  const result = document.getElementById('scanResult');
  if (!val) return;
  result.className = 'scan-result';
  result.innerHTML = 'Looking up…';
  try {
    const res  = await fetch(`/api/scan/${encodeURIComponent(val)}`);
    const data = await res.json();
    if (!res.ok) {
      result.className = 'scan-result error';
      result.innerHTML = `⚠ No item found for <strong>${esc(val)}</strong>`;
    } else {
      result.className = 'scan-result success';
      result.innerHTML = `
        <div class="scan-item-name">✓ ${esc(data.name)}</div>
        <div class="scan-item-price">KES ${parseFloat(data.price).toFixed(2)}</div>
        <div class="scan-item-sku">${esc(data.sku)}</div>
      `;
    }
  } catch {
    result.className = 'scan-result error';
    result.innerHTML = 'Network error — is the server running?';
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
function showErr(msg) {
  const el = document.getElementById('formError');
  el.textContent = msg; el.classList.remove('hidden');
}
function hideErr() {
  const el = document.getElementById('formError');
  el.classList.add('hidden'); el.textContent = '';
}