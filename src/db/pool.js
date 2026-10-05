import pg from 'pg'

var pool = null

export function getPool() {
  if (!pool) {
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
  }
  return pool
}

export const query = (text, params) => getPool().query(text, params)
