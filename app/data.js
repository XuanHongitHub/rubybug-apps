// Deterministic sample data for the demo account.
const RB_DATA = (() => {
  let seed = 20261125;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
  const pick = a => a[Math.floor(rnd() * a.length)];
  const DAY = 86400000, NOW = Date.now(); // sample data is relative to the viewer's clock; content stays deterministic via seed

  const stores = [
    { id: 'st_tt', channel: 'tiktok', name: 'Ruby Home Goods', region: 'United States', status: 'connected', lastSync: NOW - 12 * 60000, shopId: '7495••••2210' },
    { id: 'st_sh', channel: 'shopify', name: 'rubyhome.myshopify.com', region: 'United States', status: 'connected', lastSync: NOW - 40 * 60000, shopId: 'rubyhome' },
    { id: 'st_am', channel: 'amazon', name: 'Ruby Home (Amazon US)', region: 'United States', status: 'connected', lastSync: NOW - 95 * 60000, shopId: 'A2••••QZ' },
  ];
  const names = ['Ceramic Pour-Over Set', 'Linen Table Runner', 'Bamboo Cutting Board', 'Glass Storage Jars (3 pack)', 'Cotton Throw Blanket',
    'Stoneware Mug 12oz', 'Cast Iron Skillet 10"', 'Wool Dryer Balls (6)', 'Olive Wood Spoon Set', 'Soy Wax Candle – Cedar',
    'Silicone Baking Mat', 'Marble Coaster Set', 'Herb Keeper', 'French Press 34oz', 'Waffle Weave Towel Set'];
  const products = names.map((t, i) => {
    const price = Math.round((9 + rnd() * 70) * 100) / 100;
    const stock = { tiktok: Math.floor(rnd() * 80), shopify: Math.floor(rnd() * 60), amazon: Math.floor(rnd() * 50) };
    if (i % 6 === 2) { stock.tiktok = 2; stock.shopify = 1; stock.amazon = 0; }
    return { id: 'p' + (i + 1), sku: 'RB-' + String(1001 + i), title: t, price, stock,
      channels: i % 4 === 3 ? ['tiktok', 'shopify'] : ['tiktok', 'shopify', 'amazon'], status: i === 13 ? 'draft' : 'active', synced: NOW - Math.floor(rnd() * 5) * 3600000 };
  });
  const first = ['Jordan', 'Avery', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Jamie', 'Quinn', 'Parker', 'Drew'];
  const last = ['Miller', 'Nguyen', 'Garcia', 'Brooks', 'Patel', 'Lee', 'Hughes', 'Rivera', 'Kim', 'Ward'];
  const places = [['Austin', 'TX'], ['Denver', 'CO'], ['Columbus', 'OH'], ['Portland', 'OR'], ['Raleigh', 'NC'], ['Tampa', 'FL'], ['Madison', 'WI'], ['Boise', 'ID']];
  const statuses = ['awaiting_shipment', 'awaiting_shipment', 'in_transit', 'delivered', 'delivered', 'delivered', 'completed', 'cancelled'];
  const carriers = ['USPS', 'UPS', 'FedEx'];
  const orders = [];
  const ages = Array.from({ length: 150 }, () => rnd() * DAY * 30).sort((a, b) => a - b);
  for (let i = 0; i < ages.length; i++) {
    const ch = rnd() < .62 ? 'tiktok' : rnd() < .74 ? 'shopify' : 'amazon';
    const age = ages[i];
    const created = NOW - age;
    const status = age < DAY * 1.5 ? 'awaiting_shipment' : age < DAY * 5 ? pick(['in_transit', 'in_transit', 'delivered']) : pick(statuses.slice(3));
    const lines = Array.from({ length: 1 + Math.floor(rnd() * 3) }, () => { const p = pick(products); return { sku: p.sku, title: p.title, qty: 1 + Math.floor(rnd() * 2), price: p.price }; });
    const [city, state] = pick(places);
    const total = Math.round(lines.reduce((s, l) => s + l.qty * l.price, 0) * 100) / 100;
    orders.push({ id: String(5900 - i), channel: ch, created, status, lines, total,
      buyer: { name: pick(first) + ' ' + pick(last), phone: '(' + (200 + Math.floor(rnd() * 700)) + ') 555-' + String(1000 + Math.floor(rnd() * 8999)), city, state },
      carrier: status === 'awaiting_shipment' || status === 'cancelled' ? null : pick(carriers),
      tracking: status === 'awaiting_shipment' || status === 'cancelled' ? null : '9400' + Math.floor(rnd() * 1e12) });
  }
  const audit = [
    { at: NOW - 12 * 60000, actor: 'system', action: 'Store synced', target: 'Ruby Home Goods (TikTok Shop)' },
    { at: NOW - 3 * 3600000, actor: 'demo@rubybugllc.com', action: 'Signed in', target: 'Web' },
    { at: NOW - 26 * 3600000, actor: 'system', action: 'Retention job', target: '0 orders older than 90 days removed' },
    { at: NOW - 3 * DAY, actor: 'demo@rubybugllc.com', action: 'Store connected', target: 'Ruby Home Goods (TikTok Shop)' },
  ];
  return { NOW, DAY, stores, products, orders, audit };
})();
