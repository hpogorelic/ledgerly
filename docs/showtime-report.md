# Showtime report: ledgerly

|  |  |
| --- | --- |
| Repository | /Users/hpogorelic/Desktop/showtime-examples/ledgerly (local checkout) |
| Commit | 4edd33c |
| Branch | showtime/33769bb5 |
| Pipeline | full |
| Status | completed |
| Started | 2026-10-04T14:17:34.966Z |
| Ended | 2026-10-04T19:44:56.871Z |
| Active time | 87 min |
| Run | 33769bb5-8abe-4115-8af6-7eb86ec95dce |

## Setup required

Before using the result:

1. Copy .env.example to .env and set POSTGRES_PASSWORD, REDIS_PASSWORD, DATABASE_URL and REDIS_URL. The passwords inside the two URLs must match the two password variables. Rotate the Redis and Postgres passwords, because the old values stay in Git history. docker-compose.yml no longer holds any literal credentials, so `docker compose up` needs these values from an untracked .env. (Move docker-compose secrets to .env, add healthchecks and pin postgres, 0516703)
2. Set DATABASE_URL in an untracked .env before `docker compose up`: docker-compose.yml now reads it (used by app). It replaced a literal value written in docker-compose.yml. (Move docker-compose secrets to .env, add healthchecks and pin postgres, 0516703)
3. Set POSTGRES_PASSWORD in an untracked .env before `docker compose up`: docker-compose.yml now reads it (used by db). It replaced the local default written in docker-compose.yml; any value works for development. (Move docker-compose secrets to .env, add healthchecks and pin postgres, 0516703)
4. Set REDIS_PASSWORD in an untracked .env before `docker compose up`: docker-compose.yml now reads it (used by cache). It replaced a real-looking value written in docker-compose.yml, which stays in the Git history: rotate it and set the new one. (Move docker-compose secrets to .env, add healthchecks and pin postgres, 0516703)
5. Set REDIS_URL in an untracked .env before `docker compose up`: docker-compose.yml now reads it (used by app). It replaced a literal value written in docker-compose.yml. (Move docker-compose secrets to .env, add healthchecks and pin postgres, 0516703)
6. Revoke the <redacted>... bearer token on the accounting system. The token stays in Git history after the file is deleted, so revoking it is the step that closes the leak. (Delete dead src/legacy-sync.js and remove the deprecated request package, 7143bde)

## Summary

Before using the result, 6 setup steps are needed: copy the example environment file and fill in the database and cache passwords and connection addresses, rotate those passwords because the old values remain in the project history, and revoke a leaked access token on the accounting system. The run completed 20 tickets of security, dependency, testing and housekeeping work, plus 3 documentation tickets. The most important change for security is that looking up ledger entries by account no longer allows SQL injection, and error responses no longer reveal internal details; security headers and per-visitor rate limiting were also added. Second, an unused file containing a hard-coded access token was deleted together with a deprecated library, and the web framework and the cache client were upgraded. On the scorecard 15 measures got better and 0 got worse: security advisories fell from 11 to 0, tests grew from 4 to 60 with all passing, duplicated code fell from 5.2 percent to 0, and a linter, automated checks, a pinned Node version and valid README commands are now in place, while the test suite now takes longer to run. Nothing was deferred, blocked or dropped, but adding pagination to the entry list is waiting on an unanswered decision, the questions about requiring authentication and moving to the framework's next major version are still open, and 1 low-severity finding about an old pinned shared-code version was not made into a ticket. The documentation written includes an updated README covering setup, commands and the development environment, a new architecture overview with a diagram, and a next-steps hand-off that records the open decisions. The run took 87 minutes of active time and cost $7.16.

- Security advisories fell from 11 to 0.
- Tests grew from 4 to 60, all passing.
- SQL injection in the by-account ledger lookup was closed.
- 6 setup steps are required, including rotating passwords and revoking a leaked token.
- Pagination and authentication are still waiting on decisions.

## Health

| Area | Before | After | Why (after) |
| --- | --- | --- | --- |
| build | ⚪ unknown | ⚪ unknown | build.ok is unknown |
| tests | 🟢 green | 🟢 green | 60 tests, none failing |
| security | 🔴 red | 🟢 green | no critical, high, or moderate advisory |
| dependencies | 🟡 yellow | 🟡 yellow | 1 a major behind, 0 unused, 0 overlapping; the run added 5 package(s): @eslint/js, eslint, express-rate-limit, globals, helmet |
| alignment | ⚪ unknown | ⚪ unknown | alignment.framework is unknown |
| structure | 🟡 yellow | 🟢 green | 0% duplicated, 0 oversized modules, 0 unreachable files |
| docs | 🟡 yellow | 🟢 green | a README whose commands match the scripts |
| hygiene | 🔴 red | 🟢 green | lint true, ci true, node true |

