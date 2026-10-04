import { query, getPool } from '../src/db/pool.js'

await query(`CREATE TABLE IF NOT EXISTS entries (
  id SERIAL PRIMARY KEY,
  account TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  memo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
)`, [])
await getPool().end()
console.log('migrated')
