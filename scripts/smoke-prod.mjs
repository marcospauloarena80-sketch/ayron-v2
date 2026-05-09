#!/usr/bin/env node
// AYRON production smoke test.
// Usage:
//   API_URL=https://api-production-554f.up.railway.app/api/v1 \
//   SMOKE_EMAIL=master@ayron.health SMOKE_PASSWORD='Ayron@Master2025!' \
//   node scripts/smoke-prod.mjs

const API = process.env.API_URL?.replace(/\/+$/, '') ?? 'https://api-production-554f.up.railway.app/api/v1';
const EMAIL = process.env.SMOKE_EMAIL ?? 'master@ayron.health';
const PASS = process.env.SMOKE_PASSWORD ?? 'Ayron@Master2025!';
const TIMEOUT_MS = 10_000;

let pass = 0, fail = 0;
const results = [];

const log = (status, name, detail = '') => {
  const tag = status === 'ok' ? '\x1b[32m✓\x1b[0m' : status === 'warn' ? '\x1b[33m!\x1b[0m' : '\x1b[31m✗\x1b[0m';
  console.log(`${tag} ${name}${detail ? ` — ${detail}` : ''}`);
  results.push({ name, status, detail });
  if (status === 'fail') fail++; else pass++;
};

async function call(method, path, opts = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API}${path}`, {
      method,
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', ...(opts.headers ?? {}) },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const text = await res.text();
    let body;
    try { body = JSON.parse(text); } catch { body = text; }
    return { ok: res.ok, status: res.status, body };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  console.log(`\n--- AYRON SMOKE TEST ---`);
  console.log(`API: ${API}`);
  console.log(`User: ${EMAIL}\n`);

  // 1. Health
  try {
    const r = await call('GET', '/health');
    if (r.ok && r.body?.status === 'ok' && r.body?.db === 'connected') {
      log('ok', 'GET /health', `db=${r.body.db} redis=${r.body.redis} uptime=${r.body.uptime_seconds}s`);
    } else {
      log('fail', 'GET /health', `status=${r.status} body=${JSON.stringify(r.body)}`);
    }
  } catch (e) { log('fail', 'GET /health', e.message); }

  // 2. Ready
  try {
    const r = await call('GET', '/ready');
    log(r.ok ? 'ok' : 'fail', 'GET /ready', `status=${r.status}`);
  } catch (e) { log('fail', 'GET /ready', e.message); }

  // 3. Login
  let token;
  try {
    const r = await call('POST', '/auth/login', { body: { email: EMAIL, password: PASS } });
    if (r.ok && r.body?.access_token) {
      token = r.body.access_token;
      log('ok', 'POST /auth/login', `user=${r.body.user?.email} role=${r.body.user?.role}`);
    } else {
      log('fail', 'POST /auth/login', `status=${r.status} ${JSON.stringify(r.body).slice(0, 120)}`);
    }
  } catch (e) { log('fail', 'POST /auth/login', e.message); }

  if (!token) {
    console.log(`\n--- ABORT: no auth token ---`);
    console.log(`PASS=${pass} FAIL=${fail}`);
    process.exit(1);
  }

  const auth = { headers: { Authorization: `Bearer ${token}` } };

  // 4-7. Listing endpoints
  const listings = [
    ['GET /patients', '/patients?limit=5'],
    ['GET /agenda (today)', `/agenda?date=${new Date().toISOString().slice(0, 10)}`],
    ['GET /clinical/protocols', '/clinical/protocols?limit=5'],
    ['GET /financial', '/financial?limit=5'],
  ];
  for (const [name, path] of listings) {
    try {
      const r = await call('GET', path, auth);
      if (r.ok) {
        const count = Array.isArray(r.body) ? r.body.length : (r.body?.data?.length ?? Object.keys(r.body ?? {}).length);
        log('ok', name, `count=${count}`);
      } else if (r.status === 403) {
        log('warn', name, `403 — role lacks access (expected for some endpoints)`);
      } else {
        log('fail', name, `status=${r.status}`);
      }
    } catch (e) { log('fail', name, e.message); }
  }

  // 8. Bootstrap is locked
  try {
    const r = await call('POST', '/auth/bootstrap', { body: {} });
    if (r.body?.already_initialized) {
      log('ok', 'POST /auth/bootstrap (locked)', 'returned already_initialized=true');
    } else if (r.status === 401 || r.status === 403) {
      log('ok', 'POST /auth/bootstrap (locked)', `secret/disabled enforced — status=${r.status}`);
    } else {
      log('warn', 'POST /auth/bootstrap (locked)', `unexpected status=${r.status} — review`);
    }
  } catch (e) { log('fail', 'POST /auth/bootstrap', e.message); }

  // 9. No localhost in env
  if (API.includes('localhost') || API.includes('127.0.0.1')) {
    log('fail', 'API URL not localhost', `API=${API}`);
  } else {
    log('ok', 'API URL not localhost');
  }

  console.log(`\n--- RESULT ---`);
  console.log(`PASS=${pass} FAIL=${fail}`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => { console.error('FATAL', e); process.exit(2); });