## Scorecard

| Metric | Before | After | Change | Provenance |
| --- | --- | --- | --- | --- |
| install.ok | true | true |  | measured |
| install.durationMs | 556 | 556 |  | measured |
| install.cached | true | true |  | measured |
| build.ok | unknown | unknown |  | unknown |
| build.durationMs | unknown | unknown |  | unknown |
| build.warnings | unknown | unknown |  | unknown |
| tests.runner | node | node |  | measured |
| tests.total | 4 | 60 | +56 ✓ | measured |
| tests.passed | 4 | 60 | +56 ✓ | measured |
| tests.failed | 0 | 0 |  | measured |
| tests.skipped | 0 | 0 |  | measured |
| tests.failing |  |  |  | measured |
| tests.durationMs | 224 | 2907 | +2683 | measured |
| audit.critical | 2 | 0 | -2 ✓ | measured |
| audit.high | 4 | 0 | -4 ✓ | measured |
| audit.moderate | 2 | 0 | -2 ✓ | measured |
| audit.low | 3 | 0 | -3 ✓ | measured |
| audit.total | 11 | 0 | -11 ✓ | measured |
| serve.ok | true | true |  | measured |
| serve.readyMs | 174 | 174 |  | measured |
| serve.httpStatus | 200 | 200 |  | measured |
| lint.configured | false | true | changed ✓ | inferred |
| types.configured | false | false |  | inferred |
| types.strict | unknown | unknown |  | unknown |
| ci.configured | false | true | changed ✓ | inferred |
| node.pinned | false | true | changed ✓ | inferred |
| docs.readme_present | true | true |  | inferred |
| docs.readme_commands_valid | false | true | changed ✓ | inferred |
| deps.outdated_major | 3 | 1 | -2 ✓ | measured |
| deps.unused_declared | 0 | 0 |  | inferred |
| repo.size_files | 9 | 14 | +5 | inferred |
| repo.size_loc | 200 | 829 | +629 | inferred |
| alignment.framework | unknown | unknown |  | unknown |
| libs.overlapping | 1 | 0 | -1 ✓ | measured |
| dup.percent | 5.2 | 0 | -5.2 ✓ | measured |
| modules.oversized | 0 | 0 |  | measured |
| deadcode.files | 1 | 0 | -1 ✓ | measured |
| findings.by_severity | critical 1, high 6, medium 10, low 20, info 0 | critical 0, high 0, medium 1, low 1, info 0 | changed | measured |

15 better, 0 worse, 4 changed without a direction.

## Tickets

### Done (20)

| Tier | Ticket | Commit | Rounds |
| --- | --- | --- | --- |
| 1 | Add characterization tests for entries routes, health and the cache helper | 0b36eef | 1 |
| 0 | Parameterise the SQL query in GET /entries/by-account/:account | d6daad4 | 1 |
| 1 | Add characterization tests for app.js middleware and error handler | 75bfb21 | 1 |
| 3 | express 4.17.1 has 6 advisories (high), fixed by upgrading express to 4.22.3 or later | 3fe5ee8 | 1 |
| 2 | Stop leaking stack traces and DB errors; add security headers and rate limiting | 7ce0ff8 | 2 |
| 1 | Replace callback pg wrappers with one promise query and async routes | 70af57e | 1 |
| 1 | Compute account balance with SQL SUM and index entries(account) | 3406b46 | 1 |
| 1 | Move docker-compose secrets to .env, add healthchecks and pin postgres | 0516703 | 1 |
| 1 | Fix the README commands and document setup, env vars, migrate and tests | 6838e70 | 1 |
| 1 | Isolate and document the test environment for Postgres and Redis | 1e48bef | 2 |
| 1 | Replace body-parser with express.json() and drop the dependency | 6995689 | 1 |
| 1 | Add ESLint with a flat config and a lint script | 8b65254 | 1 |
| 1 | Pin Node 24 in .nvmrc, engines, CI, and the Dockerfile | 861f6da | 1 |
| 1 | Add a GitHub Actions workflow that installs and runs the tests | 282a525 | 1 |
| 1 | Delete dead src/legacy-sync.js and remove the deprecated request package | 7143bde | 1 |
| 2 | Upgrade ioredis from 4 to 6, one major at a time | fcbae97 | 1 |
| 1 | Modernise the Dockerfile: Node 24 slim, npm ci, non-root user, .dockerignore | 20371f2 | 1 |
| 1 | Extract a single toEntryDto mapper in the entries router | ead0e63 | 1 |
| 1 | Remove the stale vendor/reports submodule entry from .gitmodules | 1fa4010 | 1 |
| 1 | Untrack server.log and ignore log files | 3390b33 | 1 |

