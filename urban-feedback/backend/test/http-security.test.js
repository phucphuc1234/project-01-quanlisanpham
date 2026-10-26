import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

test('HTTP boundary rejects anonymous role access, invalid input, malformed JSON and cross-origin writes', async () => {
  const server = createApp().listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const url of ['/api/auth/me', '/api/admin/users', '/api/notifications', '/api/reopens']) {
      const response = await fetch(base + url);
      assert.equal(response.status, 401, url);
      assert.equal(typeof (await response.json()).message, 'string');
    }
    const invalid = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(invalid.status, 400);
    const csrf = await fetch(`${base}/api/auth/logout`, { method: 'POST', headers: { Origin: 'https://attacker.example' } });
    assert.equal(csrf.status, 403);
    const malformed = await fetch(`${base}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{broken' });
    assert.equal(malformed.status, 400);
    assert.match((await malformed.json()).message, /JSON/);
    const upload = await fetch(`${base}/api/uploads`, { method: 'POST' });
    assert.equal(upload.status, 401);
    const unknown = await fetch(`${base}/api/nonexistent`);
    assert.equal(unknown.status, 404);
    assert.equal(unknown.headers.get('x-powered-by'), null);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
