# Bounded product-help chatbot

This FastAPI service is disabled by default. It provides public skincare product help using catalog names only. It cannot access customer accounts/orders or execute tools. CORS and an Origin allowlist are browser controls, not authentication; the shared quotas are required even when callers can forge an Origin header.

## Runtime and installation

Use Python **3.12** (tested with 3.12.14) and MongoDB **5.0+**. MongoDB server UTC expressions drive rate windows and daily resets. For production, use a replica set with majority journaling enabled and durable storage; all quota writes explicitly use majority write concern. Do not use an ephemeral quota database in production.

```sh
python3.12 -m venv .venv
.venv/bin/python -m pip install --require-hashes -r requirements.txt
.venv/bin/python run.py
```

No DB/provider connections happen at import. Enabled startup initializes both Mongo clients, checks effective database privileges, and creates the quota expiry index. Missing configuration, unavailable Mongo, or excessive privileges fail startup. Provider credentials/model compatibility must be validated in a controlled deployment test; startup does not make a billable provider request. `GET /health` reports enabled state; a disabled `/chat` returns 503 without requiring credentials.

`requirements.in` contains bounded direct dependencies; `requirements.txt` pins every transitive dependency and SHA256 hash. `requirements-dev.txt` additionally includes pytest tools. Regenerate intentionally using Python 3.12 and `pip-tools==7.5.1`:

```sh
pip-compile --generate-hashes --strip-extras --output-file=requirements.txt requirements.in
pip-compile --generate-hashes --strip-extras --allow-unsafe --output-file=requirements-dev.txt requirements-dev.in
```

Review dependency changes and rerun tests before deploying regenerated locks. Do not install the unlocked `.in` files in production.

## Enabling and budgets

Inject environment variables from the deployment's secret store; the application does not load `.env` automatically. `.env.example` lists all required fields. Set `CHAT_ENABLED=true` only after testing. Production must use `APP_ENV=production` (the default).

Required controls:

