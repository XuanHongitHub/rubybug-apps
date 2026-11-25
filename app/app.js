(() => {
const D = RB_DATA, S = RB_AUTH.store;
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = t => new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const fmtTime = t => new Date(t).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const ago = t => { const m = Math.round((D.NOW - t) / 60000); return m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' d ago'; };
const CH = { tiktok: ['TikTok Shop', 'TT'], shopify: ['Shopify', 'SH'], amazon: ['Amazon', 'AM'] };
const ST = { awaiting_shipment: ['Awaiting shipment', 'warn'], in_transit: ['In transit', 'info'], delivered: ['Delivered', 'ok'], completed: ['Completed', 'ok'], cancelled: ['Cancelled', 'err'] };
const SCOPES = [['seller.shop.info', 'Shop name, region and shop ID to identify the connected store'],
  ['seller.order.info', 'Orders to show and fulfil them; buyer contact fields are masked and encrypted'],
  ['seller.product.basic', 'Product titles, SKUs and prices for the product list'],
  ['seller.logistics', 'Warehouses and shipping providers for shipments']];

// ---- persisted demo state (per browser) ----
const KEY = 'rb.state.v1';
const init = () => ({ stores: D.stores.map(s => ({ ...s })), orders: D.orders.map(o => ({ ...o })), products: D.products.map(p => ({ ...p, stock: { ...p.stock } })), audit: D.audit.slice(), twofa: true });
let st = S.get(KEY) || init();
const save = () => S.set(KEY, st);
const log = (action, target) => { st.audit.unshift({ at: Date.now(), actor: 'demo@rubybugllc.com', action, target }); save(); };
const connected = () => st.stores.filter(s => s.status === 'connected');
const liveChannels = () => new Set(connected().map(s => s.channel));
let storeFilter = 'all';
const visibleOrders = () => st.orders.filter(o => liveChannels().has(o.channel) && (storeFilter === 'all' || o.channel === storeFilter));

// ---- ui helpers ----
const $ = s => document.querySelector(s);
function toast(msg, err) { const t = document.createElement('div'); t.className = 'toast' + (err ? ' err' : ''); t.textContent = msg; $('#toasts').append(t); setTimeout(() => t.remove(), 3200); }
function layer(html, kind) {
  close(); const o = document.createElement('div'); o.className = 'overlay'; o.id = 'ov';
  const p = document.createElement('div'); p.className = kind; p.id = 'panel'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-modal', 'true'); p.innerHTML = html;
  o.onclick = close; document.body.append(o, p); requestAnimationFrame(() => { o.classList.add('show'); p.classList.add('show'); });
  p.querySelector('button, a, input')?.focus(); return p;
}
function close() { $('#ov')?.remove(); $('#panel')?.remove(); }
addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
function confirmBox(title, body, okLabel, onOk) {
  const p = layer(`<h2>${esc(title)}</h2><p class="muted">${body}</p><div class="row" style="justify-content:flex-end;margin-top:18px"><button class="btn" data-x>Cancel</button><button class="btn primary" data-ok>${esc(okLabel)}</button></div>`, 'modal');
  p.querySelector('[data-x]').onclick = close; p.querySelector('[data-ok]').onclick = () => { close(); onOk(); };
}
const chip = c => `<span class="ch ${c}" style="width:24px;height:24px;font-size:10px;border-radius:6px;display:inline-grid">${CH[c][1]}</span>`;
const statusBadge = s => `<span class="badge ${ST[s][1]}">${ST[s][0]}</span>`;
const maskName = n => n.split(' ').map(w => w[0] + '***').join(' ');
const maskPhone = p => '(***) ***-' + p.slice(-4);
const emptyState = (title, text, action = '') => `<div class="empty"><strong>${esc(title)}</strong>${esc(text)}${action ? `<div style="margin-top:12px">${action}</div>` : ''}</div>`;

// ---- icons ----
const I = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const NAV = [
  ['dashboard', 'Dashboard', I('<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>')],
  ['orders', 'Orders', I('<path d="M6 3h12l1 5H5z"/><path d="M5 8v12h14V8"/><path d="M9 12h6"/>')],
  ['products', 'Products', I('<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/>')],
  ['inventory', 'Inventory', I('<path d="M4 7h16M4 12h16M4 17h10"/>')],
  ['shipments', 'Shipments', I('<path d="M3 7h11v9H3z"/><path d="M14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/>')],
  ['stores', 'Stores', I('<path d="M4 9l1.5-5h13L20 9"/><path d="M4 9v11h16V9"/><path d="M4 9h16"/><path d="M10 20v-5h4v5"/>')],
  ['analytics', 'Analytics', I('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>')],
  ['sep'],
  ['settings', 'Settings', I('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>')],
  ['logout', 'Sign out', I('<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>')],
];
function renderNav(active) {
  const toShip = visibleOrders().filter(o => o.status === 'awaiting_shipment').length;
  const low = st.products.filter(isLow).length;
  $('#nav').innerHTML = NAV.map(([k, label, icon]) => k === 'sep' ? '<div class="nav-sep"></div>' :
    `<a href="#/${k}" class="${k === active ? 'on' : ''}" ${k === active ? 'aria-current="page"' : ''}>${icon}${label}${k === 'orders' && toShip ? `<span class="count">${toShip}</span>` : ''}${k === 'inventory' && low ? `<span class="count">${low}</span>` : ''}</a>`).join('');
  const sp = $('#storePick');
  sp.innerHTML = '<option value="all">All stores</option>' + connected().map(s => `<option value="${s.channel}" ${storeFilter === s.channel ? 'selected' : ''}>${esc(s.name)}</option>`).join('');
}
const isLow = p => Object.values(p.stock).reduce((a, b) => a + b, 0) < 10;

// ---- pages ----
const pages = {};

pages.dashboard = () => {
  const os = visibleOrders();
  if (!connected().length) return noStores();
  const today = os.filter(o => D.NOW - o.created < D.DAY);
  const rev7 = os.filter(o => D.NOW - o.created < 7 * D.DAY && o.status !== 'cancelled').reduce((s, o) => s + o.total, 0);
  const toShip = os.filter(o => o.status === 'awaiting_shipment');
  const days = Array.from({ length: 14 }, (_, i) => { const end = D.NOW - (13 - i) * D.DAY; const v = os.filter(o => o.status !== 'cancelled' && o.created <= end && o.created > end - D.DAY).reduce((s, o) => s + o.total, 0); return { t: end, v }; });
  const max = Math.max(...days.map(d => d.v), 1);
  const byCh = {}; os.filter(o => o.status !== 'cancelled').forEach(o => byCh[o.channel] = (byCh[o.channel] || 0) + o.total);
  const tot = Object.values(byCh).reduce((a, b) => a + b, 0) || 1;
  return `
  <div class="grid kpis">
    ${kpi('Orders today', today.length, '+12% vs yesterday', 1)}
    ${kpi('Revenue, 7 days', money(rev7), '+8.4% vs prior 7 days', 1)}
    ${kpi('Awaiting shipment', toShip.length, toShip.length ? 'Ship by today 6 PM' : 'All shipped', 0)}
    ${kpi('Low stock SKUs', st.products.filter(isLow).length, 'Below 10 units across channels', 0)}
  </div>
  <div class="grid two" style="margin-top:16px">
    <section class="card"><div class="row between"><h2>Revenue, last 14 days</h2><span class="faint num">${money(days.reduce((s, d) => s + d.v, 0))}</span></div>
      <div class="bars">${days.map(d => `<div class="b" style="height:${Math.max(2, d.v / max * 100)}%" data-tip="${fmtDate(d.t)} · ${money(d.v)}"></div>`).join('')}</div>
      <div class="axis">${days.map((d, i) => `<span>${i % 2 ? '' : fmtDate(d.t)}</span>`).join('')}</div></section>
    <section class="card"><h2>Sales by channel</h2><div class="list">
      ${Object.entries(byCh).sort((a, b) => b[1] - a[1]).map(([c, v]) => `<div><div class="row between" style="font-size:13px"><span>${CH[c][0]}</span><span class="num">${Math.round(v / tot * 100)}%</span></div><div class="meter"><i style="width:${v / tot * 100}%"></i></div></div>`).join('')}
    </div></section>
  </div>
  <section style="margin-top:16px"><div class="row between" style="margin-bottom:10px"><h2 style="margin:0">Orders to ship</h2><a href="#/orders?status=awaiting_shipment">View all</a></div>
    ${orderTable(toShip.slice(0, 6), true)}</section>`;
};
const kpi = (label, value, note, good) => `<div class="card kpi"><div class="label">${label}</div><div class="value num">${value}</div><div class="delta ${good ? 'up' : 'faint'}">${note}</div></div>`;
const noStores = () => `<div class="card">${emptyState('No store connected', 'Connect a TikTok Shop store to load orders, products and inventory.', '<a class="btn primary" href="#/stores">Connect a store</a>')}</div>`;

function orderTable(list, withAction) {
  if (!list.length) return `<div class="table-wrap">${emptyState('No orders', 'No orders match the current filters.')}</div>`;
  return `<div class="table-wrap"><table><thead><tr><th>Order</th><th>Channel</th><th>Date</th><th class="right">Items</th><th class="right">Total</th><th>Status</th>${withAction ? '<th></th>' : ''}</tr></thead><tbody>
  ${list.map(o => `<tr class="click" data-order="${o.id}"><td class="num">#${o.id}</td><td>${chip(o.channel)} <span class="muted">${CH[o.channel][0]}</span></td><td>${fmtDate(o.created)}</td><td class="right num">${o.lines.reduce((s, l) => s + l.qty, 0)}</td><td class="right num">${money(o.total)}</td><td>${statusBadge(o.status)}</td>${withAction ? `<td class="right">${o.status === 'awaiting_shipment' ? `<button class="btn sm" data-ship="${o.id}">Mark shipped</button>` : ''}</td>` : ''}</tr>`).join('')}
  </tbody></table></div>`;
}

pages.orders = q => {
  if (!connected().length) return noStores();
  const s = q.get('status') || 'all', ch = q.get('channel') || 'all', term = (q.get('q') || '').toLowerCase();
  const list = visibleOrders().filter(o => (s === 'all' || o.status === s) && (ch === 'all' || o.channel === ch) && (!term || o.id.includes(term) || o.lines.some(l => l.sku.toLowerCase().includes(term) || l.title.toLowerCase().includes(term))));
  return `<div class="toolbar">
    <input type="search" id="oq" placeholder="Search order number, SKU or product" value="${esc(term)}" aria-label="Search orders">
    <select id="os" aria-label="Status"><option value="all">All statuses</option>${Object.entries(ST).map(([k, [l]]) => `<option value="${k}" ${s === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
    <select id="oc" aria-label="Channel"><option value="all">All channels</option>${[...liveChannels()].map(c => `<option value="${c}" ${ch === c ? 'selected' : ''}>${CH[c][0]}</option>`).join('')}</select>
    <span class="faint" style="align-self:center">${list.length} orders</span></div>${orderTable(list, true)}`;
};

function openOrder(id) {
  const o = st.orders.find(x => x.id === id); if (!o) return;
  const steps = [['Order placed', true], ['Label created', o.status !== 'awaiting_shipment' && o.status !== 'cancelled'], ['In transit', ['in_transit', 'delivered', 'completed'].includes(o.status)], ['Delivered', ['delivered', 'completed'].includes(o.status)]];
  const p = layer(`<div class="row between"><h2 style="margin:0">Order #${o.id}</h2><button class="btn sm" data-x aria-label="Close">Close</button></div>
    <div class="row" style="margin:10px 0 18px">${chip(o.channel)}<span class="muted">${CH[o.channel][0]} · ${fmtTime(o.created)}</span>${statusBadge(o.status)}</div>
    <h2>Items</h2><div class="table-wrap"><table><tbody>${o.lines.map(l => `<tr><td>${esc(l.title)}<div class="faint" style="font-size:12px">${l.sku}</div></td><td class="right num">${l.qty} × ${money(l.price)}</td></tr>`).join('')}
    <tr><td><strong>Total</strong></td><td class="right num"><strong>${money(o.total)}</strong></td></tr></tbody></table></div>
    <h2 style="margin-top:18px">Buyer</h2>
    <dl class="kv"><dt>Name</dt><dd>${esc(maskName(o.buyer.name))}</dd><dt>Phone</dt><dd>${maskPhone(o.buyer.phone)}</dd><dt>Ship to</dt><dd>${esc(o.buyer.city)}, ${o.buyer.state}, US</dd></dl>
    <p class="faint" style="font-size:12px">Buyer contact details are masked in the interface and stored encrypted. Full address is used only to print the shipping label.</p>
    <h2 style="margin-top:18px">Fulfilment</h2>
    <ul class="timeline">${steps.map(([l, d]) => `<li><span class="dot ${d ? 'done' : ''}"></span><span class="${d ? '' : 'faint'}">${l}</span></li>`).join('')}</ul>
    ${o.tracking ? `<p class="muted" style="font-size:13px">${o.carrier} · <span class="num">${o.tracking}</span></p>` : ''}
    <div class="row" style="margin-top:18px">${o.status === 'awaiting_shipment' ? `<button class="btn primary" data-ship="${o.id}">Mark shipped</button><button class="btn" data-label>Print label</button>` : ''}</div>`, 'drawer');
  p.querySelector('[data-x]').onclick = close;
  p.querySelector('[data-label]')?.addEventListener('click', () => toast('Label PDF generated for #' + o.id));
}
function ship(id) {
  const o = st.orders.find(x => x.id === id); if (!o || o.status !== 'awaiting_shipment') return;
  o.status = 'in_transit'; o.carrier = 'USPS'; o.tracking = '9400' + String(Date.now()).slice(-12);
  log('Order shipped', '#' + id); close(); toast('Order #' + id + ' marked as shipped'); route();
}

pages.products = q => {
  if (!connected().length) return noStores();
  const term = (q.get('q') || '').toLowerCase();
  const list = st.products.filter(p => !term || p.title.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term));
  return `<div class="toolbar"><input type="search" id="pq" placeholder="Search product or SKU" value="${esc(term)}" aria-label="Search products"><span class="faint" style="align-self:center">${list.length} products</span></div>
  ${list.length ? `<div class="table-wrap"><table><thead><tr><th>Product</th><th>SKU</th><th class="right">Price</th><th>Listed on</th><th class="right">Stock</th><th>Status</th><th></th></tr></thead><tbody>
  ${list.map(p => `<tr><td>${esc(p.title)}</td><td class="num muted">${p.sku}</td><td class="right num">${money(p.price)}</td><td>${p.channels.map(chip).join(' ')}</td><td class="right num">${Object.values(p.stock).reduce((a, b) => a + b, 0)}</td><td><span class="badge ${p.status === 'active' ? 'ok' : ''}">${p.status === 'active' ? 'Active' : 'Draft'}</span></td><td class="right"><button class="btn sm" data-edit="${p.id}">Edit</button></td></tr>`).join('')}
  </tbody></table></div>` : `<div class="table-wrap">${emptyState('No products', 'No products match the search.')}</div>`}`;
};
function editProduct(id) {
  const p = st.products.find(x => x.id === id);
  const el = layer(`<h2>Edit product</h2><form id="pf" class="stack" style="gap:12px">
    <div class="field" style="margin:0"><label for="pt">Title</label><input id="pt" value="${esc(p.title)}" required maxlength="120"></div>
    <div class="field" style="margin:0"><label for="pp">Price (USD)</label><input id="pp" type="number" step="0.01" min="0.01" value="${p.price}" required></div>
    <div class="form-error" id="pe"></div>
    <div class="row" style="justify-content:flex-end"><button type="button" class="btn" data-x>Cancel</button><button class="btn primary">Save and sync</button></div></form>`, 'modal');
  el.querySelector('[data-x]').onclick = close;
  el.querySelector('#pf').onsubmit = e => {
    e.preventDefault(); const t = el.querySelector('#pt').value.trim(), pr = parseFloat(el.querySelector('#pp').value);
    if (!t || !(pr > 0)) { el.querySelector('#pe').textContent = 'Title and a price above 0 are required.'; return; }
    p.title = t; p.price = Math.round(pr * 100) / 100; p.synced = Date.now(); log('Product updated', p.sku); close(); toast(p.sku + ' saved and synced to ' + p.channels.length + ' channels'); route();
  };
}

pages.inventory = () => {
  if (!connected().length) return noStores();
  const chs = [...liveChannels()];
  return `<div class="row between" style="margin-bottom:14px"><span class="muted">Stock per channel. Edits are pushed to each connected store.</span><button class="btn" id="syncAll">Sync all stock</button></div>
  <div class="table-wrap"><table><thead><tr><th>SKU</th><th>Product</th>${chs.map(c => `<th class="right">${CH[c][0]}</th>`).join('')}<th class="right">Total</th><th></th></tr></thead><tbody>
  ${st.products.map(p => { const total = chs.reduce((s, c) => s + (p.stock[c] || 0), 0); return `<tr><td class="num muted">${p.sku}</td><td>${esc(p.title)}</td>
    ${chs.map(c => `<td class="right"><input type="number" min="0" value="${p.stock[c] || 0}" data-stock="${p.id}:${c}" aria-label="${CH[c][0]} stock for ${p.sku}" style="width:76px;height:28px;text-align:right"></td>`).join('')}
    <td class="right num">${total}</td><td>${total < 10 ? '<span class="badge warn">Low stock</span>' : ''}</td></tr>`; }).join('')}
  </tbody></table></div>`;
};

pages.shipments = () => {
  if (!connected().length) return noStores();
  const list = visibleOrders().filter(o => o.tracking);
  return list.length ? `<div class="table-wrap"><table><thead><tr><th>Order</th><th>Carrier</th><th>Tracking</th><th>Ship to</th><th>Status</th></tr></thead><tbody>
  ${list.map(o => `<tr class="click" data-order="${o.id}"><td class="num">#${o.id}</td><td>${o.carrier}</td><td class="num muted">${o.tracking}</td><td>${esc(o.buyer.city)}, ${o.buyer.state}</td><td>${statusBadge(o.status)}</td></tr>`).join('')}
  </tbody></table></div>` : `<div class="table-wrap">${emptyState('No shipments', 'Shipped orders appear here with carrier tracking.')}</div>`;
};

pages.stores = () => `
  <div class="row between" style="margin-bottom:14px"><span class="muted">Connected sales channels. Disconnecting a store deletes its synced data.</span><button class="btn primary" id="connectTT">Connect TikTok Shop</button></div>
  <div class="grid stores">${st.stores.map(s => `<div class="card stack" style="gap:12px">
    <div class="row"><span class="ch ${s.channel}">${CH[s.channel][1]}</span><div style="min-width:0"><div style="font-weight:600">${esc(s.name)}</div><div class="faint" style="font-size:12px">${CH[s.channel][0]} · ${esc(s.region)}</div></div></div>
    <dl class="kv"><dt>Status</dt><dd>${s.status === 'connected' ? '<span class="badge ok">Connected</span>' : '<span class="badge">Disconnected</span>'}</dd>
      <dt>Shop ID</dt><dd class="num">${esc(s.shopId)}</dd><dt>Last sync</dt><dd>${s.status === 'connected' ? ago(s.lastSync) : '—'}</dd></dl>
    <div class="row">${s.status === 'connected' ? `<button class="btn sm" data-sync="${s.id}">Sync now</button><button class="btn sm danger" data-disc="${s.id}">Disconnect</button>` : `<button class="btn sm" data-reconn="${s.id}">Reconnect</button>`}</div>
  </div>`).join('')}</div>`;

function connectFlow(storeId) {
  const p = layer(`<div class="row"><span class="ch tiktok">TT</span><h2 style="margin:0">Connect TikTok Shop</h2></div>
    <p class="muted" style="font-size:13px">The seller signs in to TikTok Shop and approves these permissions. RubyBug Apps receives an authorization code and exchanges it for access tokens, which are stored encrypted.</p>
    <div class="scopes">${SCOPES.map(([k, d]) => `<div><strong class="num">${k}</strong><div class="muted">${d}</div></div>`).join('')}</div>
    <p class="faint" style="font-size:12px">Demo environment: authorization is simulated with sample data.</p>
    <div class="row" style="justify-content:flex-end"><button class="btn" data-x>Cancel</button><button class="btn primary" data-auth>Authorize</button></div>`, 'modal');
  p.querySelector('[data-x]').onclick = close;
  p.querySelector('[data-auth]').onclick = e => {
    e.target.disabled = true; e.target.textContent = 'Authorizing…';
    setTimeout(() => {
      const s = st.stores.find(x => x.id === (storeId || 'st_tt'));
      s.status = 'connected'; s.lastSync = Date.now(); log('Store connected', s.name + ' (' + CH[s.channel][0] + ')'); close(); toast(s.name + ' connected'); route();
    }, 900);
  };
}

pages.analytics = () => {
  if (!connected().length) return noStores();
  const os = visibleOrders().filter(o => o.status !== 'cancelled');
  const top = {}; os.forEach(o => o.lines.forEach(l => { top[l.sku] = top[l.sku] || { t: l.title, q: 0, r: 0 }; top[l.sku].q += l.qty; top[l.sku].r += l.qty * l.price; }));
  const tops = Object.entries(top).sort((a, b) => b[1].r - a[1].r).slice(0, 5);
  const aov = os.length ? os.reduce((s, o) => s + o.total, 0) / os.length : 0;
  const weeks = [3, 2, 1, 0].map(w => ({ w, v: os.filter(o => D.NOW - o.created >= w * 7 * D.DAY && D.NOW - o.created < (w + 1) * 7 * D.DAY).reduce((s, o) => s + o.total, 0) }));
  const mx = Math.max(...weeks.map(x => x.v), 1);
  return `<div class="grid kpis">${kpi('Orders, 30 days', os.length, '', 0)}${kpi('Revenue, 30 days', money(os.reduce((s, o) => s + o.total, 0)), '', 0)}${kpi('Average order value', money(aov), '', 0)}${kpi('Cancellation rate', Math.round(visibleOrders().filter(o => o.status === 'cancelled').length / Math.max(1, visibleOrders().length) * 100) + '%', '', 0)}</div>
  <div class="grid two" style="margin-top:16px">
    <section class="card"><h2>Revenue by week</h2><div class="bars">${weeks.map(x => `<div class="b" style="height:${Math.max(2, x.v / mx * 100)}%" data-tip="${money(x.v)}"></div>`).join('')}</div>
      <div class="axis">${weeks.map(x => `<span>${x.w ? x.w + ' wk ago' : 'This week'}</span>`).join('')}</div></section>
    <section class="card"><h2>Top products</h2><div class="list">${tops.map(([sku, v]) => `<div class="row between" style="font-size:13px"><span>${esc(v.t)}<span class="faint"> · ${v.q} sold</span></span><span class="num">${money(v.r)}</span></div>`).join('')}</div></section>
  </div>`;
};

pages.settings = q => {
  const tab = q.get('tab') || 'account';
  const tabs = [['account', 'Account'], ['security', 'Security'], ['privacy', 'Data & privacy'], ['audit', 'Audit log']];
  const body = {
    account: `<div class="card"><dl class="kv"><dt>Business</dt><dd>Ruby Home Goods (demo)</dd><dt>Email</dt><dd>demo@rubybugllc.com</dd><dt>Plan</dt><dd>Starter</dd><dt>Time zone</dt><dd>America/Denver</dd></dl></div>`,
    security: `<div class="card stack" style="gap:14px"><div class="row between"><div><strong>Two-factor authentication</strong><div class="muted" style="font-size:13px">Authenticator app code required at sign-in.</div></div>
      <button class="btn sm" id="tfa">${st.twofa ? 'Turn off' : 'Turn on'}</button></div>
      <div class="row between"><div><strong>Active sessions</strong><div class="muted" style="font-size:13px">Sessions expire after 12 hours of inactivity.</div></div><button class="btn sm" id="revoke">Sign out other sessions</button></div>
      <div><strong>Access tokens</strong><div class="muted" style="font-size:13px">TikTok Shop tokens are encrypted at rest with AES-256-GCM and are never shown in the interface.</div></div></div>`,
    privacy: `<div class="card stack" style="gap:16px">
      <div><strong>Data retention</strong><dl class="kv" style="margin-top:8px"><dt>Orders</dt><dd>Deleted 90 days after completion</dd><dt>Disconnected store</dt><dd>All store data deleted within 48 hours</dd><dt>Backups</dt><dd>Encrypted, kept 30 days</dd><dt>Audit log</dt><dd>90 days</dd></dl></div>
      <div class="row between"><div><strong>Export data</strong><div class="muted" style="font-size:13px">Orders, products and stores as JSON. Buyer contact fields stay masked.</div></div><button class="btn sm" id="export">Export JSON</button></div>
      <div class="row between"><div><strong>Delete all data</strong><div class="muted" style="font-size:13px">Disconnects every store and removes synced orders and products.</div></div><button class="btn sm danger" id="wipe">Delete data</button></div>
      <div class="faint" style="font-size:12px">Requests: <a href="mailto:aissatalyah524@hotmail.com">aissatalyah524@hotmail.com</a> · <a href="/privacy-policy.html">Privacy policy</a></div></div>`,
    audit: `<div class="table-wrap"><table><thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Target</th></tr></thead><tbody>${st.audit.slice(0, 50).map(a => `<tr><td>${fmtTime(a.at)}</td><td class="muted">${esc(a.actor)}</td><td>${esc(a.action)}</td><td class="muted">${esc(a.target)}</td></tr>`).join('')}</tbody></table></div>`,
  }[tab];
  return `<div class="tabs" role="tablist">${tabs.map(([k, l]) => `<button role="tab" aria-selected="${k === tab}" class="${k === tab ? 'on' : ''}" data-tab="${k}">${l}</button>`).join('')}</div>${body}`;
};

function disconnect(id) {
  const s = st.stores.find(x => x.id === id);
  confirmBox('Disconnect ' + s.name + '?', 'Access tokens are revoked and the store’s synced orders and products are deleted. This cannot be undone.', 'Disconnect and delete', () => {
    s.status = 'disconnected'; log('Store disconnected, data deleted', s.name + ' (' + CH[s.channel][0] + ')'); toast(s.name + ' disconnected. Store data deleted.'); route();
  });
}

// ---- router ----
const TITLES = { dashboard: 'Dashboard', orders: 'Orders', products: 'Products', inventory: 'Inventory', shipments: 'Shipments', stores: 'Stores', analytics: 'Analytics', settings: 'Settings' };
function route() {
  if (!RB_AUTH.session()) return location.replace('index.html');
  const [path, qs] = (location.hash.slice(2) || 'dashboard').split('?');
  if (path === 'logout') { RB_AUTH.logout(); return location.replace('index.html'); }
  const name = pages[path] ? path : 'dashboard';
  const q = new URLSearchParams(qs || '');
  $('#title').textContent = TITLES[name]; document.title = TITLES[name] + ' · RubyBug Apps';
  renderNav(name);
  try { $('#view').innerHTML = pages[name](q); }
  catch (err) { console.error(err); $('#view').innerHTML = `<div class="card">${emptyState('Something went wrong', 'This page could not be loaded.', '<button class="btn" onclick="location.reload()">Reload</button>')}</div>`; }
  $('#side').classList.remove('open');
}
function setQuery(k, v) { const [p, qs] = (location.hash.slice(2) || 'dashboard').split('?'); const q = new URLSearchParams(qs || ''); v && v !== 'all' ? q.set(k, v) : q.delete(k); location.hash = '/' + p + (q.toString() ? '?' + q : ''); }

// ---- events (delegated) ----
document.addEventListener('click', e => {
  const t = e.target.closest('button, tr[data-order]'); if (!t) return;
  const d = t.dataset;
  if (d.ship) { e.stopPropagation(); return ship(d.ship); }
  if (d.order) return openOrder(d.order);
  if (d.edit) return editProduct(d.edit);
  if (d.disc) return disconnect(d.disc);
  if (d.reconn) return connectFlow(d.reconn);
  if (d.tab) return setQuery('tab', d.tab === 'account' ? '' : d.tab);
  if (d.sync) { t.disabled = true; t.textContent = 'Syncing…'; return setTimeout(() => { const s = st.stores.find(x => x.id === d.sync); s.lastSync = Date.now(); log('Store synced', s.name); toast(s.name + ' synced'); route(); }, 800); }
  switch (t.id) {
    case 'connectTT': { const tt = st.stores.find(s => s.channel === 'tiktok'); return tt.status === 'connected' ? toast('TikTok Shop store is already connected') : connectFlow(tt.id); }
    case 'menuBtn': return $('#side').classList.toggle('open');
    case 'syncAll': t.disabled = true; t.textContent = 'Syncing…'; return setTimeout(() => { log('Inventory synced', 'All channels'); toast('Stock synced to all connected stores'); route(); }, 900);
    case 'tfa': st.twofa = !st.twofa; log('Two-factor authentication ' + (st.twofa ? 'enabled' : 'disabled'), 'Account'); toast('Two-factor authentication ' + (st.twofa ? 'on' : 'off')); return route();
    case 'revoke': log('Other sessions signed out', 'Account'); return toast('Other sessions signed out');
    case 'export': {
      const data = { exported_at: new Date().toISOString(), stores: st.stores.map(({ id, channel, name, region, status }) => ({ id, channel, name, region, status })),
        orders: st.orders.map(o => ({ ...o, buyer: { name: maskName(o.buyer.name), phone: maskPhone(o.buyer.phone), city: o.buyer.city, state: o.buyer.state } })), products: st.products };
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); a.download = 'rubybug-export.json'; a.click(); URL.revokeObjectURL(a.href);
      log('Data exported', 'JSON'); return toast('Export downloaded');
    }
    case 'wipe': return confirmBox('Delete all data?', 'Every store is disconnected and synced orders and products are removed. This cannot be undone.', 'Delete all data', () => {
      st.stores.forEach(s => s.status = 'disconnected'); log('All data deleted', 'Account'); toast('All store data deleted'); route(); });
  }
});
document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'os') setQuery('status', t.value);
  else if (t.id === 'oc') setQuery('channel', t.value);
  else if (t.id === 'storePick') { storeFilter = t.value; route(); }
  else if (t.dataset.stock) {
    const [id, c] = t.dataset.stock.split(':'), v = parseInt(t.value, 10);
    if (!(v >= 0)) { t.value = st.products.find(p => p.id === id).stock[c]; return toast('Stock must be 0 or more', true); }
    const p = st.products.find(x => x.id === id); p.stock[c] = v; log('Stock updated', p.sku + ' · ' + CH[c][0] + ' = ' + v); toast(p.sku + ' stock pushed to ' + CH[c][0]); route();
  }
});
let deb; document.addEventListener('input', e => { if (e.target.id === 'oq' || e.target.id === 'pq') { clearTimeout(deb); const v = e.target.value; deb = setTimeout(() => { setQuery('q', v); setTimeout(() => { const el = $('#' + e.target.id); el?.focus(); el?.setSelectionRange(v.length, v.length); }); }, 250); } });
addEventListener('hashchange', route);
route();
})();
