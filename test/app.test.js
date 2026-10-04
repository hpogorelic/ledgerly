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
  const origLog = console.log
  const logged = []
  console.log = (...args) => { logged.push(args) }
  try {
    return { result: await fn(), logged }
  } finally {
    console.log = origLog
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

test('createApp mounts json parser, /entries, /health and the error handler in that order', () => {
  const app = createApp()
  const stack = app._router.stack
  const layers = stack.slice(-4).map((l) => l.name + ':' + (l.regexp.source.includes('entries') ? 'entries' : l.regexp.source.includes('health') ? 'health' : ''))
  assert.deepEqual(layers.slice(0, 3), ['jsonParser:', 'router:entries', 'router:health'])
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

test('responses carry the Express default X-Powered-By header and no security headers of their own', async () => {
  const r = await postJson('/entries', '{}')
  assert.equal(r.headers.get('x-powered-by'), 'Express')
  assert.equal(r.headers.get('x-content-type-options'), null)
  assert.equal(r.headers.get('strict-transport-security'), null)
  assert.equal(r.headers.get('access-control-allow-origin'), null)
  // only the default 404 page (finalhandler) adds nosniff
  const nf = await fetch(base + '/nope')
  assert.equal(nf.headers.get('x-content-type-options'), 'nosniff')
})

test('a JSON route answer is application/json with charset utf-8', async () => {
  const r = await fetch(base + '/entries', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })
  assert.equal(r.status, 400)
  assert.equal(r.headers.get('content-type'), 'application/json; charset=utf-8')
  assert.equal(r.headers.get('x-powered-by'), 'Express')
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

test('malformed JSON reaches the error handler: 500 {error: "internal error", detail: stack}', async () => {
  const { result: r, logged } = await silenced(() => postJson('/entries', '{"account":'))
  assert.equal(r.status, 500)
  assert.equal(r.headers.get('content-type'), 'application/json; charset=utf-8')
  const body = await r.json()
  assert.deepEqual(Object.keys(body).sort(), ['detail', 'error'])
  assert.equal(body.error, 'internal error')
  assert.equal(typeof body.detail, 'string')
  assert.match(body.detail, /^SyntaxError/)
  assert.match(body.detail, /\n\s+at /)
  assert.equal(logged.length, 1)
  assert.equal(logged[0].length, 1)
  assert.ok(logged[0][0] instanceof Error)
})

test('malformed JSON is answered 500 (not the parser 400) on any path, even unrouted ones', async () => {
  const { result: r } = await silenced(() => postJson('/nope', 'not json'))
  assert.equal(r.status, 500)
  assert.equal((await r.json()).error, 'internal error')
})

test('a non-object JSON body is rejected by the strict parser with the same 500', async () => {
  const { result: r } = await silenced(() => postJson('/entries', '"just a string"'))
  assert.equal(r.status, 500)
  const body = await r.json()
  assert.equal(body.error, 'internal error')
  assert.match(body.detail, /SyntaxError/)
})

test('a body over the 100kb parser limit is answered 500 (the 413 status is not kept)', async () => {
  const big = JSON.stringify({ account: 'cash', amount: 1, memo: 'x'.repeat(200 * 1024) })
  const { result: r, logged } = await silenced(() => postJson('/entries', big))
  assert.equal(r.status, 500)
  const body = await r.json()
  assert.equal(body.error, 'internal error')
  assert.match(body.detail, /PayloadTooLargeError|request entity too large/)
  assert.equal(logged.length, 1)
})

test('the error handler leaks the stack trace in the response detail', async () => {
  const { result: r } = await silenced(() => postJson('/entries', '{'))
  const body = await r.json()
  assert.ok(body.detail.includes('node_modules'))
})