- `OPENAI_API_KEY`, `CHAT_MODEL`: select the existing approved text Chat Completions model explicitly. No default model or automatic upgrade.
- `CHAT_TOKEN_PARAMETER`: defaults to `max_completion_tokens`; `max_tokens` is an explicit compatibility option for older non-reasoning models that require it. Unsupported parameters cause a bounded failed request; there is no automatic fallback/retry that might double charge. Verify compatibility for the configured model. The [Chat Completions API](https://developers.openai.com/api/reference/python/resources/chat/subresources/completions/methods/create) documents that `max_completion_tokens` includes reasoning and visible output; `max_tokens` does not support o-series models.
- `CHAT_ALLOWED_ORIGINS`: comma-separated exact HTTPS origins with no paths, wildcards, trailing slashes, or spaces.
- `CHAT_CATALOG_MONGODB_URI`, `CHAT_CATALOG_DB`: dedicated catalog credentials restricted to `find` on the `products` collection.
- `CHAT_QUOTA_MONGODB_URI`, `CHAT_QUOTA_DB`: a distinct user and database, shared by every service replica. Changing the quota database or clearing its data resets protection and must not be used as routine recovery.
- `CHAT_QUOTA_SECRET`: at least 32 random characters, identical across replicas. It HMACs IP addresses for rate keys; raw IPs are not stored. Rotation can reset per-IP windows, so coordinate it; the global budget still applies.
- `CHAT_DAILY_REQUESTS`: maximum 10,000; `CHAT_DAILY_TOKENS`: maximum 1,000,000,000; `CHAT_DAILY_COST_MICROUSD`: maximum 10,000,000,000. All are mandatory positive integers.
- `CHAT_INPUT_MICROUSD_PER_TOKEN` and `CHAT_OUTPUT_MICROUSD_PER_TOKEN`: mandatory positive integer upper bounds on the configured model's billed per-token rates, each at most 10,000. Round **up**, including any applicable premium tier. Numerically, a price of $2.50 per million tokens is 2.50 microdollars per token and must be configured as `3`. This is a unit-conversion example, not a claim about any model's current price. Recheck prices before enabling/changing the model.

Each accepted request atomically reserves **32,768 input + 500 output = 33,268 tokens**, before catalog/provider work. The fixed reserve is intentionally conservative. Validated message bytes, bounded catalog JSON, per-message overhead and a protocol allowance must fit the input reservation. The provider receives at most 500 output tokens, and returned text has an additional conservative 500-byte UTF-8 transport cap. All provider calls disable SDK retries and use a 20-second async deadline. See the [official Python SDK configuration](https://developers.openai.com/api/reference/python) for async clients, timeout and retry semantics.

The reserved microdollar cost per request is:

```text
32,768 × CHAT_INPUT_MICROUSD_PER_TOKEN
+ 500 × CHAT_OUTPUT_MICROUSD_PER_TOKEN
```

The daily allowance is the minimum of the request cap, `floor(daily_tokens / 33,268)`, and `floor(daily_cost / reserved_cost)`. For example, a request cap of 100 and token cap of 3,326,800 can permit up to 100 requests, provided the independently configured cost cap covers them. Reserve prices must cover the actual billing schedule; this service cannot bound currency expenditure if an operator configures an understated price or the provider changes it. Use a dedicated provider project/key and independent billing alerts as another control.

Quota reservations are never refunded after dependency failure, timeout, or ambiguous provider acceptance. This makes the upper bound conservative under retries/crashes. One atomic Mongo document holds the current UTC day's requests, tokens, and cost; every replica shares it. A budget/model fingerprint rejects inconsistent replicas for that day, preventing a replica with looser settings from expanding the allowance. Roll out configuration changes together; budget/model changes take effect on the next UTC day unless a separately reviewed accounting migration preserves consumed amounts. Never delete/reset the document to work around 429 responses.

## Database least privilege

Use distinct users with custom collection roles, not the store's application/admin credentials. Example role definitions for an operator with Mongo administration rights:

```javascript
use store
db.createRole({role: 'chatCatalogRead', privileges: [
  {resource: {db: 'store', collection: 'products'}, actions: ['find']}
], roles: []})
// Create a dedicated catalog user using a generated secret and this role.

use chat_controls
db.createCollection('chat_quota')
db.chat_quota.createIndex({expiresAt: 1}, {expireAfterSeconds: 0})
db.createRole({role: 'chatQuota', privileges: [
  {resource: {db: 'chat_controls', collection: 'chat_quota'},
   actions: ['find', 'insert', 'update', 'createIndex', 'listIndexes']}
], roles: []})
// Create a separate quota user using a different generated secret and this role.
```

Use authenticated TLS Mongo URIs for both users; keep quota storage outside the catalog database. Production startup runs `connectionStatus` with effective privileges and rejects broader collection/database/cluster privileges. Managed Mongo services that restrict this command or expose incompatible privilege metadata must be reviewed before enabling; startup intentionally fails closed rather than skipping the check.

Catalog reads use an async aggregation capped at 20 names, each truncated in Mongo to 80 characters. The client never fetches descriptions, customer documents, or arbitrary tool results. Query execution/socket timeouts are bounded.

Quota IP documents expire after two days. The daily document has no TTL and is reset atomically using Mongo server UTC time. Only budget counters, a configuration hash, and HMAC IP keys are stored; no conversation text, provider text, or API secrets enter quota storage/logs.

## Proxy and HTTP controls

Run the supplied `run.py`, which defaults to `127.0.0.1:8000`, one worker, access logging disabled, 32 in-flight ASGI requests, and five-second keepalive. Place it behind the intended reverse proxy; configure TLS, a 16KiB body cap, header/body-read timeouts, and coarse abuse limits there as well.

Forwarded headers are ignored by default. If proxy headers are needed, set `CHAT_TRUSTED_PROXY_IPS` to exact proxy IPs/CIDRs, for example `127.0.0.1/32`; wildcard trust is rejected. Restrict the listener/network so only those proxies can connect and ensure the proxy overwrites client-supplied forwarding headers. Never set `FORWARDED_ALLOW_IPS=*` or launch an alternate Uvicorn command that silently broadens trust. `CHAT_BIND_HOST=0.0.0.0` is appropriate only behind deployment network controls.

The ASGI request guard caps actual bytes at 16KiB **before JSON parsing**, including chunked requests and dishonest Content-Length. Body reading has a five-second deadline. Only exact allowed Origins and JSON POSTs reach chat validation. The message schema forbids extra fields, permits only user/assistant roles, requires a final user message, and limits history to 20 messages/4,000 characters total (300 per user message, 2,000 per assistant message).

The shared limiter permits five validated requests per IP per Mongo UTC minute, independent of replica count; client forwarding headers are not read by application code. Daily budget checks occur before catalog/provider work. Local provider concurrency is two per process, with excess work rejected immediately instead of queued. Rate/budget/concurrency exhaustion returns 429; disabled returns 503, invalid schema 422, body oversize 413, provider timeout 504, and dependency/provider failures 502. No customer input/output/secrets appear in audit messages.

## Tests and CI

```sh
python3.12 -m venv .venv
.venv/bin/python -m pip install --require-hashes -r requirements-dev.txt
.venv/bin/python -m pytest -q
.venv/bin/python -m compileall -q main.py config.py storage.py run.py
.venv/bin/python -m pip check
.venv/bin/python -m pip_audit --strict --disable-pip -r requirements.txt
```

Tests use real Mongo atomic operations and in-process FastAPI HTTP requests; only the provider boundary is faked. No live provider credentials are needed. Supply `CHAT_TEST_MONGO_URI` for a throwaway local MongoDB 5.0+ service in CI, or install the repository's backend Node dependencies first so `tests/mongo-fixture.cjs` can start `mongodb-memory-server`. The test fixture creates uniquely named catalog/quota databases; do not point it at production. Without an explicit URI, the local fixture downloads a test Mongo binary on first use and needs permission to start a loopback server. The Node fixture is test-only; production requires no Node runtime.

CI should use Python 3.12, install the hash lock, run the suite/compile checks, and audit the locked dependencies. The tests cover actual HTTP 429 behavior, disabled service, schema/roles/history, chunked pre-parse limits, Origin/proxy rules, conservative output parameters, concurrent quotas across independent clients, daily request/token/cost exhaustion, config drift, async cancellation, failure accounting, concurrency two, and bounded real catalog reads.

## Rollback and operations

Set `CHAT_ENABLED=false` to disable safely without deleting budget records. Keep quota storage persistent across service restarts/deployments. Do not return to the previous unbounded service while the frontend still exposes chat. Investigate generic `chat_provider_timeout`/`chat_dependency_failure` events using provider/database operational metrics; never add raw conversation or credential logging for diagnosis. A 429 can indicate normal configured allowance exhaustion; expanding budgets requires reviewing the corresponding worst-case cost first.
