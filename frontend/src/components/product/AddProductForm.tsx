"use client";

import { useEffect, useRef, useState } from "react";
import axios from "@/lib/axios";

export default function AddProductForm({
  onProductAdded,
}: {
  onProductAdded: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    stock: "",
    featured: "false",
    ingredients: "",
    benefits: "",
    howToUse: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const previewCanvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!imageFile) return;
    let cancelled = false;
    // Decode raster pixels directly instead of putting an uploaded URL in HTML.
    createImageBitmap(imageFile).then(bitmap => {
      try {
        const canvas = previewCanvas.current;
        if (!cancelled && canvas) {
          canvas.width = bitmap.width;
          canvas.height = bitmap.height;
          canvas.getContext("2d")?.drawImage(bitmap, 0, 0);
        }
      } finally { bitmap.close(); }
    }).catch(() => {
      if (!cancelled) { setImageFile(null); alert("Unable to decode this image."); }
    });
    return () => { cancelled = true; };
  }, [imageFile]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 10 * 1024 * 1024) {
        setImageFile(null);
        e.target.value = "";
        alert("Choose a JPEG, PNG or WebP image smaller than 10 MB.");
        return;
      }
      setImageFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageFile) return alert("Image required.");

    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, val]) => formData.append(key, val));
      formData.append("image", imageFile);

      await axios.post("/products", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      onProductAdded();
      setForm({
        name: "",
        description: "",
        price: "",
        category: "",
        stock: "",
        featured: "false",
        ingredients: "",
        benefits: "",
        howToUse: "",
      });
      setImageFile(null);
    } catch {
      alert("Error uploading product");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white p-4 rounded shadow space-y-4 mb-6"
    >
      <h2 className="text-xl font-semibold">Add Product</h2>

      <input
        className="border p-2 w-full"
        name="name"
        value={form.name}
        onChange={handleChange}
        placeholder="Name"
        required
      />
      <textarea
        className="border p-2 w-full"
        name="description"
        value={form.description}
        onChange={handleChange}
        placeholder="Description"
        required
      />
      <input
        className="border p-2 w-full"
        name="price"
        value={form.price}
        onChange={handleChange}
        placeholder="Price"
        type="number"
        step="0.01"
        required
      />
      <input
        className="border p-2 w-full"
        name="category"
        value={form.category}
        onChange={handleChange}
        placeholder="Category"
        required
      />
      <input
        className="border p-2 w-full"
        name="stock"
        value={form.stock}
        onChange={handleChange}
        placeholder="Stock"
        type="number"
        required
      />
      <select
        className="border p-2 w-full"
        name="featured"
        value={form.featured}
        onChange={handleChange}
      >
        <option value="false">Products Page</option>
        <option value="true">Home ‑ Featured</option>
      </select>

      <textarea
        className="border p-2 w-full"
        name="ingredients"
        value={form.ingredients}
        onChange={handleChange}
        placeholder="Ingredients"
      />
      <textarea
        className="border p-2 w-full"
        name="benefits"
        value={form.benefits}
        onChange={handleChange}
        placeholder="Benefits"
      />
      <textarea
        className="border p-2 w-full"
        name="howToUse"
        value={form.howToUse}
        onChange={handleChange}
        placeholder="How to Use"
      />

      <div>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleImageChange}
          required
        />
        {imageFile && (
          <canvas
            ref={previewCanvas}
            className="mt-2 max-h-48 rounded object-cover"
            role="img"
            aria-label="Preview"
          />
        )}
      </div>

      <button
        type="submit"
        className="bg-blue-600 text-white px-4 py-2 rounded"
      >
        Add Product
      </button>
    </form>
  );
}
