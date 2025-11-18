"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/lib/useCurrentUser";
import { getOrders } from "@/lib/getOrders";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function OrdersPage() {
  const router = useRouter();
  const { user, loading } = useCurrentUser();
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
    if (user) {
      getOrders().then((data) => {
        setOrders(data);
        setLoadingOrders(false);
      });
    }
  }, [user, loading, router]);

  if (loading || loadingOrders) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4">Your Orders</h1>
        <div className="space-y-4">
          <div className="animate-pulse">
            <div className="h-5 w-40 bg-muted rounded mb-2" />
            <div className="h-24 w-full bg-muted rounded" />
          </div>
          <div className="animate-pulse">
            <div className="h-5 w-32 bg-muted rounded mb-2" />
            <div className="h-24 w-full bg-muted rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const badgeClass = (status: string) => {
    if (status === "paid") return "bg-green-100 text-green-700";
    if (status === "fulfilled") return "bg-blue-100 text-blue-700";
    if (status === "processing") return "bg-amber-100 text-amber-700";
    if (status === "cancelled") return "bg-red-100 text-red-700";
    return "bg-gray-100 text-gray-700";
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Your Orders</h1>
        <Button onClick={() => router.push("/products")}>
          Continue shopping
        </Button>
      </div>

      {orders.length === 0 ? (
        <Card className="p-6">
          <p className="text-muted-foreground mb-4">
            You haven't placed any orders yet.
          </p>
          <Button onClick={() => router.push("/products")}>
            Browse products
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order._id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">
                    Placed on {new Date(order.createdAt).toLocaleDateString()} •
                    Order ID:{" "}
                    <span className="font-mono text-xs">
                      {String(order._id).slice(-8)}
                    </span>
                  </div>
                  <div className="mt-2">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badgeClass(
                        order.status
                      )}`}
                    >
                      {String(order.status).charAt(0).toUpperCase() +
                        String(order.status).slice(1)}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Total</div>
                  <div className="text-lg font-semibold tabular-nums">
                    ${Number(order.total).toFixed(2)}
                  </div>
                </div>
              </div>

              <ul className="mt-4 text-sm space-y-1">
                {order.items.map((item: any, index: number) => (
                  <li key={index} className="flex justify-between">
                    <span className="truncate">
                      {item.name} × {item.quantity}
                    </span>
                    <span className="tabular-nums">
                      ${(item.price * item.quantity).toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-4">
                <Button
                  variant="outline"
                  onClick={() => router.push("/contact")}
                >
                  Get help
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
