# ledgerly

A small ledger API built with Express, PostgreSQL, and a Redis cache.

## Setup

Prerequisites: Node 24 (pinned in `.nvmrc` and `engines`), Docker with Compose for the stack.

```
git submodule update --init   # the routes import ../../shared
npm ci
cp .env.example .env          # then fill in the values (see below)
docker compose up             # starts db, cache and app
```

`docker-compose.yml` holds no credentials: it reads `POSTGRES_PASSWORD` (db), `REDIS_PASSWORD` (cache), `DATABASE_URL` and `REDIS_URL` (app) from the untracked `.env`. Set all four before `docker compose up`; the passwords inside the two URLs must match the two password variables. The app waits for db and cache to be healthy before starting.

The Redis and Postgres passwords that used to be committed stay in Git history: rotate them and set the new values. The bearer token of the removed `src/legacy-sync.js` also stays in history: revoke it on the accounting system.

## Environment variables

- `DATABASE_URL`: PostgreSQL connection string.
- `REDIS_URL`: Redis connection string (the compose Redis requires a password, so include `REDIS_PASSWORD` in it).
- `PORT`: HTTP port (default `3000`).

`.env.example` also lists `POSTGRES_PASSWORD` and `REDIS_PASSWORD`, which docker-compose reads. The app does not load `.env` itself: when running it on the host, export the variables first (or use `node --env-file=.env`), with `localhost` instead of `db` and `cache` as hosts.

## Run

```
npm run migrate   # create the entries table and index
npm start         # node src/server.js
npm run dev       # node --watch src/server.js
npm run lint      # eslint .
```

There is no build step.

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

`/entries` is rate limited per IP (default 100 requests per 15 minutes; over the limit it answers 429). Server errors answer 500 `{ "error": "internal error" }` without details.

## Development environment

`.devcontainer/devcontainer.json` (generated) opens the project in a Node 24 container, runs `npm ci` after creation, and sets `DATABASE_URL`, `REDIS_URL` and `PORT` pointing at the compose hosts `db` and `cache`. Replace the Redis password placeholder in `REDIS_URL` with your own `REDIS_PASSWORD`.
