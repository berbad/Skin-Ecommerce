import { API_URL } from "./config";

export async function getCurrentUser() {
  try {
    const res = await fetch(`${API_URL}/api/auth/profile`, {
      credentials: "include",
    });

    if (!res.ok) return null;

    const data = await res.json();
    return data.user;
  } catch {
    return null;
  }
}
