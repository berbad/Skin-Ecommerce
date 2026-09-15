import { csrfFetch } from "@/lib/csrf";
export const logout = async () => {
  const response = await csrfFetch("/api/auth/logout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  if (!response.ok)
    throw new Error("Logout could not be confirmed. Please try again.");
  localStorage.removeItem("cart");
  sessionStorage.removeItem("checkout-attempt");
  window.location.href = "/login";
};
