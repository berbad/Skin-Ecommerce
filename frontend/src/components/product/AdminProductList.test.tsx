import { test, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AdminProductList from "./AdminProductList";
import axios from "@/lib/axios";
vi.mock("@/lib/axios", () => ({ default: { get: vi.fn(), put: vi.fn() } }));
test("product list edits submit validated details with the original stock guard", async () => {
  vi.mocked(axios.get).mockResolvedValue({
    data: {
      products: [
        {
          _id: "a".repeat(24),
          name: "Serum",
          description: "Description",
          price: 25,
          category: "Skin",
          stock: 4,
          featured: true,
          image: "https://res.cloudinary.com/test.png",
          order: 0,
        },
      ],
    },
  });
  vi.mocked(axios.put).mockResolvedValue({ data: {} });
  render(<AdminProductList refresh={false} />);
  fireEvent.click(await screen.findByRole("button", { name: "Edit" }));
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  await waitFor(() =>
    expect(axios.put).toHaveBeenCalledWith("/products/" + "a".repeat(24), {
      name: "Serum",
      description: "Description",
      price: 25,
      category: "Skin",
      stock: 4,
      expectedStock: 4,
      featured: true,
      ingredients: undefined,
      benefits: undefined,
      howToUse: undefined,
    }),
  );
});
