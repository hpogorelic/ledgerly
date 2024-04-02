import { test, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { createApp } from '../src/app.js'
import { queryAsync, getPool } from '../src/db/pool.js'
import { getCache } from '../src/db/cache.js'

let server, base

before(async () => {
  await queryAsync('CREATE TABLE IF NOT EXISTS entries (id SERIAL PRIMARY KEY, account TEXT NOT NULL, amount_cents INTEGER NOT NULL, memo TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT now())', [])
  await queryAsync('TRUNCATE entries RESTART IDENTITY', [])
  await getCache().flushdb()
  server = createApp().listen(0)
  base = 'http://127.0.0.1:' + server.address().port
})

after(async () => {
  server.close()
  await getPool().end()
  getCache().disconnect()
})

test('health reports db and cache', async () => {
  const r = await fetch(base + '/health')
  assert.equal(r.status, 200)
  assert.deepEqual(await r.json(), { db: 'ok', cache: 'ok' })
})

test('creates and lists entries', async () => {
  const r = await fetch(base + '/entries', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ account: 'cash', amount: 12.5, memo: 'coffee' }) })
  assert.equal(r.status, 201)
  const list = await (await fetch(base + '/entries')).json()
  assert.equal(list.length, 1)
  assert.equal(list[0].amount, 12.5)
})

test('rejects invalid entries', async () => {
  const r = await fetch(base + '/entries', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ amount: 'x' }) })
  assert.equal(r.status, 400)
})

test('balance sums an account', async () => {
  await fetch(base + '/entries', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ account: 'cash', amount: -2.5 }) })
  const b = await (await fetch(base + '/entries/balance/cash')).json()
  assert.equal(b.balance, 10)
})
