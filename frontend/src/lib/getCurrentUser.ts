export async function getCurrentUser() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  const res = await fetch(`${API_URL}/api/auth/profile`, {
    credentials: "include",
  });
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
