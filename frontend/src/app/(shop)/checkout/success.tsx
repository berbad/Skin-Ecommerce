"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Separator } from "@/components/ui/separator";
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

  if (!order)
    return (
      <p className="py-20 text-center text-muted-foreground">
        Loading your order...
      </p>
    );

  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <h1 className="mb-4 text-3xl font-semibold tracking-tight">
        Thanks for your order!
      </h1>
      <p className="mb-6 text-muted-foreground">
        We've received your payment and will ship soon.
      </p>

      <div className="rounded-2xl border border-border bg-card p-6 text-left">
        <h2 className="mb-3 text-lg font-semibold tracking-tight">
          Order Summary:
        </h2>
        {order.items.map((item: any) => (
          <div key={item.productId} className="mb-1 flex justify-between">
            <span className="text-foreground">
              {item.name} × {item.quantity}
            </span>
            <span className="tabular-nums text-foreground">
              ${(item.price * item.quantity).toFixed(2)}
            </span>
          </div>
        ))}
        <Separator className="my-3" />
        <div className="flex justify-between font-semibold text-foreground">
          <span>Total:</span>
          <span className="tabular-nums">${order.total.toFixed(2)}</span>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Status: {order.status}
        </p>
      </div>
    </div>
  );
}
