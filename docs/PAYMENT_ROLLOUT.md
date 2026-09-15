# Payment and inventory rollout

## Required deployment order

1. Pause checkout and take a database backup. Reconcile existing paid Stripe sessions and inventory before enabling reservations: the previous implementation did not reliably deduct paid inventory. Inspect/drain old open sessions; do not infer Mongo catalog IDs from Stripe product IDs.
2. Use Node 24 and a MongoDB replica set (Atlas is supported) or transaction-capable sharded cluster. Standalone MongoDB is intentionally unsupported. Configure the database URI with the intended replica set. The service must not accept traffic before startup initialization succeeds.
3. Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `CLIENT_URL`, and `STRIPE_SHIPPING_RATE_ID`. To preserve the former shipping price, configure its existing rate ID, `shr_1SUdndPX0hvOLt0hhov3Mi1X`, after confirming it exists in the target Stripe account. Test and live rate IDs can differ. The server retrieves the rate, requires active fixed USD pricing, and snapshots its cents. There is no free-shipping fallback. Set `ADMIN_EMAIL`, `SENDGRID_API_KEY`, and `EMAIL_USER` for notifications.
4. After `mongoose.connect`, await `initializePaymentStorage()` from `src/services/payments.ts`. It verifies transaction topology and creates the declared indexes without dropping other indexes. It requires index-creation permissions. Any error must fail startup. Keep `POST /api/stripe/webhook` mounted before `express.json()` and exempt only that signed raw-body route from browser CSRF middleware.
5. After initialization, call `startPaymentWorkers()` once per process and retain its stop function for shutdown. Run it only in serving/worker processes, never during module import or unit tests. Multiple processes are supported; transaction state protects reconciliation and per-recipient leases protect outbox claims. The in-process interval runs every minute; worker downtime is recovered from Mongo on restart. A dedicated worker may instead call `reconcilePayments()` and `deliverNotifications()` every minute after connecting and initializing storage.
6. Deploy frontend and backend together. Every checkout POST must carry a UUID `Idempotency-Key`, persisted across network retries for the same cart. Generate a new key when the cart changes or the user deliberately starts a new checkout. Allow that header in CORS. Preserve the same key after HTTP 503. Do not automatically create fresh checkout keys on every error.
7. In Stripe test mode, verify a paid checkout, a canceled/expired checkout, a delayed payment, and webhook retries. Subscribe to `checkout.session.completed` and `checkout.session.async_payment_succeeded`. Expiry/failure events can also be subscribed; reconciliation checks Stripe directly before releasing inventory. Resume checkout only after all checks pass.

## State and reconciliation

The checkout snapshot is the durable reservation. Its `items` use Mongo catalog IDs and integer-cent unit prices. `Product.stock` now means **available stock**, excluding reservations. Every item decrement and checkout insert commits together. Fulfillment creates an order, transitions the reservation, records the provider event, and creates both recipient outbox rows in one transaction. Order `_id` is the Stripe session ID; Stripe metadata contains only the compact checkout ID.

Reservations last one hour. A successful creation retry reuses the same durable identity, item prices, email, URLs, expiry, shipping rate, and Stripe key. Creation retries are allowed during the initial 30 minutes because Stripe requires an expiry at least 30 minutes in the future. Past that boundary, callers must wait for reconciliation instead of silently creating a second session.

The worker retrieves expired-due sessions. It expires an open session and retrieves it again; only a provider-confirmed expired, unpaid session without an intent, or with a freshly retrieved canceled intent, may release inventory. Completed unpaid sessions and processing intents retain stock because delayed methods may settle later. It retries provider/database failures after five minutes. See Stripe's [session lifecycle](https://docs.stripe.com/api/checkout/sessions) and [expiration API](https://docs.stripe.com/api/checkout/sessions/expire).

A network failure can occur after Stripe created a session but before the server stored its ID. Clients can recover with the same key during the retry window, and a signed paid webhook can fulfill from the durable reference even before attachment. If the ID is still missing at expiry, the worker records `manual / ambiguous_session_creation` and holds inventory. It does not assume that no charge exists. An operator must locate the session using the checkout reference and confirm its final Stripe state before resolving the hold.

