const test = require('node:test');
const assert = require('node:assert/strict');

const {
  clientIp,
  createRateLimiter,
  buildCorsOptions,
  allowedOrigins,
} = require('../dist/security');

function req(headers = {}, remote = '203.0.113.9') {
  return { headers, socket: { remoteAddress: remote } };
}

function res() {
  const r = { statusCode: null, body: null, headers: {} };
  r.setHeader = (k, v) => { r.headers[k.toLowerCase()] = v; };
  r.status = (c) => { r.statusCode = c; return r; };
  r.json = (b) => { r.body = b; return r; };
  return r;
}

test('clientIp', async (t) => {
  await t.test('prefers CF-Connecting-IP, which Cloudflare overwrites', () => {
    const r = req({ 'cf-connecting-ip': '1.1.1.1', 'x-forwarded-for': '9.9.9.9' });
    assert.equal(clientIp(r), '1.1.1.1');
  });

  await t.test('falls back to the leftmost X-Forwarded-For entry', () => {
    assert.equal(clientIp(req({ 'x-forwarded-for': '2.2.2.2, 10.0.0.1' })), '2.2.2.2');
  });

  await t.test('falls back to the socket address', () => {
    assert.equal(clientIp(req({}, '198.51.100.4')), '198.51.100.4');
  });

  await t.test('never returns the proxy address when a real client IP exists', () => {
    // The bug this guards: without it every user shares one bucket and the
    // first burst locks out everybody.
    const a = clientIp(req({ 'cf-connecting-ip': '5.5.5.5' }, '10.0.0.1'));
    const b = clientIp(req({ 'cf-connecting-ip': '6.6.6.6' }, '10.0.0.1'));
    assert.notEqual(a, b);
  });
});

test('rate limiter', async (t) => {
  await t.test('allows up to max, then 429s with Retry-After', () => {
    const limit = createRateLimiter({ windowMs: 60000, max: 3 });
    const r = req({ 'cf-connecting-ip': '1.2.3.4' });
    let allowed = 0;

    for (let i = 0; i < 3; i++) limit(r, res(), () => { allowed++; });
    assert.equal(allowed, 3, 'first three pass');

    const blocked = res();
    limit(r, blocked, () => { allowed++; });
    assert.equal(allowed, 3, 'fourth does not reach the handler');
    assert.equal(blocked.statusCode, 429);
    assert.ok(Number(blocked.headers['retry-after']) > 0);
  });

  await t.test('buckets per IP, so one abuser cannot lock out others', () => {
    const limit = createRateLimiter({ windowMs: 60000, max: 1 });
    let bPassed = false;

    limit(req({ 'cf-connecting-ip': 'a' }), res(), () => {});
    limit(req({ 'cf-connecting-ip': 'a' }), res(), () => {});   // a is now blocked
    limit(req({ 'cf-connecting-ip': 'b' }), res(), () => { bPassed = true; });

    assert.ok(bPassed, 'a different IP still gets through');
  });

  await t.test('resets once the window elapses', () => {
    let clock = 0;
    const limit = createRateLimiter({ windowMs: 1000, max: 1, now: () => clock });
    const r = req({ 'cf-connecting-ip': '7.7.7.7' });
    let allowed = 0;

    limit(r, res(), () => { allowed++; });
    limit(r, res(), () => { allowed++; });
    assert.equal(allowed, 1, 'blocked inside the window');

    clock += 1001;
    limit(r, res(), () => { allowed++; });
    assert.equal(allowed, 2, 'allowed again after it expires');
  });
});

test('CORS policy', async (t) => {
  const origins = ['https://balmody.com', 'https://www.balmody.com'];
  const decide = (origin) => {
    let result;
    buildCorsOptions(origins).origin(origin, (_e, ok) => { result = ok; });
    return result;
  };

  await t.test('allows the deployed site', () => {
    assert.equal(decide('https://balmody.com'), true);
    assert.equal(decide('https://www.balmody.com'), true);
  });

  await t.test('allows requests with no Origin (native apps, health checks)', () => {
    assert.equal(decide(undefined), true);
  });

  await t.test('rejects other sites', () => {
    assert.equal(decide('https://evil.example'), false);
    assert.equal(decide('http://balmody.com'), false, 'scheme must match');
    assert.equal(decide('https://balmody.com.evil.example'), false, 'no suffix match');
  });

  await t.test('rejects without throwing, so cors() cannot turn it into a 500', () => {
    let err = 'untouched';
    buildCorsOptions(origins).origin('https://evil.example', (e) => { err = e; });
    assert.equal(err, null);
  });
});

test('allowedOrigins reads ALLOWED_ORIGINS', () => {
  const saved = process.env.ALLOWED_ORIGINS;
  try {
    process.env.ALLOWED_ORIGINS = 'https://a.com, https://b.com/ ';
    assert.deepEqual(allowedOrigins(), ['https://a.com', 'https://b.com']);
    delete process.env.ALLOWED_ORIGINS;
    assert.ok(allowedOrigins().includes('https://balmody.com'), 'defaults to the live site');
  } finally {
    if (saved === undefined) delete process.env.ALLOWED_ORIGINS;
    else process.env.ALLOWED_ORIGINS = saved;
  }
});
