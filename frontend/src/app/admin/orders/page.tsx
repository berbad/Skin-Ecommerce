"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/useCurrentUser";
import axios from "@/lib/axios";
import { Card } from "@/components/ui/card";

export default function AdminOrdersPage() {
  const { user, loading } = useCurrentUser();
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) {
      router.push("/");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (user?.role === "admin") {
      axios.get("/admin/orders").then((res) => {
        setOrders(res.data.orders);
      });
    }
  }, [user]);

  if (loading || !user || user.role !== "admin") return null;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">All Orders</h1>
      <div className="space-y-4">
        {orders.map((order) => (
          <Card key={order._id} className="p-4">
            <div className="flex justify-between mb-2">
              <div>
                <p className="font-bold">Order #{order._id.slice(-8)}</p>
                <p className="text-sm text-gray-600">
                  {new Date(order.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold">${order.total.toFixed(2)}</p>
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                  {order.status}
                </span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-semibold">Customer:</p>
                <p>{order.customerName || "N/A"}</p>
                <p className="text-gray-600">{order.customerEmail}</p>
              </div>

              {order.shippingAddress && (
                <div>
                  <p className="font-semibold">Shipping Address:</p>
                  <p>{order.shippingAddress.line1}</p>
                  {order.shippingAddress.line2 && (
                    <p>{order.shippingAddress.line2}</p>
                  )}
                  <p>
                    {order.shippingAddress.city}, {order.shippingAddress.state}{" "}
                    {order.shippingAddress.postal_code}
                  </p>
                  <p>{order.shippingAddress.country}</p>
                </div>
              )}
            </div>

            <div className="mt-4">
              <p className="font-semibold text-sm mb-2">Items:</p>
              <ul className="text-sm space-y-1">
                {order.items.map((item: any, i: number) => (
                  <li key={i}>
                    {item.name} × {item.quantity} — $
                    {(item.price * item.quantity).toFixed(2)}
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
