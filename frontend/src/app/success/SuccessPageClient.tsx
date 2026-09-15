"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import axios from "@/lib/axios";
import { Button } from "@/components/ui/button";
type Receipt = {
  id: string;
  payment_status: string;
  amount_total: number;
  currency: string;
  customer_details?: { email?: string };
};
export default function SuccessPage() {
  const sessionId = useSearchParams().get("session_id");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [state, setState] = useState("");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!sessionId) {
      setError(
        "No checkout was specified. Open your order history for details.",
      );
      return;
    }
    let active = true;
    setError("");
    axios
      .get("/stripe/session/" + encodeURIComponent(sessionId))
      .then((res) => {
        if (!active) return;
        setReceipt(res.data.session);
        setState(res.data.fulfillmentStatus);
        if (res.data.session.payment_status === "paid") {
          localStorage.removeItem("cart");
          sessionStorage.removeItem("checkout-attempt");
          window.dispatchEvent(new Event("cart-updated"));
        }
      })
      .catch(() => {
        if (active)
          setError(
            "Unable to retrieve this checkout. Sign in to the account used for payment and try again.",
          );
      });
    return () => {
      active = false;
    };
  }, [sessionId, attempt]);
  if (error)
    return (
      <main className="mx-auto max-w-2xl space-y-5 px-4 py-16">
        <p role="alert">{error}</p>
        <Button onClick={() => setAttempt((n) => n + 1)}>Try again</Button>
        <Link href="/orders" className="block text-brand underline">
          View orders
        </Link>
      </main>
    );
  if (!receipt)
    return (
      <p role="status" className="p-8 text-center">
        Checking payment status…
      </p>
    );
  const paid = receipt.payment_status === "paid";
  return (
    <main className="mx-auto max-w-2xl space-y-6 px-4 py-16">
      <h1 className="text-3xl font-semibold">
        {paid ? "Payment confirmed" : "Payment pending"}
      </h1>
      <p>
        {!paid
          ? "Your payment has not been confirmed yet. Your cart is saved."
          : state === "fulfilled"
            ? "Thank you. Your order has been recorded."
            : "Your payment was received. We’re confirming your order; please do not pay again."}
      </p>
      {paid && (
        <p className="text-xl tabular-nums">
          Amount paid:{" "}
          {new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: receipt.currency || "USD",
          }).format(receipt.amount_total / 100)}
        </p>
      )}
      <div className="flex flex-wrap gap-4">
        <Button onClick={() => setAttempt((n) => n + 1)}>Refresh status</Button>
        <Button asChild variant="outline">
          <Link href="/orders">View orders</Link>
        </Button>
      </div>
    </main>
  );
}
