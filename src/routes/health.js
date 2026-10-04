import express from 'express'
import { query } from '../db/pool.js'
import { getCache } from '../db/cache.js'

const router = express.Router()

router.get('/', async function (req, res) {
  const out = { db: 'unknown', cache: 'unknown' }
  try { await query('SELECT 1', []); out.db = 'ok' } catch (e) { out.db = 'error' }
  try { await getCache().ping(); out.cache = 'ok' } catch (e) { out.cache = 'error' }
  res.status(out.db === 'ok' && out.cache === 'ok' ? 200 : 503).json(out)
})

export default router
