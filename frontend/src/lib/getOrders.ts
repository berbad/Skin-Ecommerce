import type { StoreOrder } from "./order-types";
export async function getOrders(): Promise<StoreOrder[]> {
  const response = await fetch("/api/orders", {
    credentials: "include",
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Unable to load orders");
  const data = await response.json();
  return Array.isArray(data.orders) ? data.orders : [];
}
