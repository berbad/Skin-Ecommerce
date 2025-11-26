import axios from "./axios";
import { getCart, clearCart } from "./cart";

export const logout = async () => {
  try {
    const cart = getCart();

    await axios.post("/auth/logout", { cart });

    clearCart();
    localStorage.removeItem("user");
    sessionStorage.clear();

    window.location.href = "/login";
  } catch (err: any) {
    clearCart();
    localStorage.clear();
    sessionStorage.clear();

    window.location.href = "/login";
  }
};
