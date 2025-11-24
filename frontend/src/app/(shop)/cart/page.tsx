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
    <div className="container max-w-screen-xl py-8 px-4">
      <h1 className="text-3xl font-bold mb-6 text-left pl-20">Your Cart</h1>

      {cartItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center min-h-[60vh] text-left pl-145">
          <ShoppingCart className="h-16 w-16 text-muted-foreground mb-8" />
          <h2 className="text-2xl font-semibold mb-2">Your cart is empty</h2>
          <p className="text-muted-foreground mb-6 max-w-md">
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
                      <div className="h-20 w-20 bg-muted rounded mr-4" />
                      <div className="flex-1">
                        <h3 className="font-medium">{item.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Unit Price: ${item.price.toFixed(2)}
                        </p>
                      </div>
                      <div className="flex items-center mr-4">
                        <button
                          onClick={() =>
                            handleUpdateQty(item.id, item.quantity - 1)
                          }
                          className="px-2 py-1 border rounded-l-md"
                          aria-label={`Decrease quantity of ${item.name}`}
                        >
                          -
                        </button>
                        <span
                          className="px-4 border-y"
                          aria-label={`Quantity: ${item.quantity}`}
                        >
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            handleUpdateQty(item.id, item.quantity + 1)
                          }
                          className="px-2 py-1 border rounded-r-md"
                          aria-label={`Increase quantity of ${item.name}`}
                        >
                          +
                        </button>
                      </div>
                      <div className="flex items-center">
                        <p className="font-medium mr-4">
                          ${(item.price * item.quantity).toFixed(2)}
                        </p>
                        <button
                          onClick={() => handleRemove(item.id)}
                          className="text-red-600"
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
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span>${shipping.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span>${total.toFixed(2)}</span>
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
