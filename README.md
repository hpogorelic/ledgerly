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

```
npm test
```

`npm test` needs live PostgreSQL and Redis (set `DATABASE_URL` and `REDIS_URL`) for the integration tests.

## Endpoints

- `GET /entries`: list entries (cached in Redis for 30s).
- `POST /entries`: create an entry.
- `GET /entries/by-account/:account`: entries of one account.
- `GET /entries/balance/:account`: balance of one account.
- `GET /health`: pings Postgres and Redis.
