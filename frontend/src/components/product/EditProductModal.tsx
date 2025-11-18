"use client";

import { useEffect, useState } from "react";
import axios from "axios";

interface EditProductModalProps {
  productId: string;
  onClose: () => void;
  onSave: () => void;
}

export default function EditProductModal({
  productId,
  onClose,
  onSave,
}: EditProductModalProps) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    category: "",
    stock: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    axios.get(`/api/products/${productId}`).then((res) => {
      const { name, description, price, category, stock } = res.data.product;
      setForm({
        name,
        description,
        price: price.toString(),
        category,
        stock: stock.toString(),
      });
    });
  }, [productId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await axios.put(`/api/products/${productId}`, {
        ...form,
        price: parseFloat(form.price),
        stock: parseInt(form.stock),
      });
      onSave();
      handleClose();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to save product");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 200);
  };

  return (
    <div
      className={`fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50 transition-opacity duration-200 ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      <div
        className="bg-white p-6 rounded shadow max-w-md w-full transition-transform duration-200 ease-in-out transform origin-center"
        style={{ transform: visible ? "scale(1)" : "scale(0.95)" }}
      >
        <h2 className="text-xl font-semibold mb-4">Edit Product</h2>
        {error && <p className="mb-2 text-red-600">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            className="border p-2 w-full"
            name="name"
            value={form.name}
            onChange={handleChange}
            disabled={loading}
            required
          />
          <textarea
            className="border p-2 w-full"
            name="description"
            value={form.description}
            onChange={handleChange}
            disabled={loading}
            required
          />
          <input
            className="border p-2 w-full"
            name="price"
            type="number"
            step="0.01"
            value={form.price}
            onChange={handleChange}
            disabled={loading}
            required
          />
          <input
            className="border p-2 w-full"
            name="category"
            value={form.category}
            onChange={handleChange}
            disabled={loading}
            required
          />
          <input
            className="border p-2 w-full"
            name="stock"
            type="number"
            value={form.stock}
            onChange={handleChange}
            disabled={loading}
            required
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="bg-gray-300 px-4 py-2 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded"
            >
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
