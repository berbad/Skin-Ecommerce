import axios from "./axios";
import { getCart, clearCart } from "./cart";

export const logout = async () => {
  try {
    const cart = getCart();

    await axios.post("/auth/logout", { cart });

    clearCart();

    window.location.replace("/login");
  } catch (err) {
    console.error("Logout failed", err);
  }
};
