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
    return <div className="p-8 text-center">Loading receipt...</div>;

  return (
    <div className="p-8 text-center">
      <h1 className="text-3xl font-bold text-green-600 mb-4">
        🎉 Payment Successful!
      </h1>
      <p className="text-lg mb-2">
        Thank you for your order, {receipt.customer_email}!
      </p>
      <p className="text-sm text-gray-700">Session ID: {receipt.id}</p>
      <p className="text-lg font-medium mt-2">
        Amount Paid: ${(receipt.amount_total / 100).toFixed(2)}
      </p>
    </div>
  );
}
