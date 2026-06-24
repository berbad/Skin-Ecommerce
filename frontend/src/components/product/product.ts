export type Product = {
  _id?: string;
  id?: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category?: string;
  ingredients?: string;
  benefits?: string;
  howToUse?: string;
  featured?: boolean;
};

type CartItem = {
  id: string | undefined;
  name: string;
  price: number;
  quantity: number;
};

export function addToCart(product: Product): void {
  if (typeof window === "undefined") return;
  const existing = localStorage.getItem("cart");
  const cart: CartItem[] = existing ? JSON.parse(existing) : [];
  const id = product._id ?? product.id;
  const match = cart.find((item) => item.id === id);
  if (match) {
    match.quantity += 1;
  } else {
    cart.push({ id, name: product.name, price: product.price, quantity: 1 });
  }
  localStorage.setItem("cart", JSON.stringify(cart));
  window.dispatchEvent(new Event("cart-updated"));
}
