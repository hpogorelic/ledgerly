import express from 'express'
import bodyParser from 'body-parser'
import entries from './routes/entries.js'
import health from './routes/health.js'

export function createApp() {
  const app = express()
  app.use(bodyParser.json())
  app.use('/entries', entries)
  app.use('/health', health)
  app.use(function (err, req, res, next) {
    console.log(err)
    res.status(500).json({ error: 'internal error', detail: err.stack })
  })
  return app
}
