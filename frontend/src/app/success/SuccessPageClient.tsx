"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import axios from "@/lib/axios";

export default function SuccessPage() {
  const sessionId = useSearchParams().get("session_id");
  const [receipt, setReceipt] = useState<any>(null);

  useEffect(() => {
    if (!sessionId) return;
    (async () => {
      try {
        const res = await axios.get(`/stripe/session/${sessionId}`);
        setReceipt(res.data.session);
        localStorage.removeItem("cart");
        window.dispatchEvent(new Event("cart-updated"));
      } catch (e) {
        console.error("Failed to load receipt", e);
      }
    })();
  }, [sessionId]);

  if (!receipt)
    return (
      <div className="p-8 text-center text-muted-foreground">
        Loading receipt...
      </div>
    );

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="mb-4 text-3xl font-semibold tracking-tight text-brand">
        🎉 Payment Successful!
      </h1>
      <p className="mb-6 text-lg text-foreground">
        Thank you for your order, {receipt.customer_email}!
      </p>
      <div className="rounded-2xl border border-border bg-card p-6 text-left">
        <p className="text-sm text-muted-foreground">
          Session ID: {receipt.id}
        </p>
        <p className="mt-2 text-lg font-medium tabular-nums text-foreground">
          Amount Paid: ${(receipt.amount_total / 100).toFixed(2)}
        </p>
      </div>
    </div>
  );
}
