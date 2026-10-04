import express from 'express'
import helmet from 'helmet'
import { rateLimit } from 'express-rate-limit'
import { STATUS_CODES } from 'node:http'
import entries from './routes/entries.js'
import health from './routes/health.js'

export function createApp(options = {}) {
  const app = express()
  app.use(helmet())
  app.use(express.json())
  const entriesLimiter = rateLimit({
    windowMs: options.rateLimitWindowMs || 15 * 60 * 1000,
    limit: options.rateLimitMax || 100,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'too many requests' }
  })
  app.use('/entries', entriesLimiter, entries)
  app.use('/health', health)
  app.use(function (err, req, res, next) {
    console.error(err)
    const status = err && (err.status || err.statusCode)
    if (status >= 400 && status < 500) {
      return res.status(status).json({ error: (STATUS_CODES[status] || 'bad request').toLowerCase() })
    }
    res.status(500).json({ error: 'internal error' })
  })
  return app
}
