import { test, expect, vi, afterEach } from "vitest";
import { beginCheckout } from "./checkout";
afterEach(() => {
  sessionStorage.clear();
  vi.unstubAllGlobals();
});
test("an uncertain checkout retry reuses its key and changing the cart starts a new attempt", async () => {
  const keys: string[] = [];
  const fetcher = vi.fn(async (input: string, init?: RequestInit) => {
    if (input.endsWith("/csrf-token"))
      return new Response(JSON.stringify({ csrfToken: "csrf" }));
    keys.push(new Headers(init?.headers).get("Idempotency-Key")!);
    if (keys.length === 1) throw new Error("lost response");
    return new Response(
      JSON.stringify({ url: "https://checkout.stripe.com/c/pay/test" }),
    );
  });
  vi.stubGlobal("fetch", fetcher);
  const items = [{ id: "a".repeat(24), quantity: 1 }];
  await expect(beginCheckout(items)).rejects.toThrow();
  await expect(beginCheckout(items)).resolves.toContain("checkout.stripe.com");
  await beginCheckout([{ ...items[0], quantity: 2 }]);
  expect(keys[0]).toBe(keys[1]);
  expect(keys[2]).not.toBe(keys[0]);
});
test("only a confirmed released checkout discards its key and waits for another user attempt", async () => {
  const keys: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) => {
      if (input.endsWith("/csrf-token"))
        return new Response(JSON.stringify({ csrfToken: "csrf" }));
      keys.push(new Headers(init?.headers).get("Idempotency-Key")!);
      if (keys.length === 1)
        return new Response(
          JSON.stringify({
            code: "CHECKOUT_RELEASED",
            message:
              "This checkout expired unpaid. Click checkout again to start a new attempt.",
          }),
          { status: 409 },
        );
      return new Response(
        JSON.stringify({ url: "https://checkout.stripe.com/c/pay/new" }),
      );
    }),
  );
  const items = [{ id: "a".repeat(24), quantity: 1 }];
  await expect(beginCheckout(items)).rejects.toThrow("Click checkout again");
  expect(keys).toHaveLength(1);
  expect(sessionStorage.getItem("checkout-attempt")).toBeNull();
  await beginCheckout(items);
  expect(keys[1]).not.toBe(keys[0]);
});
test.each([
  [
    409,
    { code: "CHECKOUT_RECONCILIATION_REQUIRED", message: "Contact support" },
  ],
  [409, { message: "Conflicting request" }],
  [503, { code: "CHECKOUT_RELEASED", message: "Temporary failure" }],
])("uncertain response %s retains the checkout key", async (status, result) => {
  const keys: string[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, init?: RequestInit) => {
      if (input.endsWith("/csrf-token"))
        return new Response(JSON.stringify({ csrfToken: "csrf" }));
      keys.push(new Headers(init?.headers).get("Idempotency-Key")!);
      return new Response(JSON.stringify(result), { status });
    }),
  );
  const items = [{ id: "a".repeat(24), quantity: 1 }];
  await expect(beginCheckout(items)).rejects.toThrow();
  await expect(beginCheckout(items)).rejects.toThrow();
  expect(keys[0]).toBe(keys[1]);
  expect(sessionStorage.getItem("checkout-attempt")).not.toBeNull();
});
test("fulfilled retries return the same-origin success page and preserve the existing attempt", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async (input: string) =>
        new Response(
          JSON.stringify(
            input.endsWith("/csrf-token")
              ? { csrfToken: "csrf" }
              : {
                  checkoutStatus: "fulfilled",
                  url: "/success?session_id=cs_test_existing",
                },
          ),
        ),
    ),
  );
  await expect(
    beginCheckout([{ id: "a".repeat(24), quantity: 1 }]),
  ).resolves.toBe(
    window.location.origin + "/success?session_id=cs_test_existing",
  );
  expect(sessionStorage.getItem("checkout-attempt")).not.toBeNull();
});
test.each([
  "https://evil.test/success?session_id=cs_test_1",
  "//evil.test/success?session_id=cs_test_1",
  "/cart?session_id=cs_test_1",
  "/success?session_id=cs_test_1&next=https://evil.test",
  "/success?session_id=cs_test_1#evil",
  "/success?session_id=other",
  "https://checkout.stripe.com/c/pay/old",
])("fulfilled destination rejects unsafe or unrelated path %s", async (url) => {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async (input: string) =>
        new Response(
          JSON.stringify(
            input.endsWith("/csrf-token")
              ? { csrfToken: "csrf" }
              : { checkoutStatus: "fulfilled", url },
          ),
        ),
    ),
  );
  await expect(
    beginCheckout([{ id: "a".repeat(24), quantity: 1 }]),
  ).rejects.toThrow("Invalid checkout destination");
});
