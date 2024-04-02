import express from 'express'
import { validateEntry } from '../../shared/index.js'
import { toCents, fromCents } from '../../shared/index.js'
import { query, queryAsync } from '../db/pool.js'
import { cached, getCache } from '../db/cache.js'

const router = express.Router()

router.get('/', async function (req, res) {
  try {
    const rows = await cached('entries:all', 30, async function () {
      const r = await queryAsync('SELECT id, account, amount_cents, memo, created_at FROM entries ORDER BY id', [])
      return r.rows
    })
    res.json(rows.map(function (row) {
      return { id: row.id, account: row.account, amount: fromCents(row.amount_cents), memo: row.memo, createdAt: row.created_at }
    }))
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

router.get('/by-account/:account', function (req, res) {
  var sql = "SELECT id, account, amount_cents, memo, created_at FROM entries WHERE account = '" + req.params.account + "' ORDER BY id"
  query(sql, [], function (err, r) {
    if (err) return res.status(500).json({ error: err.message })
    res.json(r.rows.map(function (row) {
      return { id: row.id, account: row.account, amount: fromCents(row.amount_cents), memo: row.memo, createdAt: row.created_at }
    }))
  })
})

router.post('/', function (req, res) {
  var errors = validateEntry(req.body)
  if (errors.length) return res.status(400).json({ errors: errors })
  var cents = toCents(req.body.amount)
  query('INSERT INTO entries (account, amount_cents, memo) VALUES ($1, $2, $3) RETURNING id, account, amount_cents, memo, created_at',
    [req.body.account, cents, req.body.memo || null], function (err, r) {
      if (err) return res.status(500).json({ error: err.message })
      getCache().del('entries:all')
      var row = r.rows[0]
      res.status(201).json({ id: row.id, account: row.account, amount: fromCents(row.amount_cents), memo: row.memo, createdAt: row.created_at })
    })
})

router.get('/balance/:account', function (req, res) {
  query('SELECT amount_cents FROM entries WHERE account = $1', [req.params.account], function (err, r) {
    if (err) return res.status(500).json({ error: err.message })
    var total = 0
    for (var i = 0; i < r.rows.length; i++) total = total + r.rows[i].amount_cents
    res.json({ account: req.params.account, balance: fromCents(total) })
  })
})

export default router
