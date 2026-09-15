import { csrfFetch } from "./csrf";
type Item = { id: string; quantity: number };
export async function beginCheckout(items: Item[]): Promise<string> {
  const fingerprint = JSON.stringify(
    items
      .map(({ id, quantity }) => ({ id, quantity }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  );
  let previous: { fingerprint: string; key: string } | undefined;
  try {
    previous = JSON.parse(sessionStorage.getItem("checkout-attempt") || "null");
  } catch {
    /* replace malformed local data */
  }
  const key =
    previous?.fingerprint === fingerprint && typeof previous.key === "string"
      ? previous.key
      : crypto.randomUUID();
  sessionStorage.setItem(
    "checkout-attempt",
    JSON.stringify({ fingerprint, key }),
  );
  const response = await csrfFetch("/api/stripe/create-checkout-session", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Idempotency-Key": key },
    body: JSON.stringify({ items: JSON.parse(fingerprint) }),
  });
  const result = await response.json();
  if (!response.ok) {
    if (response.status === 409 && result.code === "CHECKOUT_RELEASED") {
      // An older in-flight request must not discard a newer cart's attempt.
      if (
        sessionStorage.getItem("checkout-attempt") ===
        JSON.stringify({ fingerprint, key })
      )
        sessionStorage.removeItem("checkout-attempt");
    }
    throw new Error(result.message || "Unable to start checkout. Try again.");
  }
  if (result.checkoutStatus === "fulfilled") {
    // The backend supplies only this relative route for an existing paid order.
    if (
      typeof result.url !== "string" ||
      !/^\/success\?session_id=cs_[A-Za-z0-9_-]+$/.test(result.url)
    )
      throw new Error("Invalid checkout destination");
    return new URL(result.url, window.location.origin).href;
  }
  const url = new URL(result.url);
  if (url.protocol !== "https:" || url.hostname !== "checkout.stripe.com")
    throw new Error("Invalid checkout destination");
  return url.href;
}
