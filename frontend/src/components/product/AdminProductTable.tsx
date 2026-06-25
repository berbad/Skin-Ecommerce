"use client";

import React, { useEffect, useState, useRef } from "react";
import axios from "@/lib/axios";
import { Pencil, Trash2, Plus, ImageIcon } from "lucide-react";
import imageCompression from "browser-image-compression";
import { normalizeImageSrc } from "@/lib/images";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Product {
  _id?: string;
  id?: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image: string | File;
  stock: number;
  featured: boolean;
  ingredients?: string;
  benefits?: string;
  howToUse?: string;
}

const emptyForm: Partial<Product> = {
  _id: "",
  name: "",
  description: "",
  price: 0,
  category: "",
  image: "",
  stock: 0,
  featured: false,
  ingredients: "",
  benefits: "",
  howToUse: "",
};

export default function AdminProductTable({ refresh }: { refresh?: boolean }) {
  const [rows, setRows] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<Product>>(emptyForm);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const imageUrlRef = useRef<string | null>(null);

  const loadProducts = async () => {
    try {
      const res = await axios.get("/products");
      setRows([...res.data.products]);
    } catch {
      setRows([]);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [refresh]);

  const handleOpen = (row?: Product) => {
    if (row) {
      const id = row._id ?? row.id ?? "";
      setEditId(id);
      setForm({
        _id: id,
        name: row.name,
        description: row.description,
        price: row.price,
        category: row.category,
        image: row.image,
        stock: row.stock,
        featured: row.featured,
        ingredients: row.ingredients || "",
        benefits: row.benefits || "",
        howToUse: row.howToUse || "",
      });
    } else {
      setEditId(null);
      setForm(emptyForm);
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditId(null);
    if (imageUrlRef.current) {
      URL.revokeObjectURL(imageUrlRef.current);
      imageUrlRef.current = null;
    }
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);

    try {
      const formData = new FormData();
      formData.append("name", form.name || "");
      formData.append("description", form.description || "");
      formData.append("price", String(form.price ?? 0));
      formData.append("category", form.category || "");
      formData.append("stock", String(form.stock ?? 0));
      formData.append("featured", form.featured ? "true" : "false");
      formData.append("ingredients", form.ingredients || "");
      formData.append("benefits", form.benefits || "");
      formData.append("howToUse", form.howToUse || "");

      if (form.image && typeof form.image !== "string") {
        formData.append("image", form.image);
      }

      const config = { headers: {} };

      if (editId) {
        await axios.put(`/products/${editId}`, formData, config);
      } else {
        await axios.post("/products", formData, config);
      }

      handleClose();
      loadProducts();
    } catch (err: any) {
      console.error("Save failed", err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        alert("Session expired. Please log in again.");
      } else {
        alert("Failed to save product. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: Product) => {
    const id = row._id ?? row.id;
    if (!id) return;
    if (!confirm("Delete this product?")) return;
    try {
      await axios.delete(`/products/${id}`);
      loadProducts();
    } catch {
      alert("Error deleting product");
    }
  };

  const handleImageChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressedFile = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 800,
        useWebWorker: true,
      });
      const fixedFile = new File([compressedFile], file.name, {
        type: compressedFile.type,
        lastModified: Date.now(),
      });
      if (imageUrlRef.current) URL.revokeObjectURL(imageUrlRef.current);
      imageUrlRef.current = URL.createObjectURL(fixedFile);
      setForm((f) => ({ ...f, image: fixedFile }));
    } catch (err) {
      console.error("Image compression failed", err);
    }
  };

  const previewSrc =
    typeof form.image === "string"
      ? form.image
        ? normalizeImageSrc(form.image)
        : ""
      : imageUrlRef.current || "";

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => handleOpen()} disabled={saving}>
          <Plus className="mr-2 h-4 w-4" />
          Add product
        </Button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="px-4 py-3 font-medium">Product</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium text-right">Price</th>
              <th className="px-4 py-3 font-medium text-right">Stock</th>
              <th className="px-4 py-3 font-medium">Placement</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-12 text-center text-muted-foreground"
                >
                  No products yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const id = row._id ?? row.id ?? "";
                const hasImage = row.image && typeof row.image === "string";
                return (
                  <tr
                    key={id}
                    className="border-b border-border last:border-0 hover:bg-muted/50"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 flex-none items-center justify-center overflow-hidden rounded-md bg-brand-soft">
                          {hasImage ? (
                            <img
                              src={normalizeImageSrc(row.image as string)}
                              alt={row.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                        <span className="font-medium text-foreground">
                          {row.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {row.category}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      ${(row.price ?? 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {row.stock}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          row.featured
                            ? "rounded-full bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand"
                            : "text-xs text-muted-foreground"
                        }
                      >
                        {row.featured ? "Home · Featured" : "Products page"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Edit ${row.name}`}
                          onClick={() => handleOpen(row)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Delete ${row.name}`}
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(row)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Sheet open={open} onOpenChange={(o) => (o ? setOpen(true) : handleClose())}>
        <SheetContent
          side="right"
          className="w-full overflow-y-auto sm:max-w-md"
        >
          <SheetTitle>{editId ? "Edit product" : "Add product"}</SheetTitle>
          <form
            className="mt-6 space-y-4 px-1"
            onSubmit={(e) => {
              e.preventDefault();
              handleSave();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="p-name">Name</Label>
              <Input
                id="p-name"
                value={form.name || ""}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-desc">Description</Label>
              <Textarea
                id="p-desc"
                value={form.description || ""}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="p-price">Price</Label>
                <Input
                  id="p-price"
                  type="number"
                  step="0.01"
                  value={form.price ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, price: parseFloat(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="p-stock">Stock</Label>
                <Input
                  id="p-stock"
                  type="number"
                  value={form.stock ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, stock: parseInt(e.target.value, 10) })
                  }
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-cat">Category</Label>
              <Input
                id="p-cat"
                value={form.category || ""}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Image</Label>
              <label
                htmlFor="upload-image"
                className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
              >
                <ImageIcon className="h-4 w-4" />
                {form.image ? "Change image" : "Upload image"}
              </label>
              <input
                id="upload-image"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
              {previewSrc && (
                <img
                  src={previewSrc}
                  alt="Preview"
                  className="mt-2 max-h-48 w-full rounded-lg object-cover"
                />
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-ing">Ingredients</Label>
              <Textarea
                id="p-ing"
                value={form.ingredients || ""}
                onChange={(e) =>
                  setForm({ ...form, ingredients: e.target.value })
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-ben">Benefits</Label>
              <Textarea
                id="p-ben"
                value={form.benefits || ""}
                onChange={(e) => setForm({ ...form, benefits: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-how">How to use</Label>
              <Textarea
                id="p-how"
                value={form.howToUse || ""}
                onChange={(e) => setForm({ ...form, howToUse: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Placement</Label>
              <Select
                value={form.featured ? "true" : "false"}
                onValueChange={(v) =>
                  setForm({ ...form, featured: v === "true" })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="false">Products page</SelectItem>
                  <SelectItem value="true">Home · Featured</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : editId ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
