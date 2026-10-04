// Characterization tests: pin the current behaviour of src/db/pool.js, src/db/cache.js,
// src/routes/entries.js and src/routes/health.js without live Postgres or Redis.
// pg.Pool.prototype.query and the ioredis command methods are replaced by in-memory fakes.
import { test, before, after, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import pg from 'pg'
import Redis from 'ioredis'

process.env.DATABASE_URL = 'postgres://nobody:nothing@127.0.0.1:1/none'
process.env.REDIS_URL = 'redis://127.0.0.1:1'

const { createApp } = await import('../src/app.js')
const { default: entriesRouter } = await import('../src/routes/entries.js')
const { default: healthRouter } = await import('../src/routes/health.js')
const { getPool, query } = await import('../src/db/pool.js')
const { getCache, cached } = await import('../src/db/cache.js')

// ---- fakes -------------------------------------------------------------

let pgCalls // [{ text, params }]
let pgHandler // (text, params) => { rows } | throws Error
let store // Map key -> string
let redisCalls // [[method, ...args]]
let redisFail // { get, set, del, ping } -> Error | undefined

const realQuery = pg.Pool.prototype.query
const redisMethods = ['get', 'set', 'del', 'ping']
const realRedis = {}
for (const m of redisMethods) realRedis[m] = Redis.prototype[m]

pg.Pool.prototype.query = function (text, params) {
  pgCalls.push({ text, params })
  return new Promise(function (resolve, reject) {
    let result, error
    try { result = pgHandler(text, params) } catch (e) { error = e }
    setImmediate(function () { error ? reject(error) : resolve(result) })
  })
}

Redis.prototype.get = async function (key) {
  redisCalls.push(['get', key])
  if (redisFail.get) throw redisFail.get
  return store.has(key) ? store.get(key) : null
}
Redis.prototype.set = async function (key, value, ...rest) {
  redisCalls.push(['set', key, value, ...rest])
  if (redisFail.set) throw redisFail.set
  store.set(key, value)
  return 'OK'
}
Redis.prototype.del = async function (key) {
  redisCalls.push(['del', key])
  if (redisFail.del) throw redisFail.del
  return store.delete(key) ? 1 : 0
}
Redis.prototype.ping = async function () {
  redisCalls.push(['ping'])
  if (redisFail.ping) throw redisFail.ping
  return 'PONG'
}

let server, base

before(async () => {
  getCache().on('error', function () {})
  server = createApp().listen(0)
  base = 'http://127.0.0.1:' + server.address().port
})

after(async () => {
  server.close()
  getCache().disconnect()
  pg.Pool.prototype.query = realQuery
  for (const m of redisMethods) Redis.prototype[m] = realRedis[m]
})

beforeEach(() => {
  pgCalls = []
  pgHandler = () => ({ rows: [] })
  store = new Map()
  redisCalls = []
  redisFail = {}
})

const CREATED = '2024-01-02T03:04:05.000Z'
const dbRow = (id, account, cents, memo) => ({ id, account, amount_cents: cents, memo, created_at: CREATED })

// silences the server-side console.error logging of a request's error
async function quiet(fn) {
  const origError = console.error
  console.error = () => {}
  try {
    return await fn()
  } finally {
    console.error = origError
  }
}

function post(body, raw) {
  return fetch(base + '/entries', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: raw === undefined ? JSON.stringify(body) : raw
  })
}

test('routers: entries and health are Express routers mounted by createApp', () => {
  assert.equal(typeof entriesRouter, 'function')
  assert.equal(typeof healthRouter, 'function')
  assert.notEqual(entriesRouter, healthRouter)
})

// ---- src/db/pool.js ----------------------------------------------------

test('pool: getPool returns one shared pg.Pool built from DATABASE_URL', () => {
  const p = getPool()
  assert.ok(p instanceof pg.Pool)
  assert.equal(getPool(), p)
  assert.equal(p.options.connectionString, process.env.DATABASE_URL)
})

test('pool: query passes text and params and resolves with the result', async () => {
  pgHandler = () => ({ rows: [{ a: 1 }] })
  assert.deepEqual(await query('SELECT $1', [7]), { rows: [{ a: 1 }] })
  assert.deepEqual(pgCalls, [{ text: 'SELECT $1', params: [7] }])
})

test('pool: query rejects with the pool error', async () => {
  pgHandler = () => { throw new Error('nope') }
  await assert.rejects(query('SELECT 1', []), { message: 'nope' })
})

