import express from 'express'
import { validateEntry } from '../../shared/index.js'
import { toCents, fromCents } from '../../shared/index.js'
import { query } from '../db/pool.js'
import { cached, getCache } from '../db/cache.js'

const router = express.Router()

const ENTRY_COLUMNS = 'id, account, amount_cents, memo, created_at'

function toEntryDto(row) {
  return { id: row.id, account: row.account, amount: fromCents(row.amount_cents), memo: row.memo, createdAt: row.created_at }
}

function internalError(res, err) {
  console.error(err)
  res.status(500).json({ error: 'internal error' })
}

router.get('/', async function (req, res) {
  try {
    const rows = await cached('entries:all', 30, async function () {
      const r = await query(`SELECT ${ENTRY_COLUMNS} FROM entries ORDER BY id`, [])
      return r.rows
    })
    res.json(rows.map(toEntryDto))
  } catch (e) {
    internalError(res, e)
  }
})

router.get('/by-account/:account', async function (req, res) {
  try {
    const r = await query(`SELECT ${ENTRY_COLUMNS} FROM entries WHERE account = $1 ORDER BY id`, [req.params.account])
    res.json(r.rows.map(toEntryDto))
  } catch (e) {
    internalError(res, e)
  }
})

router.post('/', async function (req, res) {
  // express.json() leaves req.body undefined when the body was not parsed (body-parser 1.19 left {})
  const errors = validateEntry(req.body ?? {})
  if (errors.length) return res.status(400).json({ errors: errors })
  try {
    const cents = toCents(req.body.amount)
    const r = await query(`INSERT INTO entries (account, amount_cents, memo) VALUES ($1, $2, $3) RETURNING ${ENTRY_COLUMNS}`,
      [req.body.account, cents, req.body.memo || null])
    await getCache().del('entries:all')
    res.status(201).json(toEntryDto(r.rows[0]))
  } catch (e) {
    internalError(res, e)
  }
})

router.get('/balance/:account', async function (req, res) {
  try {
    const r = await query('SELECT COALESCE(SUM(amount_cents),0)::bigint AS total FROM entries WHERE account = $1', [req.params.account])
    res.json({ account: req.params.account, balance: fromCents(Number(r.rows[0].total)) })
  } catch (e) {
    internalError(res, e)
  }
})

export default router
