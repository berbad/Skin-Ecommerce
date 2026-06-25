"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShoppingCart, Trash2 } from "lucide-react";
import {
  getCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  CartItem,
} from "@/lib/cart";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { API_URL } from "@/lib/config";
export default function CartPage() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const loadCart = () => {
    const items = getCart();
    setCartItems(items);
  };

  useEffect(() => {
    loadCart();
    window.addEventListener("cart-updated", loadCart);
    return () => window.removeEventListener("cart-updated", loadCart);
  }, []);

  const subtotal = cartItems.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );
  const shipping = subtotal > 0 ? 5.99 : 0;
  const total = subtotal + shipping;

  const handleUpdateQty = (id: string, qty: number) => {
    if (qty < 1) return;
    updateCartItem(id, qty);
    loadCart();
  };

  const handleRemove = (id: string) => {
    removeFromCart(id);
    loadCart();
  };

  useEffect(() => {
    const handleCartUpdate = () => {
      const items = getCart();
      setCartItems(items);
    };

    handleCartUpdate();
    window.addEventListener("cart-updated", handleCartUpdate);

    return () => {
      window.removeEventListener("cart-updated", handleCartUpdate);
    };
  }, []);
  const handleCheckout = async () => {
    const res = await fetch(`${API_URL}/api/stripe/create-checkout-session`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: cartItems }),
    });

    const data = await res.json();

    if (!data?.url) {
      console.error("No checkout URL returned");
      return;
    }

    window.location.href = data.url;
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-6 text-3xl font-semibold tracking-tight">Your Cart</h1>

      {cartItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card px-6 py-20 text-center">
          <ShoppingCart className="mb-8 h-16 w-16 text-muted-foreground" />
          <h2 className="mb-2 text-2xl font-semibold tracking-tight">
            Your cart is empty
          </h2>
          <p className="mb-6 max-w-md text-muted-foreground">
            Looks like you haven’t added anything yet. Start exploring our
            skincare collection and treat yourself!
          </p>
          <Button asChild>
            <Link href="/products">Browse Products</Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Shopping Cart ({cartItems.length} items)</CardTitle>
              </CardHeader>
              <CardContent>
                {cartItems.map((item, i) => (
                  <div key={item.id}>
                    <div className="flex items-center py-4">
                      <div className="mr-4 h-20 w-20 rounded-lg bg-muted" />
                      <div className="flex-1">
                        <h3 className="font-medium text-foreground">
                          {item.name}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Unit Price:{" "}
                          <span className="tabular-nums">
                            ${item.price.toFixed(2)}
                          </span>
                        </p>
                      </div>
                      <div className="mr-4 flex items-center">
                        <button
                          onClick={() =>
                            handleUpdateQty(item.id, item.quantity - 1)
                          }
                          className="rounded-l-md border border-border px-2 py-1 text-foreground hover:bg-muted"
                          aria-label={`Decrease quantity of ${item.name}`}
                        >
                          -
                        </button>
                        <span
                          className="border-y border-border px-4 tabular-nums"
                          aria-label={`Quantity: ${item.quantity}`}
                        >
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            handleUpdateQty(item.id, item.quantity + 1)
                          }
                          className="rounded-r-md border border-border px-2 py-1 text-foreground hover:bg-muted"
                          aria-label={`Increase quantity of ${item.name}`}
                        >
                          +
                        </button>
                      </div>
                      <div className="flex items-center">
                        <p className="mr-4 font-medium tabular-nums text-foreground">
                          ${(item.price * item.quantity).toFixed(2)}
                        </p>
                        <button
                          onClick={() => handleRemove(item.id)}
                          className="text-destructive hover:text-destructive/80"
                          aria-label={`Remove ${item.name}`}
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                    {i < cartItems.length - 1 && <Separator />}
                  </div>
                ))}
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" asChild>
                  <Link href="/products">Continue Shopping</Link>
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    clearCart();
                    loadCart();
                  }}
                >
                  Clear Cart
                </Button>
              </CardFooter>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal</span>
                    <span className="tabular-nums">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Shipping</span>
                    <span className="tabular-nums">${shipping.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold text-foreground">
                    <span>Total</span>
                    <span className="tabular-nums">${total.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={handleCheckout}>
                  Proceed to Checkout
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
