export type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

const CART_KEY = "cart";

export const addToCart = (product: {
  id: string;
  name: string;
  price: number;
}) => {
  if (typeof window === "undefined") return;

  const cart = getCart();
  const existing = cart.find((item) => item.id === product.id);

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({ ...product, quantity: 1 });
  }

  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  dispatchCartUpdated();
};

export const getCart = (): CartItem[] => {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(CART_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export const clearCart = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CART_KEY);
  dispatchCartUpdated();
};

export const updateCartItem = (id: string, quantity: number) => {
  const cart = getCart();
  const updated = cart.map((item) =>
    item.id === id ? { ...item, quantity } : item
  );
  localStorage.setItem(CART_KEY, JSON.stringify(updated));
  dispatchCartUpdated();
};

export const removeFromCart = (id: string) => {
  const cart = getCart().filter((item) => item.id !== id);
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  dispatchCartUpdated();
};

const dispatchCartUpdated = () => {
  window.dispatchEvent(new Event("cart-updated"));
};