### Decisions at the gate (3)

- GET /entries returns and caches the whole table. Paginate it now, even though this changes the response shape for existing clients?: not answered at the gate
- Should /entries require authentication? g8 adds headers, rate limiting and safe errors, but no auth.: not answered at the gate
- Express 4.17.1 is a major behind. Plan the move to Express 5 (async errors forwarded to the error handler)?: not answered at the gate

### Awaiting a decision (1)

- **Add keyset pagination to GET /entries and stop caching the whole table** (Tier 2, awaiting decision)
  - Why: waits for the decision "GET /entries returns and caches the whole table. Paginate it now, even though this changes the response shape for existing clients?"

### Documentation (3)

| Ticket | Status | Commit |
| --- | --- | --- |
| Update README.md from the run: setup, commands, development environment | done | bbce735 |
| Write ARCHITECTURE.md with the module responsibilities and the diagram | done | b2e2f7a |
| Write docs/NEXT_STEPS.md: what was done, what is left, and in which order | done | 5d51e52 |

## Behaviour changes

- An account containing a quote or SQL fragments is now matched literally: it returns an empty list (or only matching rows) instead of injecting SQL or answering 500. This closes the SQL injection the ticket targets. (Parameterise the SQL query in GET /entries/by-account/:account)
- 500 responses from the error handler and from /entries routes now carry only { error: 'internal error' } (no detail/stack, no DB or Redis error message); errors are logged with console.error instead of console.log. Ticket: stop leaking stack traces and DB errors to clients. (Stop leaking stack traces and DB errors; add security headers and rate limiting)
- Body-parser errors keep their 4xx status with a generic message: malformed or non-object JSON returns 400 { error: 'bad request' } and an oversized body returns 413 { error: 'payload too large' } (previously 500 with a stack). Ticket: errors with a 4xx status are sent with that status and a generic message. (Stop leaking stack traces and DB errors; add security headers and rate limiting)
- All responses carry helmet's security headers (CSP, HSTS, X-Content-Type-Options, X-Frame-Options, ...) and no longer carry X-Powered-By. Ticket: add helmet and disable x-powered-by. (Stop leaking stack traces and DB errors; add security headers and rate limiting)
- /entries is rate limited per IP (default 100 requests per 15 minutes, RateLimit draft-7 headers); requests over the limit get 429 { error: 'too many requests' }. createApp accepts optional { rateLimitWindowMs, rateLimitMax } to override the defaults. Ticket: add express-rate-limit with a per-IP window on /entries; the options make the 429 test feasible. (Stop leaking stack traces and DB errors; add security headers and rate limiting)
- POST /entries now waits for the Redis delete of entries:all before replying 201. If that delete fails, the route answers 500 'internal error' even though the row was inserted. Before, the delete was fire-and-forget and the client got 201. The ticket asks for `await getCache().del('entries:all')` before the 201, so a following list never reads a stale cache. (Replace callback pg wrappers with one promise query and async routes)
- In POST, `toCents` now runs inside the try block, so an exception from it becomes the generic 500. Same error handling in every route. (Replace callback pg wrappers with one promise query and async routes)
- The compose stack needs a local .env to start, and app no longer loads .env.local. postgres is pinned to 16 instead of the floating latest tag. app now waits for db and cache to be healthy before starting. This is what the ticket asks for: no secrets in Git, a reproducible Postgres version, and no app start against services that are not ready. (Move docker-compose secrets to .env, add healthchecks and pin postgres)
- Docker image now runs on Node 24 instead of Node 18; engines.node now declares >=24. Ticket requires Node 24 everywhere the project names a Node version. (Pin Node 24 in .nvmrc, engines, CI, and the Dockerfile)
- The container now runs as the non-root `node` user and starts with `node src/server.js` directly instead of `npm start`. The image is `node:24-slim` and installs production dependencies only, from the lockfile. Requested by the ticket: removes the root user, avoids the npm wrapper process, and makes the build reproducible and smaller. (Modernise the Dockerfile: Node 24 slim, npm ci, non-root user, .dockerignore)

## Findings not turned into tickets

1 finding(s) no ticket covers:

- [low configuration] Submodule shared is pinned to a commit 937 days old (`.gitmodules:1`)

## Limitations

- external service: service app from docker-compose.yml was not started: it is built from the repository (build: .)

