export async function getOrders() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  const res = await fetch(`${API_URL}/api/orders`, {
    credentials: "include",
  });
  try {
    const res = await fetch(`${API_URL}/api/orders`, {
      credentials: "include",
    });

    if (!res.ok) return [];

    const data = await res.json();
    return data.orders || [];
  } catch (err) {
    console.error("Error fetching orders:", err);
    return [];
  }
}
