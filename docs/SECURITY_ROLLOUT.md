# Security rollout and operations

This branch requires a coordinated deployment. It deliberately rejects legacy login JWTs and fails startup when essential configuration or MongoDB transaction support is absent. Do not merge into an automatically deployed branch until the operator steps below are ready. No production credentials, roles, policies, or deployments were changed while preparing this PR.

## 1. Prepare staging and secrets

- Use Node 24 and Python 3.12 with committed lockfiles. Run the security workflow checks. CodeQL default setup was verified as enabled for JavaScript/TypeScript and Python; retain it and review its alerts before release.
- Use a MongoDB replica set or sharded cluster. Standalone MongoDB is intentionally rejected. The API account needs only its application database; remove cluster administration privileges. Enable encrypted transport, network allowlists/private access and backups at the provider.
- Take a database backup and demonstrate restoring it to an isolated database. Record the restore duration and operator. This cannot be established by code tests.
- Populate `backend/.env.example` fields through the deployment secret manager. `JWT_SECRET` now protects CSRF rather than login JWTs. Generate independent random secrets; `MFA_ENCRYPTION_KEY` is the canonical base64 of exactly 32 random bytes. Store an encrypted offline backup of that key; losing it prevents TOTP verification. Coordinate rotation with enrollment/recovery; replacing it alone locks administrators out.
- Keep the existing approved Stripe shipping-rate ID in `STRIPE_SHIPPING_RATE_ID`; the API retrieves and validates it. Verify its currency and amount in Stripe. Use test-mode keys for staging, and verify the webhook secret belongs to this endpoint/account.
- Configure a verified SendGrid sender (`EMAIL_USER`, default `noreply@eternalbotanic.com`) and `ADMIN_EMAIL`; verify SPF/DKIM/DMARC with the domain provider. Configure Cloudinary credentials separately. Never place provider secrets in `NEXT_PUBLIC_*` variables.
- Set `TRUST_PROXY` to the exact trusted ingress IPs or subnet list for the actual hosting topology. Never use `true`, arbitrary internet ranges or a numeric hop count. The outer ingress must overwrite untrusted forwarded headers and must prevent bypassing the trusted path. Test client IP accounting from two real clients and forged `X-Forwarded-For`. Node tests establish the untrusted-proxy default, not the hosting configuration.
- Account quotas also bound checkout creation to 10 requests per 15 minutes and combined admin product uploads to 20 per 15 minutes before provider/upload work. New sessions do not reset these account quotas.
- Set ingress body/time/rate limits and bot/WAF rules appropriate to actual traffic. Application limits use shared Mongo counters and fail closed on store failure; infrastructure still needs to absorb traffic before it reaches the application.

## 2. Session and administrator cutover

1. Schedule a short checkout/auth maintenance window. Old clients, JWTs and checkout sessions must not overlap an unplanned rollback.
2. Start the new API against staging first. Startup creates required unique/TTL indexes and verifies transaction support. Resolve existing duplicate/index conflicts before proceeding; do not silently drop uniqueness constraints.
3. Enroll every existing administrator from a private interactive terminal with the deployment environment loaded: `cd backend && npm run security:enroll-admin -- admin@example.com`. Add the displayed URI/key to an authenticator, confirm a code, and store the ten recovery codes offline. The script refuses to overwrite an existing enrollment. Do not run enrollment in CI, streamed terminals or shared logs.
4. Admin login requires password plus TOTP or a one-use recovery code. Unenrolled admins cannot log in. Recovery codes never remove the MFA requirement. If both authenticator and recovery codes are lost, an operator must verify identity through a separate trusted channel before a controlled re-enrollment; there is no public bypass endpoint.
5. All existing JWT sessions expire at cutover. New opaque sessions are stored as hashes in MongoDB. User sessions last 24 hours and admin sessions one hour. Logout revokes the copied session server-side. Password/email/MFA/role/disabled changes increment `authVersion`; requests load the current account on every authenticated request.
6. Supported Mongoose user writes maintain `authVersion`. Emergency raw database/collection writes bypass hooks: increment `authVersion` atomically on every security-state change and delete existing sessions. Never restore a role or re-enable an account by raw update without invalidating prior sessions.
7. Verify forgot/reset password and email-change links in a test mailbox. Tokens are single use, expire after 30 minutes and travel in URL fragments; email change requires reauthentication and confirmation. Existing account passwords remain valid; newly set passwords require at least 12 characters and at most 72 UTF-8 bytes.