## Cost

About $7.16 of model usage (approximate, from the configured prices); $7.02 before this report's narrative was written. Cache hit ratio 80.7%: the share of input tokens read from the prompt cache.

| Role | Cost |
| --- | --- |
| explorer | $0.08 |
| analyst | $0.58 |
| tech_lead | $0.73 |
| qa | $0.29 |
| reviewer | $2.20 |
| developer | $2.21 |
| tech_writer | $1.07 |

| Phase | Cost |
| --- | --- |
| exploration | $0.08 |
| analysis | $0.58 |
| roadmap | $0.73 |
| fixing | $4.32 |
| documentation | $1.02 |
| report | $0.44 |

## Time

| Phase | Duration | Outcome |
| --- | --- | --- |
| exploration | 1 min | completed |
| baseline | 10 s | completed |
| analysis | 3 min | completed |
| roadmap | 5 min | completed |
| awaiting_approval | 9 min (waiting) | completed |
| fixing | 35 min | completed |
| documentation | 44 min | completed |
| report | 17 s | completed |

## Escalations

- express 4.17.1 has 6 advisories (high), fixed by upgrading express to 4.22.3 or later, round 1: claude-sonnet-5-5 → claude-opus-5-5 (tier 3 tickets start on the strong model (FIXLOOP_STRONG_FROM_TIER=3))
- Stop leaking stack traces and DB errors; add security headers and rate limiting, round 2: claude-sonnet-5-5 → claude-opus-5-5 (round 2 follows 1 rejected round(s) (FIXLOOP_ESCALATE_AFTER_ROUND=1))
- Isolate and document the test environment for Postgres and Redis, round 2: claude-sonnet-5-5 → claude-opus-5-5 (round 2 follows 1 rejected round(s) (FIXLOOP_ESCALATE_AFTER_ROUND=1))

## Model policy

| Role | Models |
| --- | --- |
| explorer | claude-sonnet-5-5 |
| analyst | claude-opus-5-5 |
| tech_lead | claude-opus-5-5 |
| qa | claude-sonnet-5-5 |
| reviewer | claude-opus-5-5 |
| developer | claude-opus-5-5, claude-sonnet-5-5 |
| tech_writer | claude-opus-5-5 |

## Artifacts

Branch `showtime/33769bb5`: 25 commit(s) on 4edd33c.

- 0b36eef test: characterize entries routes, health, cache and pool helpers
- d6daad4 fix: parameterise SQL in GET /entries/by-account/:account
- 75bfb21 test: add characterization tests for app.js middleware and errors
- 3fe5ee8 fix(deps): upgrade express 4.17.1 to 5.2.1 to clear advisories
- 7ce0ff8 fix(security): hide error details, add helmet and rate limiting
- 70af57e refactor: use one promise query and async/await entries routes
- 3406b46 perf: compute balance with SQL SUM and index entries(account)
- 0516703 fix: move compose secrets to .env, add healthchecks, pin postgres 16
- 6838e70 docs: fix README commands, add dev script and setup docs
- 1e48bef test: document an isolated Postgres/Redis test environment
- 6995689 refactor: use express.json() and drop body-parser dependency
- 8b65254 chore: add ESLint flat config and lint script
- 861f6da chore: pin Node 24 in .nvmrc, engines and Dockerfile
- 282a525 ci: add GitHub Actions workflow running lint, migrate and tests
- 7143bde chore(deps): delete dead legacy-sync.js and remove deprecated request
- fcbae97 chore(deps): upgrade ioredis from 4.28.5 to 5.11.1
- 20371f2 chore(docker): use node:24-slim, npm ci, non-root user, .dockerignore
- ead0e63 refactor: extract toEntryDto mapper and ENTRY_COLUMNS in entries router
- 1fa4010 chore: remove stale vendor/reports entry from .gitmodules
- 3390b33 chore: untrack server.log and ignore log and env files
- bbce735 docs: update README setup, commands and development environment
- b2e2f7a docs: add ARCHITECTURE.md with modules, data flow and diagram
- 5d51e52 docs: add NEXT_STEPS hand-off with outcomes, setup and open decisions
- b630a7d docs: add the Showtime run report
- b9f16fd docs: update the Showtime run report from a new measurement

Files (`run:export <run> --dir <path>`): `showtime-33769bb5.bundle`, `showtime-33769bb5.patch`, `report.md`, `report.json`.

Documentation: `README.md`, `.devcontainer/devcontainer.json`, `ARCHITECTURE.md`, `docs/NEXT_STEPS.md`, `docs/showtime-report.md`.
