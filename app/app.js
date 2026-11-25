(() => {
const D = RB_DATA, S = RB_AUTH.store;
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const money0 = n => n >= 1000 ? '$' + (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'k' : '$' + Math.round(n);
const fmtDate = t => new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
const fmtTime = t => new Date(t).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const ago = t => { const m = Math.max(0, Math.round((Date.now() - t) / 60000)); return m < 1 ? 'just now' : m < 60 ? m + ' min ago' : m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' d ago'; };
const pct = (a, b) => b ? Math.round((a - b) / b * 100) : 0;
const CH = { tiktok: ['TikTok Shop', 'TT', '#FF4500'], shopify: ['Shopify', 'SH', '#e4e4e7'], amazon: ['Amazon', 'AM', '#71717a'] };
const ST = { awaiting_shipment: ['Awaiting shipment', 'warn'], in_transit: ['In transit', 'info'], delivered: ['Delivered', 'ok'], completed: ['Completed', 'ok'], cancelled: ['Cancelled', 'err'] };
const SCOPES = [['seller.authorization.info', 'List the shops the seller authorized and obtain the shop cipher required by every API call'],
  ['seller.shop.info', 'Shop name, region and shop ID to identify the connected store'],
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
const totalStock = p => Object.values(p.stock).reduce((a, b) => a + b, 0);
const isLow = p => totalStock(p) < 10;
// Handling time (placed -> label) for sample orders is derived from the order number so it stays stable.
const handled = o => o.handled ?? 2 + (parseInt(o.id, 10) * 7919 % 97) / 4;

// ---- icons ----
const I = (d, cls = '') => `<svg ${cls ? `class="${cls}"` : ''} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
const IC = {
  dashboard: '<rect x="3" y="3" width="7" height="9" rx="2"/><rect x="14" y="3" width="7" height="5" rx="2"/><rect x="14" y="12" width="7" height="9" rx="2"/><rect x="3" y="16" width="7" height="5" rx="2"/>',
  orders: '<path d="M6 3h12l1.5 5h-15z"/><path d="M4.5 8v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2V8"/><path d="M9 12h6"/>',
  products: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/>',
  inventory: '<path d="M3 9l9-5 9 5v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M8 21v-7h8v7"/>',
  shipments: '<path d="M3 7h11v9H3z"/><path d="M14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/>',
  stores: '<path d="M4 9l1.5-5h13L20 9"/><path d="M4 9v11h16V9"/><path d="M4 9h16"/><path d="M10 20v-5h4v5"/>',
  analytics: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.8 1.2V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.2-2.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10 3.1V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 2.9 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  sync: '<path d="M21 12a9 9 0 0 1-15.5 6.2L3 16"/><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5M3 21v-5h5"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  alert: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  plug: '<path d="M9 2v6M15 2v6M6 8h12v4a6 6 0 0 1-12 0zM12 18v4"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  printer: '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8" rx="1"/>',
  truck: '<path d="M3 7h11v9H3z"/><path d="M14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="1.6"/><circle cx="17" cy="18" r="1.6"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/>',
  wifi: '<path d="M2 2l20 20M8.5 16.4a5 5 0 0 1 7 0M5 12.9a10 10 0 0 1 5.2-2.7M16.8 10.2a10 10 0 0 1 2.2 1.7M12 20h.01"/>',
};
const NAV = [['Operate'], ['dashboard', 'Dashboard'], ['orders', 'Orders'], ['products', 'Products'], ['inventory', 'Inventory'], ['shipments', 'Shipments'],
  ['Channels'], ['stores', 'Stores'], ['analytics', 'Analytics'], ['Account'], ['settings', 'Settings'], ['logout', 'Sign out']];

// ---- ui helpers ----
const $ = s => document.querySelector(s);
function toast(msg, err) {
  const t = document.createElement('div'); t.className = 'toast' + (err ? ' err' : ''); t.setAttribute('role', err ? 'alert' : 'status');
  t.innerHTML = I(err ? IC.alert : IC.check) + `<span>${esc(msg)}</span>`; $('#toasts').append(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 220); }, 3200);
}
let lastFocus = null;
function layer(html, kind) {
  close(); lastFocus = document.activeElement;
  const o = document.createElement('div'); o.className = 'overlay'; o.id = 'ov';
  const p = document.createElement('div'); p.className = kind; p.id = 'panel'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-modal', 'true'); p.innerHTML = html;
  p.setAttribute('aria-labelledby', 'dlg-t');
  o.onclick = close; document.body.append(o, p); requestAnimationFrame(() => { o.classList.add('show'); p.classList.add('show'); });
  (p.querySelector('input') || p.querySelector('[data-x]') || p.querySelector('button'))?.focus(); return p;
}
function close() { const had = $('#panel'); $('#ov')?.remove(); had?.remove(); if (had && lastFocus?.isConnected) lastFocus.focus(); }
addEventListener('keydown', e => {
  if (e.key === 'Escape') { close(); setMenu(false); }
  if (e.key === 'Tab' && $('#panel')) { // keep focus inside the open dialog
    const f = [...$('#panel').querySelectorAll('button:not([disabled]), input, a[href], select')]; if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  }
});
function confirmBox(title, body, okLabel, onOk) {
  const p = layer(`<h3 id="dlg-t">${esc(title)}</h3><p class="muted">${body}</p><div class="row end"><button class="btn" data-x>Cancel</button><button class="btn danger-solid" data-ok>${esc(okLabel)}</button></div>`, 'modal');
  p.querySelector('[data-x]').onclick = close; p.querySelector('[data-ok]').onclick = () => { close(); onOk(); };
}
const chip = c => `<span class="ch ${c}" title="${CH[c][0]}">${CH[c][1]}</span>`;
const chLabel = c => `<span class="chlabel">${chip(c)}<span class="muted">${CH[c][0]}</span></span>`;
const statusBadge = s => `<span class="badge ${ST[s][1]}">${ST[s][0]}</span>`;
const maskName = n => n.split(' ').map(w => w[0] + '***').join(' ');
const maskPhone = p => '(***) ***-' + p.slice(-4);
const emptyState = (icon, title, text, action = '', err = false) => `<div class="empty${err ? ' err' : ''}"><span class="em-ic">${I(IC[icon])}</span><strong>${esc(title)}</strong><p>${esc(text)}</p>${action ? `<div class="row">${action}</div>` : ''}</div>`;
const pagehead = (title, sub, actions = '') => `<div class="pagehead"><div><h2>${title}</h2>${sub ? `<p>${sub}</p>` : ''}</div>${actions ? `<div class="row">${actions}</div>` : ''}</div>`;
const seg = (key, cur, opts) => `<div class="seg" role="group">${opts.map(([v, l, n]) => `<button type="button" data-seg="${key}:${v}" class="${cur === v ? 'on' : ''}" aria-pressed="${cur === v}">${l}${n != null ? `<span class="n">${n}</span>` : ''}</button>`).join('')}</div>`;
const offlineNote = () => navigator.onLine ? '' : `<div class="notice err">${I(IC.wifi)}<span class="grow">No network connection. Sync and store actions resume when the connection is back.</span></div>`;
const hue = s => parseInt(s.replace(/\D/g, ''), 10) * 47 % 360;
const thumb = p => `<span class="thumb" style="background:hsl(${hue(p.sku)} 35% 16%)">${esc(p.title.split(' ').slice(0, 2).map(w => w[0]).join(''))}</span>`;

// ---- charts (inline SVG; plots stretch, labels stay HTML so text never distorts) ----
const series = (vals, max) => vals.map((v, i) => [vals.length > 1 ? i / (vals.length - 1) * 100 : 50, 100 - v / max * 100]);
const pathOf = pts => pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(2) + ' ' + p[1].toFixed(2)).join(' ');
let gid = 0;
function spark(vals, color = '#FF4500') {
  const max = Math.max(...vals, 1) * 1.1, d = pathOf(series(vals, max)), id = 'sg' + (++gid);
  return `<svg class="spark" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".28"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
    <path d="${d} L100 100 L0 100Z" fill="url(#${id})"/><path d="${d}" fill="none" stroke="${color}" stroke-width="1.6" vector-effect="non-scaling-stroke"/></svg>`;
}
function areaChart(points) {
  const vals = points.map(p => p.v), top = Math.max(...vals, 1) * 1.15, pts = series(vals, top), d = pathOf(pts), step = 100 / (pts.length - 1 || 1);
  return `<div class="area"><div class="plot">
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF4500" stop-opacity=".32"/><stop offset="1" stop-color="#FF4500" stop-opacity="0"/></linearGradient></defs>
      ${[25, 50, 75, 100].map(y => `<line x1="0" x2="100" y1="${y}" y2="${y}" class="grid-l" vector-effect="non-scaling-stroke"/>`).join('')}
      <path d="${d} L100 100 L0 100Z" fill="url(#ag)"/><path d="${d}" fill="none" stroke="#FF4500" stroke-width="2" vector-effect="non-scaling-stroke"/></svg>
    ${[25, 50, 75].map(y => `<span class="ylab" style="top:${y}%">${money0(top * (1 - y / 100))}</span>`).join('')}
    <i class="cursor"></i><div class="tip"></div>
    ${pts.map(([x, y], i) => `<b class="hit" style="left:${Math.max(0, x - step / 2)}%;width:${step}%" data-x="${x}" data-y="${y}" data-tip="${fmtDate(points[i].t)} · ${money(points[i].v)}"></b>`).join('')}
  </div><div class="xax">${points.map((p, i) => `<span>${i % 3 ? '' : fmtDate(p.t)}</span>`).join('')}</div></div>`;
}
function donut(parts) {
  const tot = parts.reduce((s, p) => s + p.v, 0) || 1; let off = 25;
  const segs = parts.map(p => { const len = p.v / tot * 100, s = `<circle cx="21" cy="21" r="15.9" fill="none" stroke="${p.color}" stroke-width="5" stroke-dasharray="${Math.max(0, len - .8)} ${100 - Math.max(0, len - .8)}" stroke-dashoffset="${off}"/>`; off -= len; return s; }).join('');
  return `<div class="donut"><svg viewBox="0 0 42 42" aria-hidden="true"><circle cx="21" cy="21" r="15.9" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="5"/>${segs}</svg><div class="c"><b class="num">${money0(tot)}</b><span>30 days</span></div></div>`;
}
const ring = (v, color) => `<div class="ring"><svg viewBox="0 0 42 42" aria-hidden="true"><circle cx="21" cy="21" r="17" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="4"/><circle cx="21" cy="21" r="17" fill="none" stroke="${color}" stroke-width="4" stroke-linecap="round" pathLength="100" stroke-dasharray="${v} 100"/></svg><div class="c"><b class="num">${v}%</b><span>within 24 h</span></div></div>`;
const daily = (os, n, fn) => Array.from({ length: n }, (_, i) => { const end = Date.now() - (n - 1 - i) * D.DAY; return { t: end, v: fn(os.filter(o => o.created <= end && o.created > end - D.DAY)) }; });
const revenue = list => list.filter(o => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0);

// ---- skeletons ----
const sk = (w = '100%', h = 14) => `<div class="skel" style="width:${w};height:${h}px"></div>`;
const skelCards = n => `<div class="grid kpis">${Array.from({ length: n }, () => `<div class="card kpi stack" style="gap:12px">${sk('40%')}${sk('60%', 28)}${sk('100%', 40)}</div>`).join('')}</div>`;
const skelTable = (rows = 6) => `<div class="table-wrap"><table><tbody>${Array.from({ length: rows }, (_, i) => `<tr><td>${sk('70%')}</td><td>${sk('50%')}</td><td>${sk(60 + (i * 13) % 30 + '%')}</td><td>${sk('40%')}</td></tr>`).join('')}</tbody></table></div>`;
const SKEL = {
  dashboard: () => `${pagehead(sk('220px', 30), '')}${skelCards(4)}<div class="grid g-2-1 mt"><div class="card">${sk('30%')}<div style="height:16px"></div>${sk('100%', 200)}</div><div class="card">${sk('40%')}<div style="height:16px"></div>${sk('100%', 200)}</div></div>`,
  inventory: () => `${pagehead(sk('180px', 30), '')}${skelTable(9)}`,
};
let busy = null; // sync in progress: { page, label }
function runSync(page, label, done) {
  if (busy) return;
  busy = { page }; route();
  setTimeout(() => {
    busy = null;
    if (!navigator.onLine) { route(); return toast(label + ' failed: no network connection', true); }
    done(); route();
  }, 1100);
}

// ---- nav ----
function renderNav(active) {
  const toShip = visibleOrders().filter(o => o.status === 'awaiting_shipment').length, low = connected().length ? st.products.filter(isLow).length : 0;
  const counts = { orders: [toShip, 1], inventory: [low, 0] };
  $('#nav').innerHTML = NAV.map(([k, label]) => !label ? `<div class="grp">${k}</div>` :
    `<a href="#/${k}" class="${k === active ? 'on' : ''}" ${k === active ? 'aria-current="page"' : ''}>${I(IC[k])}${label}${counts[k]?.[0] ? `<span class="count${counts[k][1] ? ' hot' : ''}">${counts[k][0]}</span>` : ''}</a>`).join('');
  const sp = $('#storePick');
  sp.innerHTML = '<option value="all">All stores</option>' + connected().map(s => `<option value="${s.channel}" ${storeFilter === s.channel ? 'selected' : ''}>${esc(s.name)}</option>`).join('');
}
function setMenu(open) { $('#side').classList.toggle('open', open); $('#scrim').classList.toggle('show', open); $('#menuBtn').setAttribute('aria-expanded', open); }

// ---- pages ----
const pages = {};
const noStores = () => `<div class="card">${emptyState('plug', 'No store connected', 'Orders, products and inventory load after a TikTok Shop store is connected.', '<a class="btn primary" href="#/stores">Connect a store</a>')}</div>`;
const kpi = (label, value, delta, vals, cls = '', extra = '') => `<div class="card kpi ${cls}"><div class="label">${label}</div><div class="value num">${value}</div><div class="delta">${delta}</div>${vals ? spark(vals) : extra}</div>`;
const bar = (n, of, color, note) => `<div class="kpi-bar"><div class="meter"><i style="width:${of ? n / of * 100 : 0}%;background:${color}"></i></div><span class="num">${of ? Math.round(n / of * 100) : 0}% ${note}</span></div>`;
const deltaTxt = (d, note) => `<b class="${d >= 0 ? 'up' : 'down'}">${d >= 0 ? '↑' : '↓'} ${Math.abs(d)}%</b> ${note}`;

pages.dashboard = () => {
  if (!connected().length) return noStores();
  const os = visibleOrders(), now = Date.now();
  const inRange = (a, b) => os.filter(o => now - o.created >= a * D.DAY && now - o.created < b * D.DAY);
  const today = inRange(0, 1), yday = inRange(1, 2), rev7 = revenue(inRange(0, 7)), revPrev = revenue(inRange(7, 14));
  const toShip = os.filter(o => o.status === 'awaiting_shipment'), late = toShip.filter(o => now - o.created > 20 * 3600000);
  const low = st.products.filter(isLow);
  const rev14 = daily(os, 14, revenue), cnt14 = daily(os, 14, l => l.length);
  const byCh = {}; os.filter(o => o.status !== 'cancelled').forEach(o => byCh[o.channel] = (byCh[o.channel] || 0) + o.total);
  const parts = Object.entries(byCh).sort((a, b) => b[1] - a[1]).map(([c, v]) => ({ c, v, color: CH[c][2] }));
  const chTot = parts.reduce((s, p) => s + p.v, 0) || 1;
  const shipped = os.filter(o => o.tracking), within = shipped.filter(o => handled(o) <= 24).length;
  const sla = shipped.length ? Math.round(within / shipped.length * 100) : 100;
  const avgH = shipped.length ? shipped.reduce((s, o) => s + handled(o), 0) / shipped.length : 0;
  const off = st.stores.filter(s => s.status !== 'connected'), drafts = st.products.filter(p => p.status === 'draft');
  const alerts = [
    late.length && ['err', IC.clock, `${late.length} order${late.length > 1 ? 's' : ''} near ship-by time`, 'Placed over 20 hours ago', '#/orders?status=awaiting_shipment'],
    low.length && ['warn', IC.alert, `${low.length} SKUs low on stock`, 'Under 10 units across channels', '#/inventory?view=low'],
    off.length && ['info', IC.plug, `${off.length} store${off.length > 1 ? 's' : ''} disconnected`, off.map(s => s.name).join(', '), '#/stores'],
    drafts.length && ['info', IC.products, `${drafts.length} draft product${drafts.length > 1 ? 's' : ''}`, 'Not listed on any channel', '#/products'],
  ].filter(Boolean);
  const h = new Date().getHours(), greet = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  const lastSync = Math.max(...connected().map(s => s.lastSync));
  return `${offlineNote()}${pagehead(greet + ', Demo Seller', `${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} · Last sync ${ago(lastSync)}`,
    `<button class="btn" id="syncDash">${I(IC.sync)}Sync all stores</button>`)}
  <div class="grid kpis">
    ${kpi('Revenue · 7 days', money(rev7), deltaTxt(pct(rev7, revPrev), 'vs prior 7 days'), rev14.map(d => d.v), 'accent')}
    ${kpi('Orders today', today.length, deltaTxt(pct(today.length, yday.length), 'vs yesterday'), cnt14.map(d => d.v))}
    ${kpi('Awaiting shipment', toShip.length, toShip.length ? `<b class="${late.length ? 'hot' : ''}">${late.length} near ship-by</b> · ship by 6 PM` : 'All orders shipped', null, '', bar(late.length, toShip.length, '#FF4500', 'near ship-by'))}
    ${kpi('Low stock SKUs', low.length, low.length ? 'Under 10 units across channels' : 'Stock levels healthy', null, '', bar(low.length, st.products.length, '#fbbf24', 'of catalogue'))}
  </div>
  <div class="grid g-2-1 mt">
    <section class="card"><div class="card-h"><div><h2>Revenue</h2><div class="sub">Last 14 days · excludes cancelled</div></div><span class="num" style="font-size:18px;font-weight:600">${money(rev14.reduce((s, d) => s + d.v, 0))}</span></div>${areaChart(rev14)}</section>
    <section class="card"><div class="card-h"><div><h2>Channel mix</h2><div class="sub">Share of revenue</div></div></div>
      <div class="donut-wrap">${donut(parts)}<div class="legend">${parts.map(p => `<div class="li"><span class="sw" style="background:${p.color}"></span><span>${CH[p.c][0]}</span><span class="v">${Math.round(p.v / chTot * 100)}%</span></div>`).join('') || '<span class="faint">No sales yet</span>'}</div></div></section>
  </div>
  <div class="grid g-3 mt">
    <section class="card"><div class="card-h"><div><h2>Fulfilment SLA</h2><div class="sub">Placed to label created</div></div></div>
      <div class="sla">${ring(sla, sla >= 90 ? '#34d399' : '#fbbf24')}<div class="facts">
        <div><span>Average handling</span><b>${avgH.toFixed(1)} h</b></div><div><span>Shipped orders</span><b>${shipped.length}</b></div>
        <div><span>Near ship-by</span><b class="${late.length ? 'hot' : ''}">${late.length}</b></div><div><span>Target</span><b>95%</b></div></div></div></section>
    <section class="card"><div class="card-h"><h2>Alerts</h2><span class="badge plain">${alerts.length}</span></div>
      ${alerts.length ? `<ul class="alerts">${alerts.map(([k, ic, t, s, href]) => `<li><span class="ic ${k}">${I(ic)}</span><div><strong>${t}</strong><span>${esc(s)}</span></div><a class="btn sm ghost" href="${href}">View</a></li>`).join('')}</ul>`
        : emptyState('check', 'All clear', 'No late orders, low stock or disconnected stores.')}</section>
    <section class="card"><div class="card-h"><h2>Recent activity</h2><a class="small" href="#/settings?tab=audit">Audit log</a></div>
      <ul class="feed">${st.audit.slice(0, 5).map(a => `<li><span class="pip"></span><div>${esc(a.action)} <span class="muted">· ${esc(a.target)}</span><div class="t">${ago(a.at)}</div></div></li>`).join('')}</ul></section>
  </div>
  <section class="mt-l"><div class="card-h"><div><h2>Orders to ship</h2><div class="sub">Oldest first</div></div><a class="btn sm" href="#/orders?status=awaiting_shipment">View all</a></div>
    ${orderTable(toShip.slice().sort((a, b) => a.created - b.created).slice(0, 6), true)}</section>`;
};

function orderTable(list, withAction) {
  if (!list.length) return `<div class="table-wrap">${emptyState('orders', 'No orders', 'No orders match the current filters.')}</div>`;
  return `<div class="table-wrap cards-sm"><table><thead><tr><th>Order</th><th>Channel</th><th class="hide-sm">Buyer</th><th>Placed</th><th class="right hide-sm">Items</th><th class="right">Total</th><th>Status</th>${withAction ? '<th></th>' : ''}</tr></thead><tbody>
  ${list.map(o => `<tr class="click" data-order="${o.id}" tabindex="0"><td><span class="title num">#${o.id}</span></td><td class="end-sm">${chLabel(o.channel)}</td><td class="muted hide-sm">${esc(maskName(o.buyer.name))}</td><td>${fmtDate(o.created)}<div class="sub">${ago(o.created)}</div></td><td class="right num hide-sm">${o.lines.reduce((s, l) => s + l.qty, 0)}</td><td class="right num">${money(o.total)}</td><td>${statusBadge(o.status)}</td>${withAction ? `<td class="right">${o.status === 'awaiting_shipment' ? `<button class="btn sm" data-ship="${o.id}">Mark shipped</button>` : ''}</td>` : ''}</tr>`).join('')}
  </tbody></table></div>`;
}

pages.orders = q => {
  if (!connected().length) return noStores();
  const s = q.get('status') || 'all', ch = q.get('channel') || 'all', term = (q.get('q') || '').toLowerCase();
  const base = visibleOrders().filter(o => (ch === 'all' || o.channel === ch) && (!term || o.id.includes(term) || o.lines.some(l => l.sku.toLowerCase().includes(term) || l.title.toLowerCase().includes(term))));
  const list = base.filter(o => s === 'all' || o.status === s);
  const n = k => base.filter(o => o.status === k).length;
  return `${pagehead('Orders', `${visibleOrders().length} orders in the last 30 days across ${liveChannels().size} channels`)}
  <div class="toolbar">${seg('status', s, [['all', 'All', base.length], ['awaiting_shipment', 'To ship', n('awaiting_shipment')], ['in_transit', 'In transit', n('in_transit')], ['delivered', 'Delivered', n('delivered')], ['completed', 'Completed', n('completed')], ['cancelled', 'Cancelled', n('cancelled')]])}</div>
  <div class="toolbar">
    <label class="search">${I(IC.search)}<input type="search" id="oq" placeholder="Order number, SKU or product" value="${esc(term)}" aria-label="Search orders"></label>
    <select id="oc" aria-label="Channel"><option value="all">All channels</option>${[...liveChannels()].map(c => `<option value="${c}" ${ch === c ? 'selected' : ''}>${CH[c][0]}</option>`).join('')}</select>
    <span class="count">${list.length} result${list.length === 1 ? '' : 's'}</span></div>
  ${list.length ? orderTable(list, true) : `<div class="table-wrap">${emptyState('search', 'No matching orders', 'No orders match this search and filter combination.', '<a class="btn sm" href="#/orders">Clear filters</a>')}</div>`}`;
};

function openOrder(id) {
  const o = st.orders.find(x => x.id === id); if (!o) return;
  const shipped = !['awaiting_shipment', 'cancelled'].includes(o.status);
  const steps = [['Order placed', true, fmtTime(o.created)], ['Label created', shipped, shipped ? fmtTime(o.created + handled(o) * 3600000) : ''], ['In transit', ['in_transit', 'delivered', 'completed'].includes(o.status), ''], ['Delivered', ['delivered', 'completed'].includes(o.status), '']];
  const p = layer(`<div class="d-h"><div class="row between"><h3 id="dlg-t">Order #${o.id}</h3><button class="btn icon ghost" data-x aria-label="Close">${I(IC.x)}</button></div>
      <div class="row" style="margin-top:10px">${chLabel(o.channel)}<span class="faint">·</span><span class="muted">${fmtTime(o.created)}</span>${statusBadge(o.status)}</div></div>
    <div class="d-b">
      <div><div class="sec-t">Items</div><div class="lines">${o.lines.map(l => `<div class="ln"><div><div class="title">${esc(l.title)}</div><div class="sub mono">${l.sku}</div></div><span class="num muted">${l.qty} × ${money(l.price)}</span></div>`).join('')}
        <div class="ln"><strong>Total</strong><strong class="num">${money(o.total)}</strong></div></div></div>
      <div><div class="sec-t">Buyer</div><dl class="kv"><dt>Name</dt><dd class="masked">${I(IC.lock)}${esc(maskName(o.buyer.name))}</dd><dt>Phone</dt><dd class="masked num">${I(IC.lock)}${maskPhone(o.buyer.phone)}</dd><dt>Ship to</dt><dd>${esc(o.buyer.city)}, ${o.buyer.state}, US</dd></dl>
        <p class="faint small" style="margin:12px 0 0">Buyer contact details are masked in the interface and stored encrypted. The full address is used only to print the shipping label.</p></div>
      <div><div class="sec-t">Fulfilment</div><ul class="timeline">${steps.map(([l, d, t]) => `<li class="${d ? 'done' : ''}"><span class="dot"></span><span>${l}</span><span class="faint small">${t}</span></li>`).join('')}</ul>
        ${o.tracking ? `<div class="row small"><span class="badge plain">${o.carrier}</span><span class="mono muted">${o.tracking}</span></div>` : ''}</div>
    </div>
    ${o.status === 'awaiting_shipment' ? `<div class="d-f"><button class="btn primary" data-ship="${o.id}">${I(IC.truck)}Mark shipped</button><button class="btn" data-label>${I(IC.printer)}Print label</button></div>` : ''}`, 'drawer');
  p.querySelector('[data-x]').onclick = close;
  p.querySelector('[data-label]')?.addEventListener('click', e => { const b = e.currentTarget; b.disabled = true; b.innerHTML = '<span class="spin"></span>Generating'; setTimeout(() => { b.disabled = false; b.innerHTML = I(IC.printer) + 'Print label'; log('Label printed', '#' + o.id); toast('Label PDF generated for #' + o.id); }, 700); });
}
function ship(id) {
  const o = st.orders.find(x => x.id === id); if (!o || o.status !== 'awaiting_shipment') return;
  o.status = 'in_transit'; o.carrier = 'USPS'; o.tracking = '9400' + String(Date.now()).slice(-12); o.handled = (Date.now() - o.created) / 3600000;
  log('Order shipped', '#' + id); close(); toast('Order #' + id + ' marked as shipped'); route();
}

pages.products = q => {
  if (!connected().length) return noStores();
  const term = (q.get('q') || '').toLowerCase(), sv = q.get('view') || 'all';
  const base = st.products.filter(p => !term || p.title.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term));
  const list = base.filter(p => sv === 'all' || p.status === sv);
  return `${pagehead('Products', `${st.products.length} products · edits sync to every channel the product is listed on`)}
  <div class="toolbar">${seg('view', sv, [['all', 'All', base.length], ['active', 'Active', base.filter(p => p.status === 'active').length], ['draft', 'Draft', base.filter(p => p.status === 'draft').length]])}
    <label class="search">${I(IC.search)}<input type="search" id="pq" placeholder="Product or SKU" value="${esc(term)}" aria-label="Search products"></label>
    <span class="count">${list.length} result${list.length === 1 ? '' : 's'}</span></div>
  ${list.length ? `<div class="table-wrap cards-sm"><table><thead><tr><th>Product</th><th class="right">Price</th><th>Listed on</th><th>Stock</th><th>Status</th><th class="hide-sm">Synced</th><th></th></tr></thead><tbody>
  ${list.map(p => { const t = totalStock(p); return `<tr><td><div class="prod">${thumb(p)}<div><div class="title">${esc(p.title)}</div><div class="sub mono">${p.sku}</div></div></div></td><td class="right num">${money(p.price)}</td><td><div class="row" style="gap:4px;flex-wrap:nowrap">${p.channels.map(chip).join('')}</div></td>
    <td class="end-sm" style="min-width:120px"><div class="row between small" style="margin-bottom:6px"><span class="num ${t < 10 ? 'warn-t' : ''}">${t} units</span></div><div class="meter"><i style="width:${Math.min(100, t / 1.5)}%;background:${t < 10 ? '#fbbf24' : 'rgba(255,255,255,.35)'}"></i></div></td>
    <td><span class="badge ${p.status === 'active' ? 'ok' : ''}">${p.status === 'active' ? 'Active' : 'Draft'}</span></td><td class="faint small hide-sm">${ago(p.synced)}</td><td class="right"><button class="btn sm" data-edit="${p.id}">Edit</button></td></tr>`; }).join('')}
  </tbody></table></div>` : `<div class="table-wrap">${emptyState('search', 'No matching products', 'No products match this search.', '<a class="btn sm" href="#/products">Clear search</a>')}</div>`}`;
};
function editProduct(id) {
  const p = st.products.find(x => x.id === id);
  const el = layer(`<div class="row" style="gap:14px">${thumb(p)}<div><h3 id="dlg-t">Edit product</h3><div class="faint mono">${p.sku}</div></div></div>
    <form id="pf" class="stack" novalidate>
      <div class="field"><label for="pt">Title</label><input id="pt" value="${esc(p.title)}" required maxlength="120"></div>
      <div class="field"><label for="pp">Price (USD)</label><input id="pp" type="number" step="0.01" min="0.01" value="${p.price.toFixed(2)}" required></div>
      <div class="row small faint">Syncs to ${p.channels.map(c => CH[c][0]).join(', ')}</div>
      <div class="form-error" id="pe" role="alert"></div>
      <div class="row end"><button type="button" class="btn" data-x>Cancel</button><button class="btn primary">Save and sync</button></div></form>`, 'modal');
  el.querySelector('[data-x]').onclick = close;
  el.querySelector('#pf').onsubmit = e => {
    e.preventDefault(); const ti = el.querySelector('#pt'), pi = el.querySelector('#pp'), t = ti.value.trim(), pr = parseFloat(pi.value);
    ti.setAttribute('aria-invalid', !t); pi.setAttribute('aria-invalid', !(pr > 0));
    if (!t || !(pr > 0)) { el.querySelector('#pe').textContent = !t ? 'Title is required.' : 'Price must be above $0.00.'; return; }
    const b = e.submitter || el.querySelector('.btn.primary'); b.disabled = true; b.innerHTML = '<span class="spin"></span>Syncing';
    setTimeout(() => { p.title = t; p.price = Math.round(pr * 100) / 100; p.synced = Date.now(); log('Product updated', p.sku); close(); toast(p.sku + ' saved and synced to ' + p.channels.length + ' channels'); route(); }, 600);
  };
}

pages.inventory = q => {
  if (!connected().length) return noStores();
  const chs = [...liveChannels()], v = q.get('view') || 'all';
  const list = st.products.filter(p => v === 'all' || isLow(p));
  const units = st.products.reduce((s, p) => s + chs.reduce((a, c) => a + (p.stock[c] || 0), 0), 0), low = st.products.filter(isLow).length;
  return `${offlineNote()}${pagehead('Inventory', `${units.toLocaleString()} units across ${chs.length} channels · edits push to each connected store`, `<button class="btn" id="syncAll">${I(IC.sync)}Sync all stock</button>`)}
  <div class="toolbar">${seg('view', v, [['all', 'All SKUs', st.products.length], ['low', 'Low stock', low]])}</div>
  ${list.length ? `<div class="table-wrap"><table><thead><tr><th>Product</th>${chs.map(c => `<th class="right">${CH[c][0]}</th>`).join('')}<th class="right">Total</th><th>Status</th></tr></thead><tbody>
  ${list.map(p => { const total = chs.reduce((s, c) => s + (p.stock[c] || 0), 0); return `<tr><td><div class="prod">${thumb(p)}<div><div class="title">${esc(p.title)}</div><div class="sub mono">${p.sku}</div></div></div></td>
    ${chs.map(c => `<td class="right"><input class="stock-in num${(p.stock[c] || 0) < 5 ? ' low' : ''}" type="number" min="0" inputmode="numeric" value="${p.stock[c] || 0}" data-stock="${p.id}:${c}" aria-label="${CH[c][0]} stock for ${p.sku}"></td>`).join('')}
    <td class="right num"><strong>${total}</strong></td><td>${total < 10 ? '<span class="badge warn">Low stock</span>' : '<span class="badge ok">In stock</span>'}</td></tr>`; }).join('')}
  </tbody></table></div>` : `<div class="table-wrap">${emptyState('check', 'No low-stock SKUs', 'Every SKU has 10 or more units across channels.', '<a class="btn sm" href="#/inventory">Show all SKUs</a>')}</div>`}`;
};

pages.shipments = q => {
  if (!connected().length) return noStores();
  const all = visibleOrders().filter(o => o.tracking), v = q.get('view') || 'all';
  const list = all.filter(o => v === 'all' || o.status === v).sort((a, b) => b.created - a.created);
  const by = k => all.filter(o => o.status === k).length;
  const carriers = {}; all.forEach(o => carriers[o.carrier] = (carriers[o.carrier] || 0) + 1);
  return `${pagehead('Shipments', 'Carrier tracking for shipped orders')}
  <div class="grid kpis">${kpi('In transit', by('in_transit'), 'Label created, moving with carrier')}${kpi('Delivered', by('delivered') + by('completed'), 'Last 30 days')}
    ${kpi('Avg. handling', (all.reduce((s, o) => s + handled(o), 0) / (all.length || 1)).toFixed(1) + ' h', 'Placed to label created')}
    <div class="card kpi"><div class="label">Carrier split</div><div class="legend" style="margin-top:12px">${Object.entries(carriers).sort((a, b) => b[1] - a[1]).map(([c, n]) => `<div><div class="row between small" style="margin-bottom:6px"><span>${c}</span><span class="num muted">${n}</span></div><div class="meter"><i style="width:${n / all.length * 100}%"></i></div></div>`).join('')}</div></div></div>
  <div class="toolbar mt">${seg('view', v, [['all', 'All', all.length], ['in_transit', 'In transit', by('in_transit')], ['delivered', 'Delivered', by('delivered')], ['completed', 'Completed', by('completed')]])}</div>
  ${list.length ? `<div class="table-wrap cards-sm"><table><thead><tr><th>Order</th><th>Carrier</th><th>Tracking</th><th>Ship to</th><th>Shipped</th><th>Status</th></tr></thead><tbody>
  ${list.map(o => `<tr class="click" data-order="${o.id}" tabindex="0"><td><span class="title num">#${o.id}</span></td><td class="end-sm">${o.carrier}</td><td class="mono muted">${o.tracking}</td><td class="end-sm">${esc(o.buyer.city)}, ${o.buyer.state}</td><td>${fmtDate(o.created + handled(o) * 3600000)}</td><td class="end-sm">${statusBadge(o.status)}</td></tr>`).join('')}
  </tbody></table></div>` : `<div class="table-wrap">${emptyState('truck', 'No shipments', 'Shipped orders appear here with carrier tracking.')}</div>`}`;
};

pages.stores = () => `${offlineNote()}${pagehead('Stores', 'Connected sales channels · disconnecting a store deletes its synced data', `<button class="btn primary" id="connectTT">${I(IC.plug)}Connect TikTok Shop</button>`)}
  <div class="grid stores">${st.stores.map(s => { const on = s.status === 'connected', syncing = busy?.store === s.id; return `<div class="card store ${on ? '' : 'off'}">
    <div class="row" style="gap:14px;flex-wrap:nowrap;min-width:0"><span class="ch lg ${s.channel}">${CH[s.channel][1]}</span><div style="min-width:0"><div class="title ellip" style="font-weight:600">${esc(s.name)}</div><div class="faint small">${CH[s.channel][0]} · ${esc(s.region)}</div></div></div>
    ${syncing ? `<div class="stack" style="gap:12px">${sk('80%')}${sk('60%')}${sk('70%')}${sk('50%')}</div>` : `<dl class="kv"><dt>Status</dt><dd>${on ? '<span class="badge ok">Connected</span>' : '<span class="badge">Disconnected</span>'}</dd><dt>Shop ID</dt><dd class="mono">${esc(s.shopId)}</dd><dt>Last sync</dt><dd>${on ? ago(s.lastSync) : '—'}</dd>
      <dt>Orders · 30 days</dt><dd class="num">${on ? st.orders.filter(o => o.channel === s.channel).length : '—'}</dd></dl>`}
    <div class="row">${on ? `<button class="btn sm" data-sync="${s.id}" ${syncing ? 'disabled' : ''}>${syncing ? '<span class="spin"></span>Syncing' : I(IC.sync) + 'Sync now'}</button><button class="btn sm danger" data-disc="${s.id}">Disconnect</button>` : `<button class="btn sm" data-reconn="${s.id}">Reconnect</button>`}</div>
  </div>`; }).join('')}</div>
  ${st.stores.some(s => s.channel === 'tiktok' && s.status === 'connected') ? `<section class="card mt-l"><div class="card-h"><div><h2>TikTok Shop permissions</h2><div class="sub">Granted by the seller during authorization · Ruby Home Goods</div></div><span class="badge ok">${SCOPES.length} granted</span></div>
    <div class="scopes">${SCOPES.map(([k, d]) => `<div>${I(IC.check)}<div><code>${k}</code><div class="muted small">${d}</div></div></div>`).join('')}</div>
    <p class="faint small" style="margin:14px 0 0">Access tokens are encrypted at rest. Disconnecting revokes them and deletes the store’s synced data within 48 hours.</p></section>` : ''}`;

function connectFlow(storeId) {
  const p = layer(`<div class="row" style="gap:14px"><span class="ch lg tiktok">TT</span><div><h3 id="dlg-t">Connect TikTok Shop</h3><div class="faint small">OAuth authorization · ${SCOPES.length} permissions</div></div></div>
    <p class="muted small">The seller signs in to TikTok Shop and approves these permissions. RubyBug Apps receives an authorization code and exchanges it for access tokens, which are stored encrypted.</p>
    <div class="scopes">${SCOPES.map(([k, d]) => `<div>${I(IC.check)}<div><code>${k}</code><div class="muted small">${d}</div></div></div>`).join('')}</div>
    <p class="faint small">Demo environment: authorization is simulated with sample data.</p>
    <div class="form-error" id="ce" role="alert"></div>
    <div class="row end"><button class="btn" data-x>Cancel</button><button class="btn primary" data-auth>Authorize</button></div>`, 'modal');
  p.querySelector('[data-x]').onclick = close;
  p.querySelector('[data-auth]').onclick = e => {
    const b = e.currentTarget; b.disabled = true; b.innerHTML = '<span class="spin"></span>Authorizing';
    setTimeout(() => {
      if (!navigator.onLine) { b.disabled = false; b.textContent = 'Try again'; p.querySelector('#ce').textContent = 'Authorization failed: no network connection.'; return; }
      const s = st.stores.find(x => x.id === (storeId || 'st_tt'));
      s.status = 'connected'; s.lastSync = Date.now(); log('Store connected', s.name + ' (' + CH[s.channel][0] + ')'); close(); toast(s.name + ' connected'); route();
    }, 900);
  };
}
function disconnect(id) {
  const s = st.stores.find(x => x.id === id);
  confirmBox('Disconnect ' + s.name + '?', 'Access tokens are revoked and the store’s synced orders and products are deleted. This cannot be undone.', 'Disconnect and delete', () => {
    s.status = 'disconnected'; log('Store disconnected, data deleted', s.name + ' (' + CH[s.channel][0] + ')'); toast(s.name + ' disconnected. Store data deleted.'); route();
  });
}

pages.analytics = () => {
  if (!connected().length) return noStores();
  const all = visibleOrders(), os = all.filter(o => o.status !== 'cancelled');
  const top = {}; os.forEach(o => o.lines.forEach(l => { top[l.sku] = top[l.sku] || { t: l.title, q: 0, r: 0 }; top[l.sku].q += l.qty; top[l.sku].r += l.qty * l.price; }));
  const tops = Object.entries(top).sort((a, b) => b[1].r - a[1].r).slice(0, 6), topMax = tops[0]?.[1].r || 1;
  const rev = os.reduce((s, o) => s + o.total, 0), aov = os.length ? rev / os.length : 0;
  const weeks = [3, 2, 1, 0].map(w => ({ w, v: revenue(os.filter(o => Date.now() - o.created >= w * 7 * D.DAY && Date.now() - o.created < (w + 1) * 7 * D.DAY)) }));
  const mx = Math.max(...weeks.map(x => x.v), 1);
  const chRows = [...liveChannels()].map(c => { const l = os.filter(o => o.channel === c), r = l.reduce((s, o) => s + o.total, 0); return { c, n: l.length, r, aov: l.length ? r / l.length : 0, cx: all.filter(o => o.channel === c && o.status === 'cancelled').length }; }).sort((a, b) => b.r - a.r);
  return `${pagehead('Analytics', 'Last 30 days · all figures from sample data')}
  <div class="grid kpis">${kpi('Orders', os.length, 'Excludes cancelled', daily(all, 30, l => l.length).map(d => d.v))}${kpi('Revenue', money(rev), 'Gross, before fees', daily(all, 30, revenue).map(d => d.v), 'accent')}
    ${kpi('Average order value', money(aov), 'Per non-cancelled order')}${kpi('Cancellation rate', Math.round(all.filter(o => o.status === 'cancelled').length / Math.max(1, all.length) * 100) + '%', 'Share of all orders')}</div>
  <div class="grid g-2-1 mt">
    <section class="card"><div class="card-h"><div><h2>Revenue by week</h2><div class="sub">Rolling 7-day windows</div></div></div>
      <div class="bars">${weeks.map(x => `<div class="bar"><span class="num">${money0(x.v)}</span><i style="height:${Math.max(3, x.v / mx * 100)}%" class="${x.w ? '' : 'cur'}"></i><em>${x.w ? x.w + ' wk ago' : 'This week'}</em></div>`).join('')}</div></section>
    <section class="card"><div class="card-h"><h2>Top products</h2><span class="sub">By revenue</span></div><div class="legend">
      ${tops.map(([sku, v]) => `<div><div class="row between small" style="margin-bottom:6px;flex-wrap:nowrap"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(v.t)} <span class="faint">· ${v.q} sold</span></span><span class="num">${money(v.r)}</span></div><div class="meter"><i style="width:${v.r / topMax * 100}%"></i></div></div>`).join('')}</div></section>
  </div>
  <section class="mt-l"><div class="card-h"><h2>Channel performance</h2></div><div class="table-wrap"><table><thead><tr><th>Channel</th><th class="right">Orders</th><th class="right">Revenue</th><th class="right">AOV</th><th class="right">Cancelled</th><th>Share</th></tr></thead><tbody>
    ${chRows.map(r => `<tr><td>${chLabel(r.c)}</td><td class="right num">${r.n}</td><td class="right num">${money(r.r)}</td><td class="right num">${money(r.aov)}</td><td class="right num">${r.cx}</td><td style="min-width:140px"><div class="meter"><i style="width:${r.r / (rev || 1) * 100}%;background:${CH[r.c][2]}"></i></div></td></tr>`).join('')}
  </tbody></table></div></section>`;
};

pages.settings = q => {
  const tab = q.get('tab') || 'account';
  const tabs = [['account', 'Account'], ['security', 'Security'], ['privacy', 'Data & privacy'], ['audit', 'Audit log']];
  const body = {
    account: `<div class="card"><div class="card-h"><h2>Account</h2></div><dl class="kv"><dt>Business</dt><dd>Ruby Home Goods (demo)</dd><dt>Owner</dt><dd>Demo Seller</dd><dt>Email</dt><dd>demo@rubybugllc.com</dd><dt>Plan</dt><dd>Starter</dd><dt>Time zone</dt><dd>America/Denver</dd><dt>Connected stores</dt><dd>${connected().length} of ${st.stores.length}</dd></dl></div>`,
    security: `<div class="card"><div class="set-row"><div><strong>Two-factor authentication</strong><p>Authenticator app code required at sign-in.</p></div>
        <button class="switch" role="switch" id="tfa" aria-checked="${st.twofa}" aria-label="Two-factor authentication"></button></div>
      <div class="set-row"><div><strong>Active sessions</strong><p>Sessions expire after 12 hours of inactivity.</p></div><button class="btn sm" id="revoke">Sign out other sessions</button></div>
      <div class="set-row"><div><strong>Access tokens</strong><p>TikTok Shop tokens are encrypted at rest with AES-256-GCM and are never shown in the interface.</p></div><span class="badge ok">Encrypted</span></div>
      <div class="set-row"><div><strong>Security policy</strong><p>Controls, incident response and vulnerability reporting.</p></div><a class="btn sm" href="/security-policy.html">Open policy</a></div></div>`,
    privacy: `<div class="stack"><div class="card"><div class="card-h"><div><h2>Data retention</h2><div class="sub">Applied automatically by a daily retention job</div></div></div>
        <div class="retention"><div><span>Orders</span><b>90 days</b><span>after completion, then deleted</span></div><div><span>Disconnected store</span><b>48 hours</b><span>all store data deleted within</span></div>
          <div><span>Backups</span><b>30 days</b><span>encrypted, then rotated out</span></div><div><span>Audit log</span><b>90 days</b><span>kept for security review</span></div></div></div>
      <div class="card"><div class="set-row"><div><strong>Export data</strong><p>Orders, products and stores as JSON. Buyer contact fields stay masked.</p></div><button class="btn sm" id="export">${I(IC.download)}Export JSON</button></div>
        <div class="set-row"><div><strong>Delete all data</strong><p>Disconnects every store and removes synced orders and products.</p></div><button class="btn sm danger" id="wipe">${I(IC.trash)}Delete data</button></div>
        <div class="set-row"><div><strong>Privacy requests</strong><p><a href="mailto:aissatalyah524@hotmail.com">aissatalyah524@hotmail.com</a> · <a href="/privacy-policy.html">Privacy policy</a></p></div></div></div></div>`,
    audit: st.audit.length ? `<div class="table-wrap"><table><thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Target</th></tr></thead><tbody>${st.audit.slice(0, 50).map(a => `<tr><td class="num">${fmtTime(a.at)}</td><td class="muted">${esc(a.actor)}</td><td>${esc(a.action)}</td><td class="muted">${esc(a.target)}</td></tr>`).join('')}</tbody></table></div>
      <p class="faint small">Showing the latest ${Math.min(50, st.audit.length)} entries · kept 90 days</p>` : `<div class="table-wrap">${emptyState('shield', 'No audit entries', 'Sign-ins, store connections and data changes are recorded here.')}</div>`,
  }[tab];
  return `${pagehead('Settings', 'Account, security and data controls')}<div class="settings"><nav class="subnav" aria-label="Settings sections">${tabs.map(([k, l]) => `<button aria-current="${k === tab ? 'page' : 'false'}" class="${k === tab ? 'on' : ''}" data-tab="${k}">${l}</button>`).join('')}</nav><div>${body}</div></div>`;
};

// ---- router ----
const TITLES = { dashboard: 'Dashboard', orders: 'Orders', products: 'Products', inventory: 'Inventory', shipments: 'Shipments', stores: 'Stores', analytics: 'Analytics', settings: 'Settings' };
let lastPath = '';
function route() {
  if (!RB_AUTH.session()) return location.replace('index.html');
  const [path, qs] = (location.hash.slice(2) || 'dashboard').split('?');
  if (path === 'logout') { RB_AUTH.logout(); return location.replace('index.html'); }
  const name = pages[path] ? path : 'dashboard';
  const q = new URLSearchParams(qs || '');
  $('#title').textContent = TITLES[name]; document.title = TITLES[name] + ' · RubyBug Apps';
  renderNav(name);
  const view = $('#view'), fresh = name !== lastPath; lastPath = name;
  try { view.innerHTML = busy?.page === name && SKEL[name] ? SKEL[name]() : pages[name](q); }
  catch (err) { console.error(err); view.innerHTML = `<div class="card">${emptyState('alert', 'This page could not be loaded', 'Reloading usually fixes it. Demo data stays in this browser.', '<button class="btn" onclick="location.reload()">Reload</button>', true)}</div>`; }
  if (fresh) { view.style.animation = 'none'; view.offsetHeight; view.style.animation = ''; scrollTo(0, 0); }
  setMenu(false);
}
function setQuery(k, v) { const [p, qs] = (location.hash.slice(2) || 'dashboard').split('?'); const q = new URLSearchParams(qs || ''); v && v !== 'all' ? q.set(k, v) : q.delete(k); location.hash = '/' + p + (q.toString() ? '?' + q : ''); }

// ---- chart hover ----
document.addEventListener('pointerover', e => {
  const h = e.target.closest('.hit'); if (!h) return;
  const plot = h.parentElement, tip = plot.querySelector('.tip'), cur = plot.querySelector('.cursor');
  tip.textContent = h.dataset.tip; tip.style.left = cur.style.left = h.dataset.x + '%'; tip.style.top = cur.style.top = h.dataset.y + '%';
  tip.classList.add('show'); cur.classList.add('show');
});
document.addEventListener('pointerout', e => { const h = e.target.closest('.hit'); if (h && !h.contains(e.relatedTarget)) { h.parentElement.querySelector('.tip')?.classList.remove('show'); h.parentElement.querySelector('.cursor')?.classList.remove('show'); } });

// ---- events (delegated) ----
document.addEventListener('click', e => {
  if (e.target.id === 'scrim') return setMenu(false);
  const t = e.target.closest('button, tr[data-order]'); if (!t) return;
  const d = t.dataset;
  if (d.ship) { e.stopPropagation(); return ship(d.ship); }
  if (d.order) return openOrder(d.order);
  if (d.edit) return editProduct(d.edit);
  if (d.disc) return disconnect(d.disc);
  if (d.reconn) return connectFlow(d.reconn);
  if (d.tab) return setQuery('tab', d.tab === 'account' ? '' : d.tab);
  if (d.seg) { const [k, v] = d.seg.split(':'); return setQuery(k, v); }
  if (d.sync) {
    if (busy) return;
    busy = { store: d.sync }; route();
    return setTimeout(() => { busy = null; const s = st.stores.find(x => x.id === d.sync);
      if (!navigator.onLine) { route(); return toast(s.name + ' sync failed: no network connection', true); }
      s.lastSync = Date.now(); log('Store synced', s.name); toast(s.name + ' synced'); route(); }, 1000);
  }
  switch (t.id) {
    case 'connectTT': { const tt = st.stores.find(s => s.channel === 'tiktok'); return tt.status === 'connected' ? toast('TikTok Shop store is already connected') : connectFlow(tt.id); }
    case 'menuBtn': return setMenu(!$('#side').classList.contains('open'));
    case 'syncDash': return runSync('dashboard', 'Sync', () => { connected().forEach(s => s.lastSync = Date.now()); log('Stores synced', connected().length + ' stores'); toast(connected().length + ' stores synced'); });
    case 'syncAll': return runSync('inventory', 'Stock sync', () => { log('Inventory synced', 'All channels'); toast('Stock synced to all connected stores'); });
    case 'tfa': st.twofa = !st.twofa; log('Two-factor authentication ' + (st.twofa ? 'enabled' : 'disabled'), 'Account'); toast('Two-factor authentication ' + (st.twofa ? 'on' : 'off')); return route();
    case 'revoke': log('Other sessions signed out', 'Account'); return toast('Other sessions signed out');
    case 'export': {
      const data = { exported_at: new Date().toISOString(), stores: st.stores.map(({ id, channel, name, region, status }) => ({ id, channel, name, region, status })),
        orders: st.orders.map(o => ({ ...o, buyer: { name: maskName(o.buyer.name), phone: maskPhone(o.buyer.phone), city: o.buyer.city, state: o.buyer.state } })), products: st.products };
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })); a.download = 'rubybug-export.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      log('Data exported', 'JSON'); return toast('Export downloaded');
    }
    case 'wipe': return confirmBox('Delete all data?', 'Every store is disconnected and synced orders and products are removed. This cannot be undone.', 'Delete all data', () => {
      st.stores.forEach(s => s.status = 'disconnected'); log('All data deleted', 'Account'); toast('All store data deleted'); route(); });
  }
});
document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.('tr[data-order]')) { e.preventDefault(); openOrder(e.target.dataset.order); } });
document.addEventListener('change', e => {
  const t = e.target;
  if (t.id === 'oc') setQuery('channel', t.value);
  else if (t.id === 'storePick') { storeFilter = t.value; route(); }
  else if (t.dataset.stock) {
    const [id, c] = t.dataset.stock.split(':'), v = Number(t.value), p = st.products.find(x => x.id === id);
    if (!Number.isInteger(v) || v < 0) { t.value = p.stock[c]; t.setAttribute('aria-invalid', 'true'); return toast('Stock must be a whole number, 0 or more', true); }
    p.stock[c] = v; log('Stock updated', p.sku + ' · ' + CH[c][0] + ' = ' + v); toast(p.sku + ' stock pushed to ' + CH[c][0]); route();
  }
});
let deb; document.addEventListener('input', e => { if (e.target.id === 'oq' || e.target.id === 'pq') { clearTimeout(deb); const id = e.target.id, v = e.target.value; deb = setTimeout(() => { setQuery('q', v); setTimeout(() => { const el = $('#' + id); el?.focus(); el?.setSelectionRange(v.length, v.length); }); }, 250); } });
addEventListener('hashchange', route);
addEventListener('online', route); addEventListener('offline', route);
route();
})();