// ---- src/db/cache.js ---------------------------------------------------

test('cache: getCache returns one shared ioredis client', () => {
  const c = getCache()
  assert.ok(c instanceof Redis)
  assert.equal(getCache(), c)
})

test('cache: cached computes on a miss and stores JSON with EX ttl', async () => {
  let computed = 0
  const v = await cached('k1', 45, async () => { computed++; return { a: [1, 2] } })
  assert.deepEqual(v, { a: [1, 2] })
  assert.equal(computed, 1)
  assert.deepEqual(redisCalls, [['get', 'k1'], ['set', 'k1', '{"a":[1,2]}', 'EX', 45]])
})

test('cache: cached returns the parsed hit without calling compute', async () => {
  store.set('k2', '{"n":5}')
  const v = await cached('k2', 30, async () => { throw new Error('must not run') })
  assert.deepEqual(v, { n: 5 })
  assert.deepEqual(redisCalls, [['get', 'k2']])
})

test('cache: a cached JSON null counts as a hit (string "null" is truthy)', async () => {
  store.set('k3', 'null')
  assert.equal(await cached('k3', 30, async () => 'fresh'), null)
})

test('cache: an empty-string value counts as a miss and is recomputed', async () => {
  store.set('k4', '')
  assert.equal(await cached('k4', 30, async () => 'fresh'), 'fresh')
  assert.equal(store.get('k4'), '"fresh"')
})

test('cache: cached propagates compute errors and stores nothing', async () => {
  await assert.rejects(cached('k5', 30, async () => { throw new Error('compute failed') }), { message: 'compute failed' })
  assert.equal(store.has('k5'), false)
})

test('cache: cached propagates redis get and set errors', async () => {
  redisFail.get = new Error('get down')
  await assert.rejects(cached('k6', 30, async () => 1), { message: 'get down' })
  redisFail = { set: new Error('set down') }
  await assert.rejects(cached('k6', 30, async () => 1), { message: 'set down' })
})

test('cache: cached propagates a corrupt cached value as a JSON error', async () => {
  store.set('k7', '{not json')
  await assert.rejects(cached('k7', 30, async () => 1), SyntaxError)
})

// ---- GET /entries ------------------------------------------------------

test('GET /entries maps rows to decimal amounts and camelCase createdAt', async () => {
  pgHandler = () => ({ rows: [dbRow(1, 'cash', 1250, 'coffee'), dbRow(2, 'bank', -5, null)] })
  const r = await fetch(base + '/entries')
  assert.equal(r.status, 200)
  assert.deepEqual(await r.json(), [
    { id: 1, account: 'cash', amount: 12.5, memo: 'coffee', createdAt: CREATED },
    { id: 2, account: 'bank', amount: -0.05, memo: null, createdAt: CREATED }
  ])
  assert.equal(pgCalls[0].text, 'SELECT id, account, amount_cents, memo, created_at FROM entries ORDER BY id')
  assert.deepEqual(pgCalls[0].params, [])
})

test('GET /entries caches the raw rows under entries:all for 30 seconds', async () => {
  pgHandler = () => ({ rows: [dbRow(1, 'cash', 100, null)] })
  await fetch(base + '/entries')
  const set = redisCalls.find((c) => c[0] === 'set')
  assert.deepEqual(set.slice(0, 2), ['set', 'entries:all'])
  assert.deepEqual(JSON.parse(set[2]), [dbRow(1, 'cash', 100, null)])
  assert.deepEqual(set.slice(3), ['EX', 30])
})

test('GET /entries serves from the cache and does not query Postgres on a hit', async () => {
  store.set('entries:all', JSON.stringify([dbRow(9, 'cached', 300, 'm')]))
  const body = await (await fetch(base + '/entries')).json()
  assert.deepEqual(body, [{ id: 9, account: 'cached', amount: 3, memo: 'm', createdAt: CREATED }])
  assert.equal(pgCalls.length, 0)
})

test('GET /entries returns stale data after the database changes until the key is deleted', async () => {
  pgHandler = () => ({ rows: [dbRow(1, 'a', 100, null)] })
  const first = await (await fetch(base + '/entries')).json()
  assert.equal(first.length, 1)
  pgHandler = () => ({ rows: [dbRow(1, 'a', 100, null), dbRow(2, 'a', 200, null)] })
  const stale = await (await fetch(base + '/entries')).json()
  assert.equal(stale.length, 1)
  store.delete('entries:all')
  const fresh = await (await fetch(base + '/entries')).json()
  assert.equal(fresh.length, 2)
})

