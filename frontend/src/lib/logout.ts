import axios from "./axios";
import { getCart, clearCart } from "./cart";

export const logout = async () => {
  try {
    const cart = getCart();

    const response = await axios.post("/auth/logout", { cart });

    console.log("✅ Logout response:", response.data);

    clearCart();

    localStorage.removeItem("user");
    sessionStorage.clear();

    window.location.href = "/login";
  } catch (err: any) {
    console.error("❌ Logout failed:", err);

    clearCart();
    localStorage.clear();
    sessionStorage.clear();

    window.location.href = "/login";
  }
};
