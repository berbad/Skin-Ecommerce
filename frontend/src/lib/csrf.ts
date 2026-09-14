// Fetch per operation rather than caching tokens across login/logout or users.
export async function getCsrfToken(apiOrigin = ""): Promise<string> {
  const response = await fetch(`${apiOrigin.replace(/\/$/, "")}/api/csrf-token`, {
    credentials: "include", cache: "no-store",
  });
  if (!response.ok) throw new Error("Unable to establish request protection");
  const data = await response.json();
  if (typeof data.csrfToken !== "string" || !data.csrfToken) throw new Error("Missing CSRF token");
  return data.csrfToken;
}

export async function csrfFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const method = (init.method || "GET").toUpperCase();
  if (["GET", "HEAD", "OPTIONS"].includes(method)) return fetch(input, init);
  const apiOrigin = /^https?:\/\//.test(input) ? new URL(input).origin : "";
  for (let attempt = 0; ; attempt++) {
    const headers = new Headers(init.headers);
    headers.set("X-CSRF-Token", await getCsrfToken(apiOrigin));
    const response = await fetch(input, { ...init, headers, credentials: "include" });
    // Retry only a pre-handler CSRF rejection, never an ambiguous network or
    // application failure, so checkout/order writes cannot be duplicated.
    if (attempt === 0 && response.status === 403) {
      const error = await response.clone().json().catch(() => ({}));
      if (error.code === "EBADCSRFTOKEN") continue;
    }
    return response;
  }
}
