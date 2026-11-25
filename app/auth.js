// Demo-only auth: static site, credentials are published on the sign-in page for reviewers.
const RB_AUTH = (() => {
  const DEMO_EMAIL = 'demo@rubybugllc.com', DEMO_PW = 'RubyBugDemo#2026';
  const KEY = 'rb.session', TTL = 12 * 3600 * 1000;
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
    del(k) { try { localStorage.removeItem(k); } catch {} },
  };
  let mem = null; // fallback when storage is blocked
  async function sha(s) {
    const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
    return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
  }
  async function login(email, pw) {
    const ok = email.toLowerCase() === DEMO_EMAIL && (await sha(pw)) === (await sha(DEMO_PW));
    if (ok) { mem = { email: DEMO_EMAIL, name: 'Demo Seller', at: Date.now() }; store.set(KEY, mem); }
    return ok;
  }
  function session() {
    const s = store.get(KEY) || mem;
    if (!s || Date.now() - s.at > TTL) { store.del(KEY); return null; }
    s.at = Date.now(); store.set(KEY, s); // sliding idle expiry
    return s;
  }
  function logout() { mem = null; store.del(KEY); }
  return { DEMO_EMAIL, DEMO_PW, login, session, logout, store };
})();
