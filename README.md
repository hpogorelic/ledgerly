# ledgerly

Ledger API (Express, PostgreSQL, Redis cache).

## Setup

```
git submodule update --init   # the routes import ../../shared
npm install
cp .env.example .env          # then fill in the passwords
docker-compose up             # starts db, cache and app
```

## Environment variables

- `DATABASE_URL`: PostgreSQL connection string.
- `REDIS_URL`: Redis connection string.
- `PORT`: HTTP port (default `3000`).

`.env.example` also lists `POSTGRES_PASSWORD` and `REDIS_PASSWORD`, which docker-compose reads. The app does not load `.env` itself: when running it on the host, export the variables first (or use `node --env-file=.env`), with `localhost` instead of `db` and `cache` as hosts.

## Run

```
npm run migrate   # create the entries table and index
npm start         # node src/server.js
npm run dev       # node --watch src/server.js
```

## Tests

The integration tests need live PostgreSQL and Redis, and they run `TRUNCATE entries` and `FLUSHDB` on whatever `DATABASE_URL` and `REDIS_URL` point to. Use a separate test database and a separate Redis DB index, never your development data.

1. Start the stores first:

   ```
   docker compose up db cache
   ```

2. Create the test database once: `docker compose exec db createdb -U ledgerly ledgerly_test`.
3. Copy the example file and fill in the passwords: `cp .env.test.example .env.test` (it points at `ledgerly_test` and Redis DB index `1` on `localhost`).
4. Run the tests with that file loaded:

   ```
   npm run test:env   # node --env-file=.env.test --test
   ```

Where `DATABASE_URL` and `REDIS_URL` are already exported (for example in CI), plain `npm test` works:

```
npm test
```

## Endpoints

- `GET /entries`: list entries (cached in Redis for 30s).
- `POST /entries`: create an entry.
- `GET /entries/by-account/:account`: entries of one account.
- `GET /entries/balance/:account`: balance of one account.
- `GET /health`: pings Postgres and Redis.
