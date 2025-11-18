"use client";

import React, { useEffect, useState } from "react";
import axios from "@/lib/axios";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import { normalizeImageSrc } from "@/lib/images";

interface Product {
  _id: string;
  name: string;
  image: string;
  description: string;
  price: number;
  order: number;
  ingredients?: string;
  benefits?: string;
  howToUse?: string;
}

export default function AdminProductList({ refresh }: { refresh: boolean }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Product>>({});

  const loadProducts = async () => {
    try {
      const res = await axios.get("/api/products");
      const sorted = res.data.products
        .filter((p: Product) => p._id)
        .sort((a: Product, b: Product) => a.order - b.order);
      setProducts([...sorted]);
    } catch {
      setProducts([]);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [refresh]);

  const onDragEnd = (result: DropResult) => {
    const { destination, source } = result;
    if (!destination || destination.index === source.index) return;

    const reordered = [...products];
    const [moved] = reordered.splice(source.index, 1);
    reordered.splice(destination.index, 0, moved);

    setProducts(reordered);
    const productIds = reordered.map((p) => p._id);
    axios.patch("/api/products/rearrange", { productIds });
  };

  const startEdit = (product: Product) => {
    setEditingProductId(product._id);
    setEditForm({
      name: product.name,
      description: product.description,
      price: product.price,
      image: product.image,
      order: product.order,
      ingredients: product.ingredients,
      benefits: product.benefits,
      howToUse: product.howToUse,
    });
  };

  const cancelEdit = () => {
    setEditingProductId(null);
    setEditForm({});
  };

  const handleEditChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const saveEdit = async () => {
    if (!editingProductId) return;
    try {
      await axios.put(`/api/products/${editingProductId}`, {
        ...editForm,
        price: Number(editForm.price),
      });
      setEditingProductId(null);
      setEditForm({});
      await loadProducts();
    } catch {
      alert("Error saving product");
    }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      await axios.delete(`/api/products/${id}`);
      await loadProducts();
    } catch {
      alert("Error deleting product");
    }
  };

  if (products.length === 0) {
    return <p className="text-sm text-gray-600">No products available.</p>;
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="products">
        {(provided) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
          >
            {products.map((product, index) =>
              product._id ? (
                <Draggable
                  key={product._id}
                  draggableId={product._id}
                  index={index}
                >
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className="border p-4 rounded shadow bg-white"
                    >
                      {editingProductId === product._id ? (
                        <div className="space-y-2">
                          <input
                            name="name"
                            value={editForm.name || ""}
                            onChange={handleEditChange}
                            className="border p-1 w-full"
                          />
                          <textarea
                            name="description"
                            value={editForm.description || ""}
                            onChange={handleEditChange}
                            className="border p-1 w-full"
                          />
                          <input
                            name="price"
                            type="number"
                            value={editForm.price || ""}
                            onChange={handleEditChange}
                            className="border p-1 w-full"
                          />
                          <input
                            name="image"
                            value={editForm.image || ""}
                            onChange={handleEditChange}
                            className="border p-1 w-full"
                            placeholder="Image URL"
                          />
                          <textarea
                            name="ingredients"
                            value={editForm.ingredients || ""}
                            onChange={handleEditChange}
                            className="border p-1 w-full"
                            placeholder="Ingredients"
                          />
                          <textarea
                            name="benefits"
                            value={editForm.benefits || ""}
                            onChange={handleEditChange}
                            className="border p-1 w-full"
                            placeholder="Benefits"
                          />
                          <textarea
                            name="howToUse"
                            value={editForm.howToUse || ""}
                            onChange={handleEditChange}
                            className="border p-1 w-full"
                            placeholder="How to Use"
                          />
                          <div className="flex space-x-2">
                            <button
                              onClick={saveEdit}
                              className="bg-green-600 text-white px-3 py-1 rounded"
                            >
                              Save
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="bg-gray-400 text-white px-3 py-1 rounded"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <img
                            src={normalizeImageSrc(product.image)}
                            alt={product.name}
                            className="h-32 w-full object-cover rounded"
                          />
                          <h2 className="text-lg font-semibold mt-2">
                            {product.name}
                          </h2>
                          <p className="text-sm text-gray-600">
                            {product.description}
                          </p>
                          {product.ingredients && (
                            <p className="text-sm text-gray-600">
                              <strong>Ingredients:</strong>{" "}
                              {product.ingredients}
                            </p>
                          )}
                          {product.benefits && (
                            <p className="text-sm text-gray-600">
                              <strong>Benefits:</strong> {product.benefits}
                            </p>
                          )}
                          {product.howToUse && (
                            <p className="text-sm text-gray-600">
                              <strong>How to Use:</strong> {product.howToUse}
                            </p>
                          )}
                          <p className="text-sm font-bold mt-1">
                            ${product.price}
                          </p>
                          <div className="mt-2 flex space-x-2">
                            <button
                              onClick={() => startEdit(product)}
                              className="bg-blue-600 text-white px-3 py-1 rounded"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteProduct(product._id)}
                              className="bg-red-600 text-white px-3 py-1 rounded"
                            >
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </Draggable>
              ) : null
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
