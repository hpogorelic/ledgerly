import pg from 'pg'

var pool = null

export function getPool() {
  if (!pool) {
    pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
  }
  return pool
}

export function query(text, params, cb) {
  getPool().query(text, params, function (err, res) {
    if (err) return cb(err)
    cb(null, res)
  })
}

export function queryAsync(text, params) {
  return new Promise(function (resolve, reject) {
    getPool().query(text, params, function (err, res) {
      if (err) return reject(err)
      resolve(res)
    })
  })
}
