# September 2026 security remediation

Use Node.js 24. Run `npm ci`, `npm test`, `npm run build`, and `npm audit --audit-level=low` separately in `backend/` and `frontend/`. The security workflow runs those checks for both applications on pull requests and main-branch pushes. Tests use mock database, Stripe, email, and upload boundaries; they do not require deployment credentials.

## Dependency changes

Both lockfiles have zero npm audit findings as of September 14, 2026. The 134 initially observed Dependabot vulnerability ranges were also checked against every matching installed lockfile entry, with zero remaining matches. Next stays on patched 15.5.x. A scoped `next -> postcss` override supplies patched PostCSS 8.5.28 while that framework branch pins an older release. Keep the override until the parent ships a safe dependency.

Unused NextAuth v3, shadcn CLI, backend Stripe CLI and backend Radix dependencies were removed. Cloudinary moved to v2; a small Multer storage adapter now uses the maintained SDK's upload stream directly because the old adapter pinned Cloudinary v1. Nodemailer moved to patched v9. The React test transformer now matches patched Vite.

## Request and payment protections

- Unsafe browser requests require an exact trusted Origin before parsing bodies or running API handlers. Production allows only `https://eternalbotanic.com` and `https://www.eternalbotanic.com`; development also allows localhost ports 3000 and 3001. Signed double-submit tokens from maintained `csrf-csrf` add session-bound CSRF protection, retaining `Secure; HttpOnly; SameSite=None`. Missing, null, hostile, and suffix-matching origins are rejected. Native/nonbrowser write clients must supply the trusted Origin plus a credentialed token from `/api/csrf-token`; neither replaces authentication. Token retrieval accepts only trusted Origin or Referer, uses `no-store`, and never exposes tokens to hostile origins. Host-only, Secure, HttpOnly CSRF cookies bind anonymous sessions; authenticated tokens bind to the JWT. The HMAC key is domain-separated from the existing JWT secret. See the [OWASP standard-header origin guidance](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html#using-standard-headers-to-verify-origin).
- Frontend native fetch and Axios share the same-origin `/api` proxy and cookie host. Each write obtains a fresh token for the current session. Only an explicit pre-handler CSRF rejection is retried, at most once; network errors and application failures are not replayed. Login/logout transitions regenerate session-bound tokens without a global token cache.
- The Stripe webhook is exempt from browser Origin checks and still verifies the exact raw body using Stripe's signature. Only confirmed paid sessions create paid orders. Both `checkout.session.completed` and `checkout.session.async_payment_succeeded` are handled; configure the deployed webhook subscription to deliver the latter if delayed payment methods are used. Database/Stripe fulfillment failures return 500 so Stripe can retry.
- Checkout loads product names and prices from the catalog and validates identifiers, quantities and availability. Customer-supplied prices do not determine charges. Session retrieval checks authenticated ownership and payment status before recording orders. Order status changes require admin authorization.
- The unused direct `POST /api/orders` now returns 409 without changing inventory. Its previous stock decrement occurred before an order creation that lacked a required ID. The storefront already uses Stripe checkout.
- The order schema now persists `userId`. Existing records whose ownership was discarded by the old schema are not automatically assigned to users; reconcile those only against trusted payment metadata if their order history needs restoration.
- Auth/admin routes share a bounded API limiter; login/register have a tighter limit. The default in-memory store is per process. Multiple replicas need a shared limiter store for a deployment-wide limit. Existing proxy trust configuration remains one hop and must match the deployment.
- Credential types are checked before equality queries. Reordering validates every identifier before database writes. Auth diagnostics no longer expose cookie tokens or raw exception data. Webhook errors return a fixed plaintext response.
- Uploaded previews accept only bounded JPEG/PNG/WebP files and decode pixels into a canvas, removing the HTML URL sink. Cloudinary enforces raster formats server-side and Multer limits upload size.

## Verification and limits

Backend: 19 tests cover operator objects, CSRF, cookie secrecy/login behavior, rate limits, catalog pricing, order authorization, unpaid/paid Stripe signatures, retryable fulfillment failures and Cloudinary streaming. Frontend: 24 tests cover existing components and both malicious-upload rejection and raster preview rendering. TypeScript backend compilation and the Next production build pass.

The backend tests open a temporary localhost HTTP listener and replace external service methods. A network deny guard prevents accidental HTTPS calls during test cases. No live Stripe, email, database, upload or deployment operations were performed.

The GitHub CodeQL branch scan must confirm the changed source. The token middleware supplements the existing Origin checks; the branch scan must verify that CodeQL recognizes the complete protection. No alerts were dismissed. The test/audit results do not establish safety of historical logs or legacy stored data. Inventory reservation/fulfillment reconciliation and transactional multi-item stock management are outside this patch; the removed direct-order mutation must not be used for those purposes.