Admin `GET /api/orders/reconciliation` exposes up to 100 oldest manual checkouts, 100 oldest manual payment events, reservations still open more than 24 hours past expiry, and unsent notification count. It omits customer addresses and notification content. Inspect this queue each operating day and after deployment. To inspect all cases with authorized database access:

```javascript
db.checkouts.find({state: 'manual'}).sort({createdAt: 1})
db.paymentevents.find({state: 'manual'}).sort({createdAt: 1})
db.checkouts.find({state: {$in: ['open', 'reserved']}, expiresAt: {$lt: new Date(Date.now() - 86400000)}})
db.notifications.find({state: {$ne: 'sent'}}).sort({nextAttemptAt: 1})
```

Manual reasons include missing/invalid snapshots, ownership or amount mismatch, missing shipping/customer data, pre-existing legacy orders, and payment received after a released reservation. Paid events retain session/payment-intent IDs, amount, currency, and a reason. Do not simply change the manual state to paid or delete the event. Verify the Stripe payment, inventory and customer ownership, then either arrange a verified refund or perform a reviewed transactional correction that creates exactly one order and the required stock/outbox changes. There is intentionally no public override that can fabricate payment. Delayed payment after release is retained as a manual case and cannot oversell.

`GET /api/stripe/session/:sessionId` only reads a session already bound to the authenticated user's checkout. It never creates orders or sends mail. Missing legacy ownership returns 404. The success page can show provider payment state while the webhook is still creating the order.

## Fulfillment and customer compatibility

`paymentStatus` is provider-derived (`paid` for new verified orders, `unverified` for legacy documents read through Mongoose). `fulfillmentStatus` is separate. Admin transitions are pending → processing/shipped/cancelled, processing → shipped/cancelled, and shipped → delivered. Processing/shipping/delivery require verified payment. Delivered/cancelled are terminal. Repeating the current state is harmless. Cancellation here records fulfillment only: it does not issue a refund or replenish inventory. Follow a separately reviewed refund/return process.

The legacy `status`, dollar `total`, and dollar item `price` remain for existing readers, but are not evidence of payment. The order also carries integer `totalCents`, `shippingCents`, catalog `productId`, customer identity and complete provided shipping fields. Customer order listing is cursor-paginated: default/max `limit=100`, with returned `nextCursor` passed as `cursor` on the next request.

## Notifications

Outbox entries are per recipient and created with the order. SMTP is lazy and is never contacted at import. Customer and admin text is escaped in HTML; every message also contains plaintext. Failure schedules exponential backoff capped at one day. A worker claims a five-minute tokenized lease; crashes allow another worker to reclaim it. SMTP timeouts are bounded below the lease duration. Provider errors and customer PII are not logged.

Delivery is **at least once**: SMTP can accept a message immediately before a worker crashes, so a later retry can send a duplicate. Exactly-once external email cannot be guaranteed with this SMTP API. A successful customer delivery is not retried merely because the separate admin delivery failed. Rows are not TTL-deleted, including manual payment cases; set a reviewed data-retention policy that preserves unresolved cases.

## Legacy and rollback limitations

Old Stripe metadata lacks trusted inventory snapshots and does not establish safe ownership/catalog mapping. Paid legacy events are acknowledged only after a durable manual case is saved. Existing legacy orders are never overwritten, silently marked provider-paid, or used as a substitute for a checkout snapshot. Backfill only with separately verified records; expect manual reconciliation during cutover.

After reservations exist, rolling back to the old checkout/order implementation is unsafe: it does not understand reserved inventory and can duplicate fulfillment. If a rollback is needed, disable new checkout, keep the hardened webhook and worker running, reconcile/refund all outstanding sessions and holds, then perform a reviewed data migration before restoring older code. Never drop checkout/event/outbox collections or reset available stock while unresolved reservations exist.

## Verification

`cd backend && node -r ts-node/register --test test/payments.test.js` runs real MongoDB replica-set transactions and only fake Stripe/SMTP providers. `mongodb-memory-server` downloads a test binary on first run and needs loopback process permissions. `npm run build` verifies TypeScript. No live credentials or live payment/email calls are used by the tests.
