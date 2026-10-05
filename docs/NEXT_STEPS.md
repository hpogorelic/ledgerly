# Next steps

Hand-off for the run on branch `showtime/33769bb5`, which started from `4edd33c`.

Every approved ticket was done. The only items not done are the three decisions that nobody answered at the gate, and the one ticket that waits on one of them.

## What was done

### Tier 0

- Parameterise the SQL query in GET /entries/by-account/:account (`d6daad4`)

### Tier 1

- Add characterization tests for entries routes, health and the cache helper (`0b36eef`)
- Add characterization tests for app.js middleware and error handler (`75bfb21`)
- Replace callback pg wrappers with one promise query and async routes (`70af57e`)
- Compute account balance with SQL SUM and index entries(account) (`3406b46`)
- Move docker-compose secrets to .env, add healthchecks and pin postgres (`0516703`)
- Fix the README commands and document setup, env vars, migrate and tests (`6838e70`)
- Isolate and document the test environment for Postgres and Redis (`1e48bef`)
- Replace body-parser with express.json() and drop the dependency (`6995689`)
- Add ESLint with a flat config and a lint script (`8b65254`)
- Pin Node 24 in .nvmrc, engines, CI, and the Dockerfile (`861f6da`)
- Add a GitHub Actions workflow that installs and runs the tests (`282a525`)
- Delete dead src/legacy-sync.js and remove the deprecated request package (`7143bde`)
- Modernise the Dockerfile: Node 24 slim, npm ci, non-root user, .dockerignore (`20371f2`)
- Extract a single toEntryDto mapper in the entries router (`ead0e63`)
- Remove the stale vendor/reports submodule entry from .gitmodules (`1fa4010`)
- Untrack server.log and ignore log files (`3390b33`)

### Tier 2

- Stop leaking stack traces and DB errors; add security headers and rate limiting (`7ce0ff8`)
- Upgrade ioredis from 4 to 6, one major at a time (`fcbae97`). The commit moved ioredis from 4.28.5 to 5.11.1.

### Tier 3

- express 4.17.1 has 6 advisories (high), fixed by upgrading express to 4.22.3 or later (`3fe5ee8`). The commit moved express from 4.17.1 to 5.2.1.

### Scorecard (before → now)

- Tests: 4 → 60, all passing.
- Audit advisories: 11 (2 critical, 4 high) → 0.
- Lint, CI and a Node pin: all were missing and are now configured.
- Outdated majors: 3 → 1.
- Duplication: 5.2% → 0%. Dead-code files: 1 → 0.
- Findings: critical 1, high 6, medium 10, low 20 → medium 1, low 1.

## What requires setup

- Copy `.env.example` to `.env` and set `POSTGRES_PASSWORD`, `REDIS_PASSWORD`, `DATABASE_URL` and `REDIS_URL`; you supply these values. The passwords inside the two URLs must match the two password variables. `docker-compose.yml` no longer holds literal credentials, so `docker compose up` reads them from this untracked `.env` (`0516703`).
- Rotate the Redis and Postgres passwords. The old values stay in Git history (`0516703`).
- Revoke the bearer token for the accounting system that `src/legacy-sync.js` used to hold. Deleting the file leaves the token in Git history, so revoking it is the step that closes the leak (`7143bde`).

## Behaviour changes

- **SQL injection closed.** On `GET /entries/by-account/:account`, an account that contains a quote or SQL fragments is now matched literally. It returns an empty list (or only the matching rows) instead of injecting SQL or answering 500 (`d6daad4`).
- **Generic 500 responses.** 500 responses from the error handler and the `/entries` routes now carry only `{ error: 'internal error' }`, with no stack and no DB or Redis message. Errors are logged with `console.error` (`7ce0ff8`).
- **Body-parser errors keep their 4xx status.** Malformed or non-object JSON returns 400 `{ error: 'bad request' }`. An oversized body returns 413 `{ error: 'payload too large' }`. Both used to return a 500 with a stack (`7ce0ff8`).
- **Security headers.** Every response carries helmet's security headers (CSP, HSTS, X-Content-Type-Options, X-Frame-Options and others) and no longer carries `X-Powered-By` (`7ce0ff8`).
- **Rate limit on `/entries`.**
  - The limit is per IP: by default 100 requests per 15 minutes, with RateLimit draft-7 headers.
  - A request over the limit gets 429 `{ error: 'too many requests' }`.
  - `createApp` accepts the optional `{ rateLimitWindowMs, rateLimitMax }` to override the defaults (`7ce0ff8`).
- **POST /entries waits for the cache delete.** It now waits for the Redis delete of `entries:all` before it replies 201. If that delete fails, the route answers 500 `internal error` even though the row was inserted (`70af57e`).
- **`toCents` errors.** In POST, `toCents` now runs inside the `try` block, so an exception from it becomes the generic 500 (`70af57e`).
- **Compose stack.**
  - It needs a local `.env` to start, and `app` no longer loads `.env.local`.
  - Postgres is pinned to 16 instead of the floating `latest` tag.
  - `app` waits until `db` and `cache` are healthy before it starts (`0516703`).
- **Node 24.**
  - The Docker image runs on Node 24 instead of Node 18, and `engines.node` declares `>=24` (`861f6da`).
  - The image is `node:24-slim` and installs production dependencies only, from the lockfile.
  - The container runs as the non-root `node` user and starts with `node src/server.js` directly, not `npm start` (`20371f2`).

## Decisions still open

Nobody answered these three decisions at the gate. Each one is recorded with the plan's recommendation:

1. "GET /entries returns and caches the whole table. Paginate it now, even though this changes the response shape for existing clients?" (Tier 2): **open**. Recommended answer: "Paginate GET /entries with limit/after_id (g13)".
2. "Should /entries require authentication? g8 adds headers, rate limiting and safe errors, but no auth." (Tier 1): **open**. Recommended answer: "Yes: write a separate auth ticket after this roadmap".
3. "Express 4.17.1 is a major behind. Plan the move to Express 5 (async errors forwarded to the error handler)?" (Tier 1): **open**. Recommended answer: "Plan Express 5 as its own Tier 3 upgrade after this roadmap". Commit `3fe5ee8` has already moved express to 5.2.1, so this decision should be checked against the code as it stands now.

## Deferred, blocked or dropped

- **Deferred:** none. The only Tier 3 item, the express advisories, was done. The plan names no item over the cost ceiling.
- **Blocked:** "Add keyset pagination to GET /entries and stop caching the whole table" (Tier 2). It waits for decision 1 above.
- **Dropped:** none.

## Known limitations

- The `app` service in `docker-compose.yml` was not started during the run, because it is built from the repository (`build: .`). Only the code paths covered by `npm test` were verified.
- Build health is unknown, because the project has no build step.
- One dependency is still a major version behind.
- One medium finding and one low finding remain.

## Suggested order for the remaining work

The plan lists no remaining tickets beyond the open decisions. This order follows the plan:

1. Answer "GET /entries returns and caches the whole table. Paginate it now, even though this changes the response shape for existing clients?". If the answer is yes, do "Add keyset pagination to GET /entries and stop caching the whole table".
2. Answer "Should /entries require authentication? g8 adds headers, rate limiting and safe errors, but no auth.".
3. Answer "Express 4.17.1 is a major behind. Plan the move to Express 5 (async errors forwarded to the error handler)?". Take into account that express is already at 5.2.1.