test('GET /entries answers 500 with a generic error (no Postgres text) when Postgres fails', async () => {
  pgHandler = () => { throw new Error('db down') }
  const r = await quiet(() => fetch(base + '/entries'))
  assert.equal(r.status, 500)
  assert.deepEqual(await r.json(), { error: 'internal error' })
})

test('GET /entries answers 500 with a generic error when Redis fails (no DB fallback)', async () => {
  redisFail.get = new Error('redis down')
  const r = await quiet(() => fetch(base + '/entries'))
  assert.equal(r.status, 500)
  assert.deepEqual(await r.json(), { error: 'internal error' })
  assert.equal(pgCalls.length, 0)
})

// ---- GET /entries/by-account/:account ---------------------------------

test('GET /entries/by-account/:account lists mapped rows for the account', async () => {
  pgHandler = () => ({ rows: [dbRow(3, 'cash', 250, 'x')] })
  const r = await fetch(base + '/entries/by-account/cash')
  assert.equal(r.status, 200)
  assert.deepEqual(await r.json(), [{ id: 3, account: 'cash', amount: 2.5, memo: 'x', createdAt: CREATED }])
})

test('GET /entries/by-account/:account passes the account as a SQL parameter (no cache)', async () => {
  await fetch(base + '/entries/by-account/cash')
  assert.deepEqual(pgCalls, [{
    text: 'SELECT id, account, amount_cents, memo, created_at FROM entries WHERE account = $1 ORDER BY id',
    params: ['cash']
  }])
  assert.equal(redisCalls.length, 0)
})

test('GET /entries/by-account/:account keeps a quote in the account out of the SQL text', async () => {
  await fetch(base + '/entries/by-account/' + encodeURIComponent("x' OR '1'='1"))
  assert.equal(pgCalls[0].text,
    'SELECT id, account, amount_cents, memo, created_at FROM entries WHERE account = $1 ORDER BY id')
  assert.deepEqual(pgCalls[0].params, ["x' OR '1'='1"])
})

test("GET /entries/by-account/' OR '1'='1 returns no rows from other accounts", async () => {
  const all = [dbRow(1, 'cash', 100, 'a'), dbRow(2, 'bank', 200, 'b')]
  pgHandler = (text, params) => {
    assert.match(text, /WHERE account = \$1/)
    return { rows: all.filter((row) => row.account === params[0]) }
  }
  const r = await fetch(base + '/entries/by-account/' + encodeURIComponent("' OR '1'='1"))
  assert.equal(r.status, 200)
  assert.deepEqual(await r.json(), [])
})

test('GET /entries/by-account/:account returns an empty list for an unknown account', async () => {
  const r = await fetch(base + '/entries/by-account/none')
  assert.equal(r.status, 200)
  assert.deepEqual(await r.json(), [])
})

test('GET /entries/by-account/:account answers 500 with a generic error when Postgres fails', async () => {
  pgHandler = () => { throw new Error('bad sql') }
  const r = await quiet(() => fetch(base + '/entries/by-account/cash'))
  assert.equal(r.status, 500)
  assert.deepEqual(await r.json(), { error: 'internal error' })
})

// ---- POST /entries -----------------------------------------------------

test('POST /entries inserts in cents, invalidates entries:all and answers 201', async () => {
  pgHandler = () => ({ rows: [dbRow(5, 'cash', 1999, 'lunch')] })
  store.set('entries:all', '[]')
  const r = await post({ account: 'cash', amount: 19.99, memo: 'lunch' })
  assert.equal(r.status, 201)
  assert.deepEqual(await r.json(), { id: 5, account: 'cash', amount: 19.99, memo: 'lunch', createdAt: CREATED })
  assert.equal(pgCalls[0].text,
    'INSERT INTO entries (account, amount_cents, memo) VALUES ($1, $2, $3) RETURNING id, account, amount_cents, memo, created_at')
  assert.deepEqual(pgCalls[0].params, ['cash', 1999, 'lunch'])
  assert.deepEqual(redisCalls, [['del', 'entries:all']])
  assert.equal(store.has('entries:all'), false)
})

test('POST /entries stores a missing memo as null', async () => {
  pgHandler = () => ({ rows: [dbRow(1, 'cash', 100, null)] })
  await post({ account: 'cash', amount: 1 })
  assert.deepEqual(pgCalls[0].params, ['cash', 100, null])
})

