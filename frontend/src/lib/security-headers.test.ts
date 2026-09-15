import { test, expect } from "vitest";
import config from "../../next.config";

test("storefront allows Referer on same-origin CSRF bootstrap GETs", async () => {
  const rules = await config.headers!();
  const policy = rules
    .flatMap((rule) => rule.headers)
    .find((header) => header.key.toLowerCase() === "referrer-policy")?.value;
  // Same-origin GET fetch omits Origin; the backend token endpoint consequently
  // needs Referer. Any policy preserving same-origin Referer satisfies the contract.
  expect([
    "same-origin",
    "strict-origin",
    "origin",
    "origin-when-cross-origin",
    "strict-origin-when-cross-origin",
    "no-referrer-when-downgrade",
    "unsafe-url",
  ]).toContain(policy);
});
