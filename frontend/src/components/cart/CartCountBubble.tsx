"use client";

import { useEffect, useState } from "react";

export function CartCountBubble() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const updateCount = () => {
      try {
        const stored = localStorage.getItem("cart");
        const cart = stored ? JSON.parse(stored) : [];
        const totalItems = cart.reduce(
          (sum: number, item: any) => sum + item.quantity,
          0
        );
        setCount(totalItems);
      } catch (err) {
        console.error("CartCountBubble error parsing localStorage:", err);
        setCount(0);
      }
    };

    updateCount();
    window.addEventListener("cart-updated", updateCount);
    return () => window.removeEventListener("cart-updated", updateCount);
  }, []);

  if (count === 0) return null;

  return (
    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-pink-600 text-xs text-white">
      {count}
    </span>
  );
}