test('POST /entries rounds the amount to whole cents', async () => {
  pgHandler = () => ({ rows: [dbRow(1, 'cash', 11, null)] })
  await post({ account: 'cash', amount: 0.105 })
  assert.equal(pgCalls[0].params[1], Math.round(0.105 * 100))
})

test('POST /entries answers 400 with every validation error and does not touch the stores', async () => {
  const r = await post({ amount: 'x', memo: 5 })
  assert.equal(r.status, 400)
  assert.deepEqual(await r.json(), {
    errors: ['account is required', 'amount must be a number', 'memo must be a string']
  })
  assert.equal(pgCalls.length, 0)
  assert.equal(redisCalls.length, 0)
})

test('POST /entries answers 400 for a blank account', async () => {
  const r = await post({ account: '   ', amount: 1 })
  assert.equal(r.status, 400)
  assert.deepEqual(await r.json(), { errors: ['account is required'] })
})

test('POST /entries answers 400 when the body is not an object', async () => {
  const r = await fetch(base + '/entries', { method: 'POST', body: 'hi', headers: { 'content-type': 'text/plain' } })
  assert.equal(r.status, 400)
  assert.deepEqual(await r.json(), { errors: ['account is required', 'amount must be a number'] })
})

test('POST /entries answers 500 with a generic error when the insert fails and keeps the cache', async () => {
  pgHandler = () => { throw new Error('insert failed') }
  store.set('entries:all', '[]')
  const r = await quiet(() => post({ account: 'cash', amount: 1 }))
  assert.equal(r.status, 500)
  assert.deepEqual(await r.json(), { error: 'internal error' })
  assert.equal(store.has('entries:all'), true)
})

test('malformed JSON goes to the app error handler: 400 with a generic message and no detail', async () => {
  const r = await quiet(() => post(null, '{"account":'))
  const body = await r.json()
  assert.equal(r.status, 400)
  assert.deepEqual(body, { error: 'bad request' })
  assert.equal(body.detail, undefined)
})

// ---- GET /entries/balance/:account ------------------------------------

test('GET /entries/balance/:account sums amount_cents and returns decimals', async () => {
  pgHandler = () => ({ rows: [{ amount_cents: 1250 }, { amount_cents: -250 }, { amount_cents: 1 }] })
  const r = await fetch(base + '/entries/balance/cash')
  assert.equal(r.status, 200)
  assert.deepEqual(await r.json(), { account: 'cash', balance: 10.01 })
  assert.deepEqual(pgCalls, [{ text: 'SELECT amount_cents FROM entries WHERE account = $1', params: ['cash'] }])
})

test('GET /entries/balance/:account is 0 for an account without rows', async () => {
  const body = await (await fetch(base + '/entries/balance/ghost')).json()
  assert.deepEqual(body, { account: 'ghost', balance: 0 })
})

test('GET /entries/balance/:account answers 500 with a generic error when Postgres fails', async () => {
  pgHandler = () => { throw new Error('sum failed') }
  const r = await quiet(() => fetch(base + '/entries/balance/cash'))
  assert.equal(r.status, 500)
  assert.deepEqual(await r.json(), { error: 'internal error' })
})

// ---- /health -----------------------------------------------------------

test('GET /health is 200 {db: ok, cache: ok} when both stores answer', async () => {
  const r = await fetch(base + '/health')
  assert.equal(r.status, 200)
  assert.deepEqual(await r.json(), { db: 'ok', cache: 'ok' })
  assert.deepEqual(pgCalls, [{ text: 'SELECT 1', params: [] }])
  assert.deepEqual(redisCalls, [['ping']])
})

test('GET /health is 503 with db error when Postgres fails, and still pings the cache', async () => {
  pgHandler = () => { throw new Error('db down') }
  const r = await fetch(base + '/health')
  assert.equal(r.status, 503)
  assert.deepEqual(await r.json(), { db: 'error', cache: 'ok' })
})

test('GET /health is 503 with cache error when Redis fails', async () => {
  redisFail.ping = new Error('redis down')
  const r = await fetch(base + '/health')
  assert.equal(r.status, 503)
  assert.deepEqual(await r.json(), { db: 'ok', cache: 'error' })
})

test('GET /health is 503 with both errors when both stores fail', async () => {
  pgHandler = () => { throw new Error('db down') }
  redisFail.ping = new Error('redis down')
  const r = await fetch(base + '/health')
  assert.equal(r.status, 503)
  assert.deepEqual(await r.json(), { db: 'error', cache: 'error' })
})