## 3. Payments and inventory

Follow [PAYMENT_ROLLOUT.md](PAYMENT_ROLLOUT.md). Key release criteria:

- Successful, declined, cancelled, expired, delayed and duplicated Stripe test events create the expected single order. Refreshing the success page never creates an order.
- Concurrent purchases of the final unit cannot both reserve stock. Admin edits use the current inventory snapshot and must reload on conflict.
- Existing paid sessions without a new checkout snapshot enter manual reconciliation; never infer trustworthy prices or inventory from client metadata.
- Inspect `GET /api/orders/reconciliation` using an authenticated MFA administrator session. It lists bounded manual payment cases, stale reservations and notification backlog without full addresses. Configure an authenticated operator/dashboard check and alert when these accumulate. No external monitoring account was configured by this branch.
- Payment notifications retry durably with per-recipient leases. SMTP delivery is at least once, so an acknowledgement loss may cause a duplicate receipt. Refunds, cancellations after payment and manual cases require reconciliation with Stripe; changing fulfillment status does not refund or fabricate payment.

## 4. Browser and chatbot

- Build the frontend with the intended `API_INTERNAL_ORIGIN`. Same-origin `/api` requests are forwarded to the API. Check Secure/HttpOnly session cookies through the real HTTPS frontend/ingress, login/logout, account recovery, product uploads and checkout redirects.
- Nonce CSP uses dynamic rendering and private/no-store HTML; it changes caching behavior. Begin with `CSP_ENFORCE=false` (report-only). Observe the browser console/network through all supported journeys, then set `CSP_ENFORCE=true` after staging validation and retest. No CSP collection endpoint is configured; add a bounded, privacy-filtered reporting service if centralized reports are needed. Do not remove nonce protection to fix an integration.
- Confirm security headers, no mixed content, no frame embedding, and same-origin CSRF bootstrap in a real browser. Account tokens are removed from the URL fragment on recovery pages. Auth-sensitive responses must not be cached by the CDN.
- Chat stays hidden and disabled by default. See [chatbot deployment instructions](../chatbot-backend/README.md) before setting `CHAT_ENABLED=true`, `NEXT_PUBLIC_CHAT_ENABLED=true` and `CHAT_INTERNAL_ORIGIN`. Use dedicated read-only catalog credentials and separate writable quota storage. Configure explicit request, token and cost budgets from current provider pricing, plus a provider-side spending limit. No production AI spend was authorized or exercised by these tests.

## 5. Repository controls and maintenance

After the PR checks pass, the owner should enable a main-branch ruleset with required review and required successful `Security checks` / CodeQL checks, block force pushes/deletion, and restrict bypass actors. The initial audit found no main-branch protection/rulesets. These settings require a separate production/access-policy change and are not enabled by committing workflow files.

Enable GitHub secret scanning/push protection and private vulnerability reporting where available; confirm the actual repository settings. History and working-tree scans reduce risk but cannot establish that a credential was never exposed elsewhere. Rotate any discovered or previously exposed credentials through providers, not merely by deleting their source text. Review dependency-update PRs; regenerate Python hash locks from `.in` inputs using the documented workflow.

Use the existing health endpoint for availability. Alert on API startup failures, repeated 401/403/429/503, Mongo failures, Stripe webhook retries, reconciliation growth and overdue receipt delivery. Keep logs free of passwords, cookies, OTPs, recovery links, payment payloads and customer addresses. Define retention for sessions/rate buckets (TTL), orders, mail outbox and security events according to operational needs.

## 6. Release and rollback gate

Record CI run, test-mode Stripe evidence, backup/restore evidence, enrolled-admin recovery test, proxy/WAF validation, email delivery and CSP results. Obtain rollout approval before switching production traffic. Deploy API/frontend together and verify new sessions and one test-mode or explicitly approved canary order. Keep old paid sessions on the manual queue.

If errors occur, pause new checkout creation and preserve database state. Investigate/replay signed provider events and reconcile outstanding reservations/outbox jobs. Do not restore the old dual order-writing implementation against new reservations or roll back the database over completed payments. Prefer rolling forward a targeted fix; any rollback needs a reviewed migration/reconciliation plan and retained backups.
