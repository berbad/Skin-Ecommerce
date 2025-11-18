"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { API_URL } from "@/lib/config";
export default function SuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [order, setOrder] = useState<any>(null);
  useEffect(() => {
    if (!sessionId) return;

    fetch(`${API_URL}/api/orders/confirm?session_id=${sessionId}`)
      .then((res) => res.json())
      .then(setOrder)
      .catch(console.error);
  }, [sessionId]);

  if (!order) return <p className="text-center py-20">Loading your order...</p>;

  return (
    <div className="max-w-2xl mx-auto py-20 text-center">
      <h1 className="text-3xl font-bold mb-4">Thanks for your order!</h1>
      <p className="text-muted-foreground mb-6">
        We've received your payment and will ship soon.
      </p>

      <div className="text-left border p-4 rounded shadow-sm bg-white">
        <h2 className="text-lg font-semibold mb-2">Order Summary:</h2>
        {order.items.map((item: any) => (
          <div key={item.productId} className="flex justify-between mb-1">
            <span>
              {item.name} × {item.quantity}
            </span>
            <span>${(item.price * item.quantity).toFixed(2)}</span>
          </div>
        ))}
        <hr className="my-2" />
        <div className="flex justify-between font-bold">
          <span>Total:</span>
          <span>${order.total.toFixed(2)}</span>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Status: {order.status}
        </p>
      </div>
    </div>
  );
}
