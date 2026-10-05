// Characterization tests: pin the current behaviour of src/app.js (middleware order, routing,
// default headers and the error handler). Only requests that never reach Postgres or Redis are made.
import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createApp } from '../src/app.js'

let server, base

before(() => {
  server = createApp().listen(0)
  base = 'http://127.0.0.1:' + server.address().port
})

after(() => {
  server.close()
})

async function silenced(fn) {
  const origError = console.error
  const logged = []
  console.error = (...args) => { logged.push(args) }
  try {
    return { result: await fn(), logged }
  } finally {
    console.error = origError
  }
}

function postJson(path, raw) {
  return fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: raw })
}

test('createApp is a function that returns a distinct Express app on each call', () => {
  assert.equal(typeof createApp, 'function')
  const a = createApp()
  const b = createApp()
  assert.equal(typeof a, 'function')
  assert.equal(typeof a.listen, 'function')
  assert.notEqual(a, b)
})

test('createApp mounts helmet, json parser, /entries (rate limited), /health and the error handler in that order', () => {
  const app = createApp()
  const stack = app.router.stack
  const mounted = (l, p) => l.matchers.some((m) => m(p))
  const layers = stack.slice(-6).map((l) => (mounted(l, '/entries') ? 'entries' : mounted(l, '/health') ? 'health' : '') + ':' + l.name)
  assert.deepEqual(layers.slice(0, 2), [':helmetMiddleware', ':jsonParser'])
  assert.deepEqual(layers.slice(3, 5), ['entries:router', 'health:router'])
  assert.equal(stack[stack.length - 1].handle.length, 4)
})

test('an unknown path gets the Express default 404 HTML page', async () => {
  const r = await fetch(base + '/nope')
  assert.equal(r.status, 404)
  assert.match(r.headers.get('content-type'), /^text\/html/)
  assert.match(await r.text(), /Cannot GET \/nope/)
})

test('the root path is not routed: 404', async () => {
  const r = await fetch(base + '/')
  assert.equal(r.status, 404)
})

test('a method the /health router does not define falls through to the 404 page', async () => {
  const r = await postJson('/health', '{}')
  assert.equal(r.status, 404)
  assert.match(await r.text(), /Cannot POST \/health/)
})

test('responses carry helmet security headers and no X-Powered-By', async () => {
  const r = await postJson('/entries', '{}')
  assert.equal(r.headers.get('x-powered-by'), null)
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff')
  assert.match(r.headers.get('strict-transport-security'), /max-age=/)
  assert.ok(r.headers.get('content-security-policy'))
  assert.equal(r.headers.get('x-frame-options'), 'SAMEORIGIN')
  assert.equal(r.headers.get('access-control-allow-origin'), null)
  const nf = await fetch(base + '/nope')
  assert.equal(nf.headers.get('x-content-type-options'), 'nosniff')
  assert.equal(nf.headers.get('x-powered-by'), null)
})

test('a JSON route answer is application/json with charset utf-8', async () => {
  const r = await fetch(base + '/entries', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })
  assert.equal(r.status, 400)
  assert.equal(r.headers.get('content-type'), 'application/json; charset=utf-8')
  assert.equal(r.headers.get('x-powered-by'), null)
})

test('a valid JSON body is parsed before the router sees it (validation errors come back as 400)', async () => {
  const r = await postJson('/entries', '{"account":"cash"}')
  assert.equal(r.status, 400)
  assert.deepEqual(await r.json(), { errors: ['amount must be a number'] })
})

test('a body that is not JSON content-type is not parsed: the router sees an empty body', async () => {
  const r = await fetch(base + '/entries', { method: 'POST', headers: { 'content-type': 'text/plain' }, body: '{"account":"cash","amount":1}' })
  assert.equal(r.status, 400)
  assert.deepEqual(await r.json(), { errors: ['account is required', 'amount must be a number'] })
})

test('malformed JSON reaches the error handler: 400 with a generic message, error logged server-side', async () => {
  const { result: r, logged } = await silenced(() => postJson('/entries', '{"account":'))
  assert.equal(r.status, 400)
  assert.equal(r.headers.get('content-type'), 'application/json; charset=utf-8')
  const body = await r.json()
  assert.deepEqual(body, { error: 'bad request' })
  assert.equal(logged.length, 1)
  assert.equal(logged[0].length, 1)
  assert.ok(logged[0][0] instanceof Error)
})

test('malformed JSON is answered 400 on any path, even unrouted ones', async () => {
  const { result: r } = await silenced(() => postJson('/nope', 'not json'))
  assert.equal(r.status, 400)
  assert.deepEqual(await r.json(), { error: 'bad request' })
})

test('a non-object JSON body is rejected by the strict parser with the same 400', async () => {
  const { result: r } = await silenced(() => postJson('/entries', '"just a string"'))
  assert.equal(r.status, 400)
  assert.deepEqual(await r.json(), { error: 'bad request' })
})

test('a body over the 100kb parser limit keeps its 413 status with a generic message', async () => {
  const big = JSON.stringify({ account: 'cash', amount: 1, memo: 'x'.repeat(200 * 1024) })
  const { result: r, logged } = await silenced(() => postJson('/entries', big))
  assert.equal(r.status, 413)
  assert.deepEqual(await r.json(), { error: 'payload too large' })
  assert.equal(logged.length, 1)
})

test('the error handler sends no stack trace or detail to the client', async () => {
  const { result: r } = await silenced(() => postJson('/entries', '{'))
  const text = await r.text()
  assert.ok(!text.includes('detail'))
  assert.ok(!text.includes('node_modules'))
  assert.ok(!text.includes('SyntaxError'))
})

test('an error without a 4xx status is answered 500 {error: "internal error"} only', async () => {
  const app = createApp()
  const handler = app.router.stack[app.router.stack.length - 1].handle
  const res = { code: 0, body: null, status (c) { this.code = c; return this }, json (b) { this.body = b; return this } }
  const { logged } = await silenced(async () => handler(new Error('relation "entries" does not exist'), {}, res, () => {}))
  assert.equal(res.code, 500)
  assert.deepEqual(res.body, { error: 'internal error' })
  assert.equal(logged.length, 1)
})

test('/entries is rate limited per IP: requests over the limit get 429', async () => {
  const limited = createApp({ rateLimitMax: 2 }).listen(0)
  const url = 'http://127.0.0.1:' + limited.address().port + '/entries'
  try {
    const send = () => fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })
    assert.equal((await send()).status, 400)
    assert.equal((await send()).status, 400)
    const r = await send()
    assert.equal(r.status, 429)
    assert.deepEqual(await r.json(), { error: 'too many requests' })
  } finally {
    limited.close()
  }
})

test('/health is not rate limited by the /entries limiter', async () => {
  const limited = createApp({ rateLimitMax: 1 }).listen(0)
  const base2 = 'http://127.0.0.1:' + limited.address().port
  try {
    const r = await fetch(base2 + '/health', { method: 'POST' })
    assert.equal(r.status, 404)
    assert.equal((await fetch(base2 + '/health', { method: 'POST' })).status, 404)
  } finally {
    limited.close()
  }
})
