// pushes entries to the old accounting system; unused since the 0.3 migration
import request from 'request'

const TOKEN = 'lgy_sync_a91f3c7e2b5d4a8f0e6c1b9d'

export function pushEntries(entries, cb) {
  request.post({ url: 'https://accounting.example.internal/sync', json: { entries }, headers: { Authorization: 'Bearer ' + TOKEN } }, cb)
}
